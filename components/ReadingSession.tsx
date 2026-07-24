"use client";

import { useCallback, useState } from "react";
import WizardFlow from "./WizardFlow";
import ReadingExport from "./ReadingExport";
import type { ZiweiResult } from "@/lib/ziwei";
import type { BaziResult } from "@/lib/bazi";
import type { ReadingEmailData } from "@/lib/emailTemplate";
import { usePaywall } from "@/lib/usePaywall";

interface Props {
  ziwei: ZiweiResult;
  bazi: BaziResult;
  gender: string;
  birthYear: number;
  sessionId?: string;
  name?: string;
  dateLabel?: string;
  timeLabel?: string;
}

export default function ReadingSession(props: Props) {
  const [exportData, setExportData] = useState<ReadingEmailData | null>(null);
  const { enabled, unlocked } = usePaywall(props.sessionId);
  // Show export only when paywall is disabled (free mode) OR user has paid
  const exportAllowed = !enabled || unlocked;

  const handleExportReady = useCallback((data: ReadingEmailData) => {
    setExportData(data);
  }, []);

  return (
    <>
      {/* Immediate acknowledgment right after unlock, before the full reading has
          finished streaming (ReadingExport below needs allContentReady, which can
          take a while) — makes the save/email option discoverable instead of only
          surfacing once a user happens to scroll past the entire tab interface. */}
      {enabled && unlocked && !exportData && (
        <div className="mb-4 px-4 py-2.5 rounded-xl bg-jade-l border border-jade/30 text-xs text-jade flex items-center gap-2">
          <span>✓</span>
          <span>已解鎖完整命書 — 內容生成完成後，可在頁面底部永久保存或寄送到郵箱</span>
        </div>
      )}

      <WizardFlow
        ziwei={props.ziwei}
        bazi={props.bazi}
        gender={props.gender}
        birthYear={props.birthYear}
        sessionId={props.sessionId}
        name={props.name}
        dateLabel={props.dateLabel}
        timeLabel={props.timeLabel}
        onExportReady={handleExportReady}
      />

      {/* Share & export — only for paid users (or when paywall is off) */}
      {exportData && exportAllowed && <ReadingExport data={exportData} />}
    </>
  );
}
