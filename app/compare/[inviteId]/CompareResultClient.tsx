"use client";

import { useState } from "react";
import CompareRespondForm, { type RespondedPerson } from "@/components/CompareRespondForm";
import CompareResult from "@/components/CompareResult";
import type { PersonSnapshot, CompareInvite } from "@/lib/compareInvite";
import { getRelationshipConfig } from "@/lib/coupleTypes";

interface Props {
  inviteId: string;
  personA: PersonSnapshot;
  personB?: CompareInvite["personB"];
  relType: CompareInvite["relType"];
}

export default function CompareResultClient({ inviteId, personA, personB: initialPersonB, relType }: Props) {
  const [personB, setPersonB] = useState<PersonSnapshot | undefined>(initialPersonB);

  if (personB) {
    // Entry-tracking for this couple already happens once, at invite-creation
    // time (HepanFlow.tsx's onSubmitInvite), and again here via CompareResult ->
    // HepanResultView's own two EntryTracker calls (method="hepan"). Firing a
    // third/fourth EntryTracker here with method="compare" would double-log
    // every completed invite into the sheet — see final-review-fix-report.md.
    return <CompareResult personA={personA} personB={personB} relType={relType} />;
  }

  return (
    <CompareRespondForm
      inviteId={inviteId}
      personALabel={personA.name || "朋友"}
      relConfig={getRelationshipConfig(relType)}
      onResponded={(p: RespondedPerson) => setPersonB(p)}
    />
  );
}
