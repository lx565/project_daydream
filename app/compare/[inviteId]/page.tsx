import type { Metadata } from "next";
import { getInvite } from "@/lib/compareInvite";
import CompareResultClient from "./CompareResultClient";

export const metadata: Metadata = {
  title: "雙人合盤邀請 — 命裡",
  robots: { index: false, follow: false },
};

interface PageParams { inviteId: string }

export default async function ComparePage({ params }: { params: Promise<PageParams> }) {
  const { inviteId } = await params;
  const invite = await getInvite(inviteId);

  if (!invite) {
    return (
      <main className="min-h-screen bg-parchment px-4 py-16">
        <div className="max-w-md mx-auto text-center space-y-3">
          <p className="text-lg font-bold text-ink">此連結已失效</p>
          <p className="text-sm text-ink-3">邀請連結可能已過期或不存在，請向對方索取新的邀請連結。</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-parchment px-4 py-10">
      <CompareResultClient inviteId={inviteId} personA={invite.personA} personB={invite.personB} relType={invite.relType} />
    </main>
  );
}
