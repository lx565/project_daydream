"use client";

import { useState } from "react";
import CompareRespondForm, { type RespondedPerson } from "@/components/CompareRespondForm";
import CompareResult from "@/components/CompareResult";
import EntryTracker from "@/components/EntryTracker";
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
    return (
      <>
        {/* Fires once each on mount (EntryTracker's own localStorage dedup key
            prevents re-logging on a later revisit of the same link) — mirrors
            HepanResultView's two EntryTracker calls, one per person, same
            method="hepan"-sibling convention but tagged "compare" so these
            entries are filterable apart from the direct-entry hepan flow. */}
        <EntryTracker date={personA.date} hour={personA.hour} gender={personA.gender} name={personA.name} method="compare" dedupeKey="compare_birth" relationshipType={relType} />
        <EntryTracker date={personB.date} hour={personB.hour} gender={personB.gender} name={personB.name} method="compare" dedupeKey="compare_birth" relationshipType={relType} />
        <CompareResult personA={personA} personB={personB} relType={relType} />
      </>
    );
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
