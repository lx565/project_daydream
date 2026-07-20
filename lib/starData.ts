export const MAJOR_STARS = [
  { name: "紫微", urlSlug: "ziwei",     element: "土", polarity: "帝星", brief: "帝王之星，主尊貴、權威與領導力。氣勢高華，具王者風範。", related: ["tianfu", "tianxiang", "qisha"] },
  { name: "天機", urlSlug: "tianji",    element: "木", polarity: "善星", brief: "智慧之星，主機謀、變化與宗教哲學。思維敏捷，善於分析。", related: ["tianliang", "taiyin", "jumen"] },
  { name: "太陽", urlSlug: "taiyang",   element: "火", polarity: "貴星", brief: "光明之星，主名譽、貴人與父緣。慷慨熱情，重情義。", related: ["taiyin", "tianliang", "jumen"] },
  { name: "武曲", urlSlug: "wuqu",      element: "金", polarity: "財星", brief: "財帛之星，主財富、意志與執行力。剛毅果斷，善於理財。", related: ["tianfu", "qisha", "tanlang"] },
  { name: "天同", urlSlug: "tiantong",  element: "水", polarity: "福星", brief: "福德之星，主享受、感情與平和。溫和善良，重感情。", related: ["taiyin", "tianliang", "tianxiang"] },
  { name: "廉貞", urlSlug: "lianzhen",  element: "火", polarity: "囚星", brief: "次桃花星，主人際、變動與才藝。性情激烈，有魅力。", related: ["tanlang", "qisha", "pojun"] },
  { name: "天府", urlSlug: "tianfu",    element: "土", polarity: "財庫", brief: "南斗主星，主財庫、穩重與保守。穩健踏實，擅長守成。", related: ["ziwei", "wuqu", "tianxiang"] },
  { name: "太陰", urlSlug: "taiyin",    element: "水", polarity: "財星", brief: "月亮之星，主財富、感情與母緣。細膩溫柔，重內心感受。", related: ["taiyang", "tiantong", "tianji"] },
  { name: "貪狼", urlSlug: "tanlang",   element: "木", polarity: "桃花", brief: "慾望之星，主才藝、桃花與物質追求。多才多藝，魅力十足。", related: ["lianzhen", "wuqu", "ziwei"] },
  { name: "巨門", urlSlug: "jumen",     element: "水", polarity: "暗曜", brief: "口才之星，主是非、探究與辯才。思維深邃，善於探索真相。", related: ["taiyang", "tianji", "tiantong"] },
  { name: "天相", urlSlug: "tianxiang", element: "水", polarity: "印星", brief: "印綬之星，主貴人、協作與服務精神。重義氣，樂於助人。", related: ["ziwei", "tianfu", "pojun"] },
  { name: "天梁", urlSlug: "tianliang", element: "土", polarity: "蔭星", brief: "老人之星，主壽命、廕庇與宗教哲學。有長者風範，善於化險。", related: ["tianji", "taiyang", "tiantong"] },
  { name: "七殺", urlSlug: "qisha",     element: "金", polarity: "將星", brief: "將軍之星，主權威、突破與孤克。魄力超凡，敢於開創。", related: ["pojun", "tanlang", "wuqu"] },
  { name: "破軍", urlSlug: "pojun",     element: "水", polarity: "耗星", brief: "開創之星，主破壞與重建、變動與改革。創新進取，勇於變革。", related: ["qisha", "tanlang", "lianzhen"] },
] as const;

export type StarName = typeof MAJOR_STARS[number]["name"];
export type StarSlug = typeof MAJOR_STARS[number]["urlSlug"];

export const PALACES = [
  { name: "命宮",  urlSlug: "ming-gong",     topic: "格局" as const, brief: "代表人生整體格局、個性特徵與一生主體運勢", related: ["guanlu-gong", "caibo-gong", "qianyi-gong"] },
  { name: "兄弟宮", urlSlug: "xiongdi-gong", topic: "家庭" as const, brief: "代表手足緣分、同輩關係與人脈資源", related: ["jiaoyou-gong", "fumu-gong", "zinv-gong"] },
  { name: "夫妻宮", urlSlug: "fuqi-gong",    topic: "感情" as const, brief: "代表婚姻質量、伴侶特質與感情走向", related: ["fude-gong", "ming-gong", "zinv-gong"] },
  { name: "子女宮", urlSlug: "zinv-gong",    topic: "家庭" as const, brief: "代表子女緣分、創造力與下屬部署關係", related: ["fuqi-gong", "tianzhai-gong", "fumu-gong"] },
  { name: "財帛宮", urlSlug: "caibo-gong",   topic: "財運" as const, brief: "代表財富積累方式、賺錢能力與理財格局", related: ["tianzhai-gong", "guanlu-gong", "fude-gong"] },
  { name: "疾厄宮", urlSlug: "jie-gong",     topic: "健康" as const, brief: "代表健康狀況、身體易患部位與抗壓韌性", related: ["fude-gong", "ming-gong", "fumu-gong"] },
  { name: "遷移宮", urlSlug: "qianyi-gong",  topic: "事業" as const, brief: "代表出行運勢、外部社會形象與異鄉發展", related: ["ming-gong", "jiaoyou-gong", "guanlu-gong"] },
  { name: "交友宮", urlSlug: "jiaoyou-gong", topic: "貴人" as const, brief: "代表朋友質量、同事關係與貴人運", related: ["xiongdi-gong", "qianyi-gong", "guanlu-gong"] },
  { name: "官祿宮", urlSlug: "guanlu-gong",  topic: "事業" as const, brief: "代表事業格局、職位成就與工作特質", related: ["ming-gong", "caibo-gong", "qianyi-gong"] },
  { name: "田宅宮", urlSlug: "tianzhai-gong",topic: "財運" as const, brief: "代表房產不動產、家庭環境與祖業傳承", related: ["caibo-gong", "zinv-gong", "fude-gong"] },
  { name: "福德宮", urlSlug: "fude-gong",    topic: "格局" as const, brief: "代表福氣底蘊、精神世界與內心滿足感", related: ["ming-gong", "fuqi-gong", "jie-gong"] },
  { name: "父母宮", urlSlug: "fumu-gong",    topic: "家庭" as const, brief: "代表父母緣分、長上關係與文書貴人運", related: ["xiongdi-gong", "zinv-gong", "jie-gong"] },
] as const;

export type PalaceName = typeof PALACES[number]["name"];
export type PalaceSlug = typeof PALACES[number]["urlSlug"];
