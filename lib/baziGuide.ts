import type { RagQuery } from "@/lib/rag";

// 八字基礎 guide — the foundational learning path for 子平八字, from 五行 up to
// 神煞. These are concept explainers (not 十神/天干/格局 reference pages).
export interface BaziGuideEntry {
  name: string;        // 概念名，如「五行生剋」
  urlSlug: string;     // pinyin slug
  step: number;        // suggested learning order
  title: string;
  subtitle: string;
  oneLine: string;
  intro: string;
  ragQuery: Omit<RagQuery, "topK" | "maxPerBook">;
  related: string[];
}

export const BAZI_GUIDE: BaziGuideEntry[] = [
  {
    name: "五行生剋", urlSlug: "wuxing-shengke", step: 1,
    title: "五行生剋：八字的底層執行規則",
    subtitle: "木火土金水 · 相生相剋的迴圈",
    oneLine: "金木水火土如何相生相剋，是讀懂八字的第一課。",
    intro: "五行生剋是整個八字體系的地基。木生火、火生土、土生金、金生水、水生木為「相生」；木克土、土克水、水克火、火克金、金克木為「相剋」。本文把這兩個迴圈講透，並說明生克在八字裡到底意味著什麼——什麼是「洩」、什麼是「耗」、為什麼生不一定是好事、克不一定是壞事。",
    ragQuery: { text: "五行 生克 相生 相剋 木火土金水 八字 基礎 洩 耗 制化", topic: "格局" },
    related: ["tiangan-dizhi", "rizhu-wangshuai", "dizhi-canggan"],
  },
  {
    name: "天干地支", urlSlug: "tiangan-dizhi", step: 2,
    title: "天干地支：八字到底是哪八個字",
    subtitle: "十天干 · 十二地支 · 六十甲子",
    oneLine: "年月日時各一柱、每柱一干一支，合起來就是「八字」。",
    intro: "「八字」就是出生的年、月、日、時四柱，每柱一個天干配一個地支，四柱共八個字。本文講清十天干（甲乙丙丁戊己庚辛壬癸）、十二地支（子醜寅卯……）各自的五行陰陽，干支如何組成六十甲子，以及怎麼從出生時間排出你自己的四柱。",
    ragQuery: { text: "天干 地支 十天干 十二地支 六十甲子 四柱 排盤 五行 陰陽 八字基礎", topic: "格局" },
    related: ["wuxing-shengke", "dizhi-canggan", "dayun"],
  },
  {
    name: "地支藏幹", urlSlug: "dizhi-canggan", step: 3,
    title: "地支藏幹：每個地支裡藏著的天干",
    subtitle: "本氣 · 中氣 · 餘氣",
    oneLine: "地支不是單一五行，裡面藏著一到三個天干，這才是論命關鍵。",
    intro: "地支看似一個字，裡面卻「藏」著天干——例如寅藏甲丙戊、午藏丁己。藏幹分本氣、中氣、餘氣，決定了月令取什麼十神、格局怎麼定。本文用清晰的方式講透十二地支各藏哪些幹、為什麼藏幹比地支本身更重要，以及它如何影響日主旺衰與取格。",
    ragQuery: { text: "地支藏幹 本氣 中氣 餘氣 寅藏甲丙戊 月令 取格 人元 八字基礎", topic: "格局" },
    related: ["tiangan-dizhi", "rizhu-wangshuai", "wuxing-shengke"],
  },
  {
    name: "日主旺衰", urlSlug: "rizhu-wangshuai", step: 4,
    title: "日主旺衰：判斷身強身弱的方法",
    subtitle: "得令 · 得地 · 得勢 · 取用神的前提",
    oneLine: "先看日主是強是弱，才能決定整個八字喜什麼、忌什麼。",
    intro: "判斷日主（你自己）的強弱，是取用神、斷喜忌的前提。方法看三點：得令（月令是否生扶日主）、得地（地支有無根氣）、得勢（天干有無幫扶）。本文把身強、身弱、從旺、從弱講清楚，並說明為什麼「身強喜克洩、身弱喜生扶」是八字平衡的核心邏輯。",
    ragQuery: { text: "日主 旺衰 身強 身弱 得令 得地 得勢 月令 通根 喜用神 八字", topic: "格局" },
    related: ["dizhi-canggan", "tiaohou-yongshen", "wuxing-shengke"],
  },
  {
    name: "調候用神", urlSlug: "tiaohou-yongshen", step: 5,
    title: "調候用神：八字裡的「冷暖」調節",
    subtitle: "寒暖燥溼 · 窮通寶鑑的核心",
    oneLine: "除了看強弱，還要看八字冷熱燥溼——這就是調候。",
    intro: "用神不止「扶抑」一種，還有「調候」。冬天生的命局偏寒、需要火來暖；夏天生的偏燥、需要水來潤——這種按寒暖燥溼來取的用神就是調候用神，是《窮通寶鑑》的核心。本文講清調候與扶抑用神的區別、什麼時候調候優先，以及它為什麼常常決定一個命的舒適度與貴氣。",
    ragQuery: { text: "調候用神 寒暖燥溼 窮通寶鑑 扶抑 喜用神 冬生喜火 夏生喜水 八字", topic: "格局" },
    related: ["rizhu-wangshuai", "wuxing-shengke", "dayun"],
  },
  {
    name: "大運", urlSlug: "dayun", step: 6,
    title: "大運：決定人生階段的十年運",
    subtitle: "起運 · 順逆排 · 一步十年",
    oneLine: "大運是命局之外的十年時空背景，順逆與起運歲數因人而異。",
    intro: "八字是「命」，大運是「運」——每十年一步，是命局之外的時空背景。本文講清大運怎麼排（從月柱起、陽男陰女順行、陰男陽女逆行）、起運歲數怎麼算，以及為什麼同樣的八字走不同大運、際遇會天差地別。命好不如運好，說的就是這層關係。",
    ragQuery: { text: "大運 起運 順行 逆行 陽男陰女 月柱 十年 運勢 八字 命運", topic: "格局" },
    related: ["liunian", "tiangan-dizhi", "rizhu-wangshuai"],
  },
  {
    name: "流年", urlSlug: "liunian", step: 7,
    title: "流年：每一年的吉凶怎麼看",
    subtitle: "太歲 · 大運流年合參 · 應期",
    oneLine: "流年是當年的干支，與大運、命局一起決定那一年的吉凶。",
    intro: "流年就是某一年的干支（如甲辰年），俗稱「太歲」。看一年順不順，不能只看流年本身，要把命局、大運、流年三者合參——流年引動了命中的喜用還是忌神？本文講清流年怎麼看、什麼是「應期」、為什麼「犯太歲」不必恐慌，以及流年與大運誰更重要。",
    ragQuery: { text: "流年 太歲 大運流年 應期 犯太歲 引動 喜用 忌神 八字 當年運勢", topic: "格局" },
    related: ["dayun", "rizhu-wangshuai", "shensha"],
  },
  {
    name: "神煞", urlSlug: "shensha", step: 8,
    title: "神煞：天乙貴人、桃花、驛馬怎麼用",
    subtitle: "錦上添花 · 不可喧賓奪主",
    oneLine: "神煞是命局的點綴，參考可以，但別拿它當主軸論命。",
    intro: "神煞是八字裡的一類「標籤」，如天乙貴人、桃花、驛馬、華蓋、羊刃等，各有象徵。本文挑出最常用的幾個講清含義與用法，更重要的是說明現代命理對神煞的態度：它是錦上添花的參考，絕不能喧賓奪主——五行生剋、十神格局才是論命主軸，神煞只在格局之上做微調。",
    ragQuery: { text: "神煞 天乙貴人 桃花 驛馬 華蓋 羊刃 八字 點綴 參考 喧賓奪主", topic: "格局" },
    related: ["liunian", "dayun", "wuxing-shengke"],
  },
];

export function getBaziGuide(urlSlug: string): BaziGuideEntry | undefined {
  return BAZI_GUIDE.find(g => g.urlSlug === urlSlug);
}
