// 合盘关系类型配置。四维得分名称、重点宫位、是否生成前世缘故事、RAG 主题词
// 都按关系类型区分，供 preview/full 路由与得分算法共用。

export type RelationshipType =
  | "lover"      // 情侣/恋人
  | "spouse"     // 夫妻
  | "friend"     // 朋友/闺蜜
  | "sibling"    // 兄弟姐妹
  | "parentchild"; // 亲子

export interface RelationshipConfig {
  key: RelationshipType;
  label: string;                       // 中文名（UI 卡片 + 分享卡片）
  emoji: string;                       // UI 卡片图标
  dimensions: [string, string, string, string]; // 四维得分名称（顺序固定）
  palaces: string[];                   // 重点分析宫位（紫微）
  hasPastLife: boolean;                // 是否生成"前世缘"故事
  ragTopic: string;                    // RAG 检索主题词
  shareLabel: string;                  // 分享卡片标题副词，如"缘分类型"
  focusHint: string;                   // 给 AI 的关系侧重提示
}

export const RELATIONSHIP_TYPES: Record<RelationshipType, RelationshipConfig> = {
  lover: {
    key: "lover",
    label: "情侶 · 戀人",
    emoji: "💞",
    dimensions: ["吸引力", "默契度", "穩定度", "成長潛力"],
    palaces: ["夫妻", "命", "子女", "福德"],
    hasPastLife: true,
    ragTopic: "夫妻",
    shareLabel: "緣分類型",
    focusHint: "聚焦兩人的吸引力來源、相處默契、感情穩定度與共同成長空間；可談正緣時機。",
  },
  spouse: {
    key: "spouse",
    label: "夫妻",
    emoji: "💍",
    dimensions: ["穩定度", "子嗣緣", "家庭運", "白頭到老"],
    palaces: ["夫妻", "子女", "田宅", "命"],
    hasPastLife: true,
    ragTopic: "夫妻",
    shareLabel: "姻緣類型",
    focusHint: "聚焦婚姻穩定度、子嗣緣分、共同家運與長久相守之道。",
  },
  friend: {
    key: "friend",
    label: "朋友 · 閨蜜",
    emoji: "🤝",
    dimensions: ["默契度", "互補性", "長久性", "互相成就"],
    palaces: ["交友", "命", "福德"],
    hasPastLife: false,
    ragTopic: "交友",
    shareLabel: "友緣類型",
    focusHint: "聚焦兩人性情默契、能力互補、友誼能否長久、是否互相成就。",
  },
  sibling: {
    key: "sibling",
    label: "兄弟姐妹",
    emoji: "👫",
    dimensions: ["手足情深", "互幫互助", "緣分深淺", "相處模式"],
    palaces: ["兄弟", "命", "六亲"],
    hasPastLife: false,
    ragTopic: "兄弟",
    shareLabel: "手足緣",
    focusHint: "聚焦手足情分深淺、能否互相扶持、相處中的張力與化解。",
  },
  parentchild: {
    key: "parentchild",
    label: "親子",
    emoji: "👨‍👧",
    dimensions: ["親緣深度", "教育契合", "前世羈絆", "共同成長"],
    palaces: ["父母", "子女", "命"],
    hasPastLife: true,
    ragTopic: "父母",
    shareLabel: "親緣類型",
    focusHint: "聚焦親子緣分深淺、教養方式契合度、彼此牽絆與共同成長；語氣溫暖。",
  },
};

export function getRelationshipConfig(t: string | undefined): RelationshipConfig {
  if (t && t in RELATIONSHIP_TYPES) return RELATIONSHIP_TYPES[t as RelationshipType];
  return RELATIONSHIP_TYPES.lover;
}
