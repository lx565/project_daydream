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
