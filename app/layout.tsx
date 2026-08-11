import type { Metadata, Viewport } from "next";
import { Noto_Serif_SC } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import "./globals.css";
import XhsTracker from "@/components/XhsTracker";
import StarField from "@/components/StarField";
import JsonLd from "@/components/JsonLd";
import { websiteSchema, organizationSchema } from "@/lib/jsonld";

const GA_ID = "G-RNR3P73EBR";

const notoSerif = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-serif",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.mingli.study"),
  title: "命裡 · 紫微斗數 + 八字 AI命理解讀",
  description: "命裡 · 紫微斗數與八字雙系統線上排盤，多模型AI即時推演，自動交叉驗證。依據121部命理典籍深度解讀命格、大限、感情與事業。",
  // Bing Webmaster verification — replace the token with the real one from
  // bing.com/webmasters (Add site → verify via meta tag) for verification to pass.
  verification: { other: { "msvalidate.01": "REPLACE_WITH_BING_WEBMASTER_TOKEN" } },
  openGraph: {
    siteName: "命裡",
    locale: "zh_TW",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "命裡 · 紫微斗數 + 八字 AI命理" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh" className={notoSerif.variable}>
      <body className="min-h-screen font-serif antialiased flex flex-col" style={{ background: "#F5F0E6", color: "#2C1A10" }}>
        <JsonLd data={[websiteSchema(), organizationSchema()]} />
        <StarField />
        <div className="relative z-10 flex-1">{children}</div>
        <footer className="relative z-10 border-t border-black/10 bg-parchment px-4 py-6 text-center space-y-2">
          <p className="text-[11px] text-ink-4 leading-relaxed max-w-2xl mx-auto">
            本平臺內容僅供學習、研究與娛樂參考，不構成任何專業建議或決策依據。
            知識庫內容依據美國版權法 Fair Use 原則（17 U.S.C. § 107）用於非商業性教育研究用途。
            如您是相關著作權人並認為本平臺侵害了您的權益，請傳送書面通知至{" "}
            <a href="mailto:contact@mingli.study" className="underline hover:text-vermillion">
              contact@mingli.study
            </a>
            ，我們將在收到通知後 72 小時內予以處理。
          </p>
          <p className="text-[11px] text-ink-4">
            © 2025 命裡 &nbsp;·&nbsp; 傳統文化學習工具 &nbsp;·&nbsp; 命理為文化遺產，請理性看待
          </p>
          <p className="text-[11px] text-ink-4 flex flex-wrap gap-x-4 gap-y-1 justify-center">
            <a href="/guide" className="underline hover:text-vermillion">學習指南</a>
            <a href="/mingge" className="underline hover:text-vermillion">格局大全</a>
            <a href="/terms" className="underline hover:text-vermillion">免責宣告</a>
          </p>
        </footer>
        <XhsTracker />
        <Analytics />
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
        <Script id="ga4-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}</Script>
      </body>
    </html>
  );
}
