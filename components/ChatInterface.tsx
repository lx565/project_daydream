"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import { gtagEvent } from "@/lib/gtag";
import ReactMarkdown from "react-markdown";
import { MD_REMARK, MD_REHYPE } from "@/lib/mdConfig";
import { useSSEStream } from "@/lib/useSSEStream";
import { cleanMd } from "@/lib/cleanMd";
import { startCardCheckout } from "@/lib/checkout";
import { usePaywall } from "@/lib/usePaywall";
import type { ZiweiResult } from "@/lib/ziwei";

interface Message { role: "user" | "assistant"; content: string; }

function ChatMd({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={MD_REMARK}
      rehypePlugins={MD_REHYPE}
      components={{
        p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-gold">{children}</strong>,
        ul: ({ children }) => <ul className="my-1 space-y-1 list-disc pl-4">{children}</ul>,
        li: ({ children }) => <li>{children}</li>,
      }}
    >
      {cleanMd(children)}
    </ReactMarkdown>
  );
}

// FAQ chip questions — map each topic to a natural Chinese question
const FAQ_QUESTIONS = [
  { icon: "財", label: "財運", q: "我的財運和財富積累方向如何？" },
  { icon: "情", label: "感情", q: "我的感情婚姻命盤怎麼說？" },
  { icon: "業", label: "事業", q: "事業職場上我有哪些優勢和挑戰？" },
  { icon: "康", label: "健康", q: "健康方面我需要注意什麼？" },
  { icon: "運", label: "大運", q: "我當前大運走勢和機遇是什麼？" },
  { icon: "年", label: "流年", q: "我今年的流年運勢如何？" },
];

const MAX_QUESTIONS = 3;

