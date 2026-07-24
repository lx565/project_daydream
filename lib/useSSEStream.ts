"use client";

import { useCallback, useRef, useState } from "react";
import type { Reference } from "./rag";

export type StreamStatus = "idle" | "streaming" | "done" | "error";
export type ValidationStatus = "idle" | "checking" | "pass" | "fail" | "reprocessing";

export interface StreamResult {
  status: StreamStatus;
  text: string;
  refs: Reference[];
  errorMsg: string;
  validation: ValidationStatus;
  validationIssues: string[];
  start: (body: object) => Promise<void>;
  reset: () => void;
  rerun: () => void;
}

export interface StreamOpts {
  /** Run a cross-model (Gemini) validation pass after the reading completes. */
  validate?: boolean;
}

// v16: 2026-06-30 couple v2 — relationship-aware reading + preview/full split.
const CACHE_PREFIX = "ziwei_rd_v17_";

type CacheShape = { text: string; refs: Reference[]; validated?: boolean };

function loadCache(key: string): CacheShape | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.text === "string" && Array.isArray(parsed.refs)) return parsed;
    return null;
  } catch { return null; }
}

function saveCache(key: string, data: CacheShape) {
  try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data)); } catch {}
}

function deleteCache(key: string) {
  try { localStorage.removeItem(CACHE_PREFIX + key); } catch {}
}

export function useSSEStream(url: string, cacheKey?: string, opts?: StreamOpts): StreamResult {
  const cached = cacheKey ? loadCache(cacheKey) : null;

  const [status, setStatus] = useState<StreamStatus>(cached ? "done" : "idle");
  const [text, setText] = useState(cached?.text ?? "");
  const [refs, setRefs] = useState<Reference[]>(cached?.refs ?? []);
  const [errorMsg, setErrorMsg] = useState("");
  const [validation, setValidation] = useState<ValidationStatus>(cached?.validated ? "pass" : "idle");
  const [validationIssues, setValidationIssues] = useState<string[]>([]);

  const abortRef = useRef<AbortController | null>(null);
  const lastBodyRef = useRef<object | null>(null);
  const accText = useRef("");
  const accRefs = useRef<Reference[]>([]);
  const retriedRef = useRef(0);
  // ref indirection so the post-stream validator can re-invoke start() (retry) without a circular dep
  const startRef = useRef<(body: object) => Promise<void>>(async () => {});

  // Cross-model validation after a reading completes.
  const runValidation = useCallback(async (reading: string, body: object) => {
    const ziwei = (body as { ziwei?: unknown }).ziwei;
    if (!opts?.validate || !ziwei || reading.length < 60) return;
    setValidation("checking");
    setValidationIssues([]);
    try {
      const res = await fetch("/api/reading/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reading, ziwei }),
      });
      const v = (await res.json()) as { pass?: boolean; issues?: string[] };
      if (v.pass !== false) {
        setValidation("pass");
        if (cacheKey) saveCache(cacheKey, { text: accText.current, refs: accRefs.current, validated: true });
      } else if (retriedRef.current < 1) {
        // Failed review → tell the user it's being reprocessed, regenerate with the notes.
        retriedRef.current += 1;
        setValidation("reprocessing");
        setValidationIssues(v.issues ?? []);
        if (cacheKey) deleteCache(cacheKey);
        await startRef.current({ ...body, revisionNotes: v.issues ?? [] });
      } else {
        // Still flagged after one retry — surface softly, keep the reading.
        setValidation("fail");
        setValidationIssues(v.issues ?? []);
      }
    } catch {
      setValidation("idle"); // validator unreachable → no badge, never block the reading
    }
  }, [opts?.validate, cacheKey]);

  const start = useCallback(
    async (body: object) => {
      lastBodyRef.current = body;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      accText.current = "";
      accRefs.current = [];
      setStatus("streaming");
      setText("");
      setRefs([]);
      setErrorMsg("");
      // Only reset validation on a fresh (non-retry) run.
      if (retriedRef.current === 0) { setValidation("idle"); setValidationIssues([]); }

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.message ?? data?.error ?? `HTTP ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";

        function processLine(line: string) {
          if (!line.startsWith("data:")) return;
          const raw = line.slice(5).trim();
          if (raw === "[DONE]") return;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.error) throw new Error(parsed.error);
            if (typeof parsed.text === "string") {
              accText.current += parsed.text;
              setText((prev) => prev + parsed.text);
            }
            if (Array.isArray(parsed.refs)) {
              accRefs.current = parsed.refs;
              setRefs(parsed.refs);
            }
          } catch (e) {
            if (e instanceof SyntaxError) return;
            throw e;
          }
        }

        while (true) {
          const { done, value } = await reader.read();
          if (value) buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split("\n");
          buffer = done ? "" : (lines.pop() ?? "");
          for (const line of lines) processLine(line);
          if (done) {
            if (buffer.trim()) processLine(buffer);
            break;
          }
        }

        if (cacheKey) saveCache(cacheKey, { text: accText.current, refs: accRefs.current });
        setStatus("done");
        // Kick off cross-model validation (non-blocking for the reading display).
        void runValidation(accText.current, body);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setErrorMsg((err as Error).message ?? "未知错误");
        setStatus("error");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [url, cacheKey, runValidation]
  );
  startRef.current = start;

  const reset = useCallback(() => {
    abortRef.current?.abort();
    if (cacheKey) deleteCache(cacheKey);
    retriedRef.current = 0;
    setStatus("idle");
    setText("");
    setRefs([]);
    setErrorMsg("");
    setValidation("idle");
    setValidationIssues([]);
  }, [cacheKey]);

  const rerun = useCallback(() => {
    if (cacheKey) deleteCache(cacheKey);
    retriedRef.current = 0;
    if (lastBodyRef.current) start(lastBodyRef.current);
  }, [cacheKey, start]);

  return { status, text, refs, errorMsg, validation, validationIssues, start, reset, rerun };
}
