"use client";

import React, { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { cleanMd } from "@/lib/cleanMd";
import { MD_REMARK, MD_REHYPE } from "@/lib/mdConfig";
import { stripModern } from "@/lib/modernBlocks";
import type { ReadingEmailData } from "@/lib/emailTemplate";

const SECTION_MD = "text-[13px] leading-relaxed text-gray-700 [&_h2]:text-red-800 [&_h2]:font-bold [&_h2]:text-[13px] [&_h2]:mt-4 [&_h2]:mb-1.5 [&_h3]:text-amber-800 [&_h3]:font-semibold [&_h3]:text-[12px] [&_h3]:mt-3 [&_h3]:mb-1 [&_p]:mb-2 [&_strong]:text-gray-900 [&_ul]:my-1.5 [&_li]:pl-3 [&_li]:relative [&_li]:before:content-['·'] [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:text-red-600";

function ReportSection({ title, text }: { title: string; text: string }) {
  const clean = cleanMd(stripModern(text));
  if (!clean) return null;
  return (
    <div className="mt-5 pt-4 border-t border-red-100">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-4 rounded-full bg-red-700" />
        <span className="text-[13px] font-bold text-red-800 tracking-widest">{title}</span>
      </div>
      <div className={SECTION_MD}>
        <ReactMarkdown remarkPlugins={MD_REMARK} rehypePlugins={MD_REHYPE}>{clean}</ReactMarkdown>
      </div>
    </div>
  );
}

interface ExportReportProps {
  data: ReadingEmailData;
}

export default function ExportReport({ data }: ExportReportProps) {
  const [open, setOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const { readings } = data;
  const hasContent = !!(readings.synthesis || readings.overview || readings.bazi);

  async function handleDownload() {
    if (!reportRef.current || capturing) return;
    setCapturing(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const el = reportRef.current;
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#faf7f2",
        logging: false,
        width: el.offsetWidth,
        height: el.scrollHeight,
        windowHeight: el.scrollHeight,
        scrollY: 0,
        scrollX: 0,
      });
      const link = document.createElement("a");
      const today = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, "");
      link.download = `命裡-${data.name || "命盤"}-${today}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setCapturing(false);
    }
  }

  const ReportCard = ({ forCapture = false }: { forCapture?: boolean }) => (
    <div
      ref={forCapture ? reportRef : undefined}
      className="bg-[#faf7f2] font-serif"
      style={{ width: forCapture ? 390 : "100%", minWidth: forCapture ? 390 : undefined }}
    >
      {/* Header */}
      <div className="bg-red-700 px-5 py-4">
        <div className="text-white text-2xl font-bold tracking-[0.35em]">命裡</div>
        <div className="text-red-200 text-[10px] tracking-[0.2em] mt-0.5">mingli.study</div>
      </div>

      {/* Identity */}
      <div className="mx-4 mt-4 p-3 rounded-lg bg-red-50/60 border border-red-100">
        <div className="text-base font-bold text-gray-900 mb-1.5">
          {data.name ? `${data.name} · ` : ""}命盤
        </div>
        <div className="text-[12px] text-gray-600 leading-relaxed">{data.birthSummary}</div>
        {data.chartSummary && (
          <div className="text-[11px] text-gray-500 mt-1">{data.chartSummary}</div>
        )}
      </div>

      {/* Reading sections — same order as emailTemplate */}
      <div className="px-4 pb-4">
        {readings.synthesis  && <ReportSection title="綜合解讀"          text={readings.synthesis} />}
        {readings.overview   && <ReportSection title="紫微綜合"          text={readings.overview} />}
        {readings.palaces    && <ReportSection title="十二宮位"          text={readings.palaces} />}
        {readings.decades    && <ReportSection title="大運流年"          text={readings.decades} />}
        {readings.bazi       && <ReportSection title="八字綜合"          text={readings.bazi} />}
        {readings.baziDeep   && <ReportSection title="八字命理 · 深度詳批" text={readings.baziDeep} />}
        {readings.baziSchools && <ReportSection title="八字各派視角"     text={readings.baziSchools} />}
        {readings.cautions   && <ReportSection title="特別注意"          text={readings.cautions} />}
      </div>

      {/* Footer */}
      <div className="mx-4 mb-4 pt-4 border-t border-red-100 text-center">
        <div className="text-[10px] text-gray-400 leading-relaxed">
          命裡 · mingli.study<br />
          僅供學習參考與娛樂，請理性看待，切勿迷信<br />
          {new Date().toLocaleDateString("zh-CN")}
        </div>
      </div>
    </div>
  );

  if (!hasContent) return null;

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-border-warm bg-paper-2 hover:bg-paper text-sm text-ink-2 hover:text-ink transition-all"
      >
        <span className="text-base leading-none">↓</span>
        <span>匯出完整解讀報告（長圖）</span>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/60" onClick={() => setOpen(false)}>
          <div
            className="relative flex flex-col bg-parchment rounded-t-2xl mt-auto max-h-[90vh] w-full max-w-md mx-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-warm flex-shrink-0">
              <div>
                <p className="text-sm font-bold text-ink">命理報告預覽</p>
                <p className="text-[11px] text-ink-4 mt-0.5">匯出為長圖，可儲存至相簿或分享</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-ink-4 hover:text-ink text-lg leading-none p-1">✕</button>
            </div>

            {/* Scrollable preview */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              <div className="rounded-xl overflow-hidden border border-border-warm shadow-sm">
                <ReportCard />
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 pb-6 pt-4 border-t border-border-warm flex-shrink-0">
              <button
                onClick={handleDownload}
                disabled={capturing}
                className="w-full py-3 rounded-xl bg-vermillion text-white text-sm font-semibold tracking-wide hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {capturing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    正在生成長圖…
                  </>
                ) : (
                  "下載長圖"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden capture target (full-height, off-screen) */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: "-9999px",
          zIndex: -1,
          width: 390,
          pointerEvents: "none",
        }}
      >
        <ReportCard forCapture />
      </div>
    </>
  );
}