export default function ChatInterface({
  ziwei,
  partnerZiwei,
  initialContext,
  placeholder,
  backgroundReadings,
  chartId,
  name,
  maxQuestions,
}: {
  ziwei: ZiweiResult;
  partnerZiwei?: ZiweiResult;
  initialContext: string;
  placeholder?: string;
  backgroundReadings?: Record<string, string>;
  chartId?: string;
  name?: string;
  maxQuestions?: number;
}) {
  const limit = maxQuestions ?? MAX_QUESTIONS;
  const hasBackground = backgroundReadings && Object.keys(backgroundReadings).length > 0;

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: initialContext || `你好！我已瞭解你的命盤（${ziwei.summary}），有什麼想聊的？`,
    },
  ]);
  const [input, setInput] = useState("");
  const [remaining, setRemaining] = useState(limit);
  const [faqUsed, setFaqUsed] = useState<Set<string>>(new Set());
  const [showAllFaq, setShowAllFaq] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { status, text, errorMsg, start } = useSSEStream("/api/chat");
  // Only push a paid upgrade when the paywall is actually on and this chart
  // isn't already unlocked — otherwise the limit turns into a warm hand-off to
  // the (free) deep-reading tabs instead of a sales pitch.
  const { enabled: paywallOn, unlocked } = usePaywall(chartId);
  const showUpsell = paywallOn && !unlocked;

  useEffect(() => {
    if (status === "done" && text) {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.content === "") {
          return [...prev.slice(0, -1), { role: "assistant", content: text }];
        }
        return prev;
      });
    }
  }, [status, text]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, text]);

  async function send(question?: string) {
    const trimmed = (question ?? input).trim();
    if (!trimmed || status === "streaming" || remaining <= 0) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMsg];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setInput("");
    setRemaining((r) => r - 1);
    track("ai_question_asked");
    gtagEvent("chat_question_sent");

    await start({
      ziwei: {
        summary: ziwei.summary,
        soulPalace: ziwei.soulPalace,
        bodyPalace: ziwei.bodyPalace,
        fiveElementsClass: ziwei.fiveElementsClass,
        mainStar: ziwei.mainStar,
        bodyStar: ziwei.bodyStar,
        birth: ziwei.birth,
      },
      partnerZiwei: partnerZiwei
        ? {
            summary: partnerZiwei.summary,
            soulPalace: partnerZiwei.soulPalace,
            bodyPalace: partnerZiwei.bodyPalace,
            fiveElementsClass: partnerZiwei.fiveElementsClass,
            mainStar: partnerZiwei.mainStar,
            bodyStar: partnerZiwei.bodyStar,
          }
        : undefined,
      messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
      remainingQuestions: remaining - 1,
      backgroundReadings: hasBackground ? backgroundReadings : undefined,
      name: name ?? undefined,
    });
  }

  function handleFaq(faq: typeof FAQ_QUESTIONS[number]) {
    setFaqUsed((prev) => new Set([...prev, faq.q]));
    send(faq.q);
  }

  const isStreaming = status === "streaming";
  const hasStartedConversation = messages.length > 1;
  const visibleFaqs = showAllFaq ? FAQ_QUESTIONS : FAQ_QUESTIONS.slice(0, 3);

  return (
    <div className="space-y-3">
      {/* Background context badge — shows once readings are loaded */}
      {hasBackground && !hasStartedConversation && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-jade-l/50 border border-jade/20">
          <div className="w-1.5 h-1.5 rounded-full bg-jade flex-shrink-0" />
          <p className="text-[11px] text-jade/80">
            已讀取你的命盤全析（{Object.keys(backgroundReadings!).length} 個維度），問任何問題都基於完整分析作答
          </p>
        </div>
      )}

      {/* FAQ chips — shown before first question, hidden once chat starts */}
      {!hasStartedConversation && remaining > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] text-ink-4 tracking-widest">常見追問 · 點選直接提問</p>
          <div className="flex flex-wrap gap-2">
            {visibleFaqs
              .filter((f) => !faqUsed.has(f.q))
              .map((faq) => (
                <button
                  key={faq.q}
                  onClick={() => handleFaq(faq)}
                  disabled={isStreaming}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border-warm bg-paper hover:border-gold/50 hover:bg-gold-l/30 text-xs text-ink-2 hover:text-gold transition-all disabled:opacity-50"
                >
                  <span className="font-bold text-vermillion/70 text-[10px]">{faq.icon}</span>
                  {faq.label}
                </button>
              ))}
            {!showAllFaq && (
              <button
                onClick={() => setShowAllFaq(true)}
                className="px-3 py-1.5 rounded-full border border-dashed border-border-warm text-[11px] text-ink-4 hover:text-ink-3 transition-colors"
              >
                更多 ▾
              </button>
            )}
          </div>
        </div>
      )}

      {/* Message thread */}
      <div className="space-y-3 max-h-[420px] overflow-y-auto scroll-styled pr-1">
        {messages.map((msg, i) => {
          const isLast = i === messages.length - 1;
          const showStream =
            isLast && msg.role === "assistant" && msg.content === "" && isStreaming;

          return (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-full bg-vermillion-l border border-vermillion/30 flex items-center justify-center text-xs text-vermillion font-bold mr-2 flex-shrink-0 mt-0.5">
                  命
                </div>
              )}
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-vermillion text-paper font-medium rounded-br-sm"
                    : "bg-paper-2 border border-border-warm text-ink-2 rounded-bl-sm"
                }`}
              >
                {showStream ? (
                  <span className="text-ink-4 animate-pulse">思考中…</span>
                ) : msg.role === "assistant" ? (
                  <>
                    <ChatMd>
                      {isLast && isStreaming ? text || msg.content : msg.content}
                    </ChatMd>
                    {isLast && isStreaming && (
                      <span className="inline-block w-0.5 h-3.5 bg-ink-3 ml-0.5 align-middle animate-blink" />
                    )}
                  </>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          );
        })}
        {errorMsg && (
          <p className="text-xs text-vermillion text-center">{errorMsg}</p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {remaining <= 0 ? (
        <div className="rounded-xl border border-gold/30 bg-gold-l/20 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-sm flex-shrink-0">
              命
            </div>
            <div>
              <p className="text-sm font-medium text-ink">{limit} 次追問已用完</p>
              <p className="text-xs text-ink-3 mt-0.5 leading-relaxed">
                {showUpsell
                  ? "命盤還有更深的層次沒開啟。解鎖後即可檢視 大運 · 八字 · 眾說 · 注意 四大深度板塊，把每個問題都講透。"
                  : "更完整的答案已經為你備好——大運 · 八字 · 眾說 · 注意 各板塊都有針對你命盤的深度解讀。"}
              </p>
            </div>
          </div>
          {showUpsell ? (
            <>
              <button
                onClick={() => { if (chartId) startCardCheckout(chartId); }}
                disabled={!chartId}
                className="block w-full text-center py-2.5 rounded-xl bg-vermillion text-paper text-sm font-semibold hover:bg-vermillion-h transition-colors disabled:opacity-40"
              >
                解鎖完整分析
              </button>
              <p className="text-center text-[10px] text-ink-4">一次付費，永久檢視，不限追問</p>
            </>
          ) : (
            <p className="text-center text-[11px] text-ink-4 leading-relaxed">
              點上方各板塊，即可繼續深入你的命盤
            </p>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder={placeholder ?? `有什麼想聊的？（還可問 ${remaining} 次）`}
            disabled={isStreaming}
            className="flex-1 px-4 py-2.5 rounded-xl bg-parchment border border-border-warm text-sm text-ink placeholder-ink-4 focus:outline-none focus:border-vermillion/40 focus:ring-1 focus:ring-vermillion/15 disabled:opacity-50 transition-all"
          />
          <button
            onClick={() => send()}
            disabled={isStreaming || !input.trim()}
            className="px-4 py-2.5 rounded-xl bg-vermillion text-paper text-sm font-semibold hover:bg-vermillion-h disabled:opacity-40 transition-colors"
          >
            傳送
          </button>
        </div>
      )}
    </div>
  );
}
