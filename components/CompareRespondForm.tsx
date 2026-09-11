"use client";

import { useState } from "react";
import { BirthdayWheel } from "./WheelPicker";
import type { RelationshipConfig } from "@/lib/coupleTypes";

interface PersonBFields {
  name: string;
  date: string;
  hour: string;
  gender: "male" | "female" | "";
}

export interface RespondedPerson {
  date: string;
  hour: number;
  gender: "male" | "female";
  name?: string;
}

interface Props {
  inviteId: string;
  personALabel: string; // Person A's name, or a generic fallback, for "OO 想看你們的緣分"
  relConfig: RelationshipConfig;
  onResponded: (personB: RespondedPerson) => void;
}

export default function CompareRespondForm({ inviteId, personALabel, relConfig, onResponded }: Props) {
  const [person, setPerson] = useState<PersonBFields>({ name: "", date: "", hour: "", gender: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  const ready = !!person.date && !!person.gender && person.hour !== "";

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!person.date) e.date = "請填寫出生日期";
    if (!person.gender) e.gender = "請選擇性別";
    if (!person.hour && person.hour !== "0") e.hour = "請選擇出生時辰";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || submitting) return;
    setSubmitting(true);
    setSubmitError(false);
    try {
      const hour = parseInt(person.hour, 10);
      const gender = person.gender as "male" | "female";
      const res = await fetch(`/api/compare/${inviteId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: person.date, hour, gender, name: person.name || undefined }),
      });
      if (!res.ok) throw new Error("respond_failed");
      onResponded({ date: person.date, hour, gender, name: person.name || undefined });
    } catch {
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  }

  const labelClass = "block text-xs text-ink-3 tracking-widest uppercase mb-1.5";

  return (
    <div className="max-w-md mx-auto space-y-6">
      <header className="text-center space-y-2">
        <p className="text-xs text-vermillion tracking-[0.3em] uppercase">紫微斗數 · 雙人合盤邀請</p>
        <h1 className="text-xl font-bold text-ink tracking-wide">
          {personALabel} 想看你們的{relConfig.shareLabel}
        </h1>
        <p className="text-sm text-ink-3">
          填寫你的出生資訊，立即檢視你們的 {relConfig.emoji} {relConfig.label} 合盤——完全免費。
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="border border-border-warm rounded-xl p-4 bg-paper space-y-4">
          <div>
            <label className={labelClass}>稱呼（可選）</label>
            <input
              value={person.name}
              onChange={(e) => setPerson((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="如：小美"
              className="w-full bg-parchment border border-border-warm rounded-lg px-4 py-2.5 text-ink placeholder-ink-4 focus:outline-none focus:border-vermillion/50 focus:ring-1 focus:ring-vermillion/20 transition-all text-sm"
            />
          </div>

          <div>
            <label className={labelClass}>出生日期 · 時辰 <span className="text-vermillion">*</span></label>
            <BirthdayWheel
              date={person.date}
              hour={person.hour}
              onDateChange={(d) => setPerson((prev) => ({ ...prev, date: d }))}
              onHourChange={(h) => setPerson((prev) => ({ ...prev, hour: h }))}
            />
            {(errors.date || errors.hour) && (
              <p className="text-xs text-vermillion mt-1">{errors.date || errors.hour}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>性別 <span className="text-vermillion">*</span></label>
            <div className="flex gap-3">
              {(["male", "female"] as const).map((g) => (
                <button key={g} type="button"
                  onClick={() => setPerson((prev) => ({ ...prev, gender: g }))}
                  style={person.gender === g ? { background: "#8B1A1A", color: "#FDFCF8", borderColor: "#8B1A1A" } : {}}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all duration-200 ${
                    person.gender === g ? "shadow-md" : "bg-parchment border-border-warm text-ink-2 hover:border-vermillion/60"
                  }`}>
                  {person.gender === g ? "✓ " : ""}{g === "male" ? "男命" : "女命"}
                </button>
              ))}
            </div>
            {errors.gender && <p className="text-xs text-vermillion mt-1">{errors.gender}</p>}
          </div>
        </div>

        {submitError && (
          <p className="text-sm text-vermillion text-center">送出失敗，請重試一次。</p>
        )}

        <button type="submit" disabled={submitting} style={{ color: "#FDFCF8" }}
          className={`w-full font-bold py-3.5 rounded-xl transition-all tracking-widest text-sm ${
            ready && !submitting
              ? "bg-vermillion hover:bg-vermillion-h active:scale-[0.99] shadow-lg ring-2 ring-vermillion/20 ring-offset-1"
              : "bg-vermillion/60 cursor-pointer opacity-80"
          }`}>
          {submitting ? "正在排盤…" : ready ? "檢視合盤 →" : "請填寫出生資訊"}
        </button>

        <p className="text-center text-[11px] text-ink-4">
          出生時間預設按北京時間（UTC+8）排盤 · 資訊僅用於本次推算，不會用於其他用途
        </p>
      </form>
    </div>
  );
}
