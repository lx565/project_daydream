import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "免責宣告與使用條款 · 命裡",
  description: "命裡平臺的免責宣告與使用條款：內容僅供學習、研究與娛樂參考，不構成任何專業建議或決策依據。",
  alternates: { canonical: "https://www.mingli.study/terms" },
};

const UPDATED = "2026年6月17日";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 bg-vermillion rounded-full" />
        <h2 className="text-base font-bold text-ink tracking-wide">{title}</h2>
      </div>
      <div className="text-sm text-ink-2 leading-relaxed space-y-2.5 pl-3">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-parchment px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-7">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-vermillion transition-colors"
        >
          ← 返回首頁
        </Link>

        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-ink tracking-wide">免責宣告與使用條款</h1>
          <p className="text-xs text-ink-4">最後更新：{UPDATED}</p>
        </div>

        <p className="text-sm text-ink-2 leading-relaxed">
          歡迎使用「命裡」（以下簡稱"本平臺"）。在使用本平臺提供的排盤、解讀、問答及相關服務前，
          請仔細閱讀以下條款。一旦您訪問或使用本平臺，即視為您已閱讀、理解並同意接受本宣告的全部內容。
        </p>

        <Section title="一、娛樂與文化研究性質">
          <p>
            本平臺所提供的紫微斗數排盤、八字、AI 解讀、問答及一切相關內容，
            <span className="font-semibold text-ink">僅供文化學習、研究與娛樂參考之用</span>，
            屬於對中國傳統命理文化的整理與呈現，不具有任何科學預測效力。
          </p>
          <p>
            命理是傳統文化的組成部分，請以理性、平和的心態看待，切勿迷信，切勿將其作為人生重大決策的依據。
          </p>
        </Section>

        <Section title="二、不構成專業建議">
          <p>
            本平臺的任何內容
            <span className="font-semibold text-ink">均不構成、也不應被理解為</span>
            醫療、健康、心理、財務、投資、法律、婚姻或任何其他領域的專業建議。
          </p>
          <p>
            涉及健康、疾病、心理狀態、財務投資、法律糾紛、婚姻家庭等重要事項時，
            請務必諮詢具備相應資質的持牌專業人士。
            請勿因本平臺的任何內容而採取或放棄就醫、用藥、投資、法律或其他專業行動。
          </p>
        </Section>

        <Section title="三、內容由 AI 生成，不保證準確性">
          <p>
            本平臺的解讀由人工智慧模型結合命理典籍資料自動生成，可能包含不準確、不完整、過時或前後不一致之處。
            本平臺
            <span className="font-semibold text-ink">不對任何內容的準確性、完整性、可靠性或適用性作出任何明示或暗示的保證。</span>
          </p>
          <p>
            不同流派對同一命盤可能有不同解讀，平臺呈現的是多維度參考視角，並非唯一或權威結論。
          </p>
        </Section>

        <Section title="四、責任限制">
          <p>
            您理解並同意，使用本平臺的一切風險由您自行承擔。
            在適用法律允許的最大範圍內，本平臺及其運營方
            <span className="font-semibold text-ink">
              對您因使用或無法使用本平臺、或因依賴任何內容而作出的決定所導致的任何直接、間接、偶然、
              特殊或後果性的損失或損害，均不承擔任何責任。
            </span>
          </p>
          <p>
            您因閱讀、相信或依據本平臺內容而採取的任何行動及其後果，完全由您本人負責。
          </p>
        </Section>

        <Section title="五、自願支援（打賞）說明">
          <p>
            本平臺核心功能始終免費。頁面中的"打賞 / 支援"為
            <span className="font-semibold text-ink">使用者完全自願的贈與</span>，
            旨在幫助平臺覆蓋 AI 算力成本與日常維護，
            <span className="font-semibold text-ink">並非購買任何商品或服務的對價</span>。
            自願支援不構成任何合同關係，亦不產生任何額外的服務承諾、準確性保證或退款義務。
          </p>
        </Section>

        <Section title="六、知識庫與著作權">
          <p>
            本平臺知識庫內容依據美國版權法合理使用原則（Fair Use，17 U.S.C. § 107）
            用於非商業性的教育與研究用途。如您是相關著作權人並認為本平臺侵害了您的權益，
            請傳送書面通知至下方郵箱，我們將在收到通知後 72 小時內予以處理。
          </p>
        </Section>

        <Section title="七、年齡限制">
          <p>本平臺面向成年人。如您未滿 18 週歲，請在監護人指導下使用。</p>
        </Section>

        <Section title="八、條款變更">
          <p>
            本平臺保留隨時修訂本宣告的權利。修訂後的條款一經在本頁面公佈即生效。
            建議您定期查閱本頁面以瞭解最新內容。
          </p>
        </Section>

        <Section title="九、資料與隱私">
          <p>
            為提供解讀服務並做匿名的產品分析（如年齡、性別分佈與使用量統計），
            本平臺會記錄您提交的出生資料（出生日期、時辰、性別及可選的稱呼）。
            這些資料僅用於內部分析與改進服務，不會公開展示或出售給第三方。
          </p>
        </Section>

        <Section title="十、聯絡我們">
          <p>
            如對本宣告有任何疑問，或需提交著作權相關通知，請聯絡：{" "}
            <a href="mailto:contact@mingli.study" className="underline text-vermillion hover:text-vermillion-h">
              contact@mingli.study
            </a>
          </p>
        </Section>

        <p className="text-center text-[11px] text-ink-4 leading-relaxed pt-2 pb-4">
          命理是傳統文化的智慧結晶，請理性看待，切勿迷信
        </p>
      </div>
    </main>
  );
}
