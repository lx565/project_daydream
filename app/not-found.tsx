import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="paper-card rounded-2xl border border-border-warm p-8 text-center max-w-md space-y-4">
        <p className="text-3xl">🔮</p>
        <h1 className="text-lg font-bold text-ink">此頁無緣</h1>
        <p className="text-sm text-ink-3 leading-relaxed">
          你尋找的頁面不存在，或已遷移。不妨從首頁重新開始你的命理之旅。
        </p>
        <div className="pt-1">
          <Link
            href="/"
            className="inline-block rounded-full border border-gold/40 bg-gold-l px-5 py-2 text-sm font-medium text-gold hover:border-gold transition-colors"
          >
            返回首頁
          </Link>
        </div>
      </div>
    </main>
  );
}
