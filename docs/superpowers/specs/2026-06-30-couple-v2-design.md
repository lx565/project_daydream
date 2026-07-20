# 合盘 v2 — 多关系类型 + 钩子变现设计

**日期:** 2026-06-30  
**状态:** 待实现

## 背景与目标

现有合盘功能解读"中规中矩"，且只支持情侣场景。本次升级目标：
1. 支持5种关系类型，扩大受众（朋友/亲子等场景在小红书传播力更强）
2. 加入感情模式 + 前世缘分等趣味内容，提升分享意愿
3. 实现第一个付费变现测试：免费钩子 → ¥19 解锁完整解读

## 关系类型

| 类型key | 中文名 | 前世缘故事 | 四维得分维度 |
|---|---|---|---|
| `lover` | 情侣/恋人 | ✓ | 吸引力 · 默契度 · 稳定度 · 成长潜力 |
| `spouse` | 夫妻 | ✓ | 稳定度 · 子嗣缘 · 家庭运 · 白头到老 |
| `friend` | 朋友/闺蜜 | ✗ | 默契度 · 互补性 · 长久性 · 互相成就 |
| `sibling` | 兄弟姐妹 | ✗ | 手足情深 · 互帮互助 · 缘分深浅 · 相处模式 |
| `parentchild` | 亲子 | ✗ | 亲缘深度 · 教育契合 · 前世羁绊 · 共同成长 |

## 用户流程

```
1. 选择关系类型（5个卡片，先选再填）
2. 输入双方姓名 + 出生信息 + 性别
3. 点击生成
        ↓
   【免费预览 — /api/reading/couple/preview】
   · 缘分类型标签（如"命中注定型"）
   · 甲方感情模式（2行）
   · 乙方感情模式（2行）
   · 四维得分维度名称（分数锁定显示为"???"）
   · 前世缘钩子句（截断："你们上辈子可能是……"）
        ↓
   【PaywallLock — ¥19 解锁】
   微信/支付宝个人收款码 → 用户填订单号 → 手动核对解锁
        ↓
   【完整解读 — /api/reading/couple/full】
   · 四维得分（具体数值）+ 各维度说明
   · 前世缘分完整故事（仅 lover/spouse）
   · 甲方感情模式详解
   · 乙方感情模式详解  
   · 飞化互入分析（A的星落在B哪个宫，反之亦然）
   · 夫妻宫三方四正（双方）
   · 大运时机对照（双方现在在什么大运）
   · 正缘时机 / 相处之道（按关系类型定制）
   · 分享卡片（可复制文字）
```

## 分享卡片格式

```
✦ 命里合盘 ✦
[名字A] × [名字B]

缘分类型：命中注定型
[维度1] 96 · [维度2] 89 · [维度3] 78 · [维度4] 92

"你们上辈子可能是相依为命的旅人"

仅供传统文化学习参考 · mingli.study
```

一键复制按钮，方便截图发小红书。

## 关键设计决策：四维得分用代码确定性计算，不靠AI

四维得分**不**由AI生成，而是用确定性算法从命盘数据算出（复用现有的
`zodiacRelation`/`stemRelations`/`branchRelations`/`dmRelHint` 等helper +
夫妻宫星曜 + 红鸾天喜）。原因：

1. **一致性** — preview、full、分享卡片三处显示同一组分数，不会矛盾
   （否则两次独立AI调用可能 preview 说"命中注定型96分"、full 解读却冷淡）
2. **免费且即时** — preview 的分数无需调模型，秒出
3. **可分享可信** — 分数稳定，同一对命盘每次结果一致

AI 只负责**围绕分数写文字**（感情模式、前世缘故事、相处之道）。
分数计算逻辑放入 `lib/coupleScore.ts`，每种关系类型映射到不同的加权公式。

## 技术设计

### 新增文件

**`lib/coupleTypes.ts`** — 关系类型配置
- `RelationshipType` 类型定义（5种）
- 每种类型的配置：
  - `label`: 中文名
  - `palaces`: 重点分析的宫位列表
  - `dimensions`: 四维得分的名称
  - `hasPastLife`: 是否生成前世缘故事
  - `ragTopic`: RAG检索主题词
  - `shareLabel`: 分享卡片标题

**`lib/coupleScore.ts`** — 四维得分确定性算法
- 输入：双方 bazi + ziwei + 关系类型
- 输出：4个 0-100 的分数（名称由 coupleTypes 决定）
- 复用现有 `zodiacRelation`/`stemRelations`/`branchRelations` 等逻辑
  （这些目前内嵌在 couple route，需抽出到此文件供两端共用）

### API 改动

> **现状（已核实）：** 合盘走 `/result?method=couple&...`，由 `CoupleResultView`
> 渲染，它已有 `sessionId` prop，SSE 缓存键为 `${sessionId}_couple`，
> 调的是 `/api/reading/couple`（单一端点，无 preview/full 之分）。
> 解锁机制为 `lib/unlock.ts` 的 `isUnlocked(chartId)`/`markUnlocked(chartId)`
> （KV key `unlock:{chartId}`），`/api/unlock/claim` 接受任意 `chartId` 字符串，
> `PaywallLock` 已接受 `chartId` prop。

**`/api/reading/couple/preview`（新建）**
- 输入：双方 bazi + ziwei + 关系类型
- 先用 `coupleScore.ts` 算出四维分数 + 缘分类型标签（确定性，非AI）
- AI 输出（SSE流）：甲方感情模式（2行）· 乙方感情模式（2行）· 钩子句（前世缘截断句）
- 无需解锁检查，rate limit: 3次/IP

**`/api/reading/couple/full`（由现有 `/api/reading/couple` 改造）**
- 新增：检查 `isUnlocked(coupleChartId)`，未解锁返回 401
- `coupleChartId` = `${sessionId}_couple`（复用现有 SSE 缓存键，无需新命名空间）
- 新增输入字段：`relationshipType`
- 提示词根据关系类型动态生成（从 coupleTypes.ts 读配置）
- 新增分析维度：飞化互入、三方四正、大运时机
- 复用 preview 已算出的四维分数（不重算），AI 围绕分数写详解
- 输出末尾附加分享卡片文本块

**`/api/unlock/claim`（无需改动）**
- 已接受任意 `chartId`；合盘传 `${sessionId}_couple` 即可，与个人解读
  （`chartId` 不带 `_couple` 后缀）天然隔离

### UI 改动

**`components/FortuneForm.tsx`（修改 — 合盘输入在这里，不是独立组件）**
- 在 couple mode（`mode === "couple"`，约 line 294）顶部加关系类型选择器
  （5个卡片，图标+名称）
- `handleSubmit` 的 couple 分支（约 line 156-169）把 `relationshipType`
  写入 URL params

**`app/result/page.tsx`（修改）**
- 读取新 URL param `relationshipType`，传给 `CoupleResultView`

**`components/CoupleResultView.tsx`（修改）**
- 接收 `relationshipType` prop
- 上半：免费预览区（四维分数 + 感情模式 2行 + 钩子句），调 preview 端点
- 分隔：`PaywallLock` 组件，`chartId={`${sessionId}_couple`}`，sectionLabel="合盘完整解读"
- 下半：付费后调 full 端点展示完整解读
- 底部：分享卡片 + 一键复制按钮

## 解锁机制

- 解锁 key：复用 `unlock:{chartId}`，合盘 chartId = `${sessionId}_couple`
  （与个人解读 `unlock:{sessionId}` 天然隔离，无需新增命名空间或 type 参数）
- **价格：¥29，复用现有支付码与二维码图片**（`/pay-wechat-29-v2.jpg` +
  `/pay-alipay-29-v2.jpg`），不新建资产、不改价格
- 支付方式：现有微信/支付宝个人收款码，用户手动输订单号
- 后台核对：与现有流程一致（写入同一 Google Sheet）
- **客户端门控（与现有模式一致）：** 复用 `usePaywall(chartId)` +
  `PaywallLock`。现有个人解读**只在客户端门控**（reading 路由不返回 401），
  合盘沿用同一模式：`gated = paywall.enabled && !paywall.unlocked` 时不自动
  调 full 端点、展示 PaywallLock；**不**在 full 路由加服务端 401（保持一致）
- **PaywallLock 微调：** 仅把硬编码的 `INCLUDED` 列表参数化（新增可选
  `included` prop），价格 ¥29 与二维码图片保持不变；合盘传入合盘版文案

> **注意 — 两次模型调用：** preview 与 full 是两次独立 AI 调用，这与
> Niki "尽量少调模型" 的偏好略有张力，但付费墙模式下无法避免（付费内容不能
> 提前生成）。缓解：preview 结果要缓存（按 `${sessionId}_couple_preview`），
> 刷新不重生成；四维分数走确定性算法不占模型调用。

## 不在本次范围内

- 自动支付回调（等流量起来后接虎皮椒）
- 跨验证（Gemini校验DeepSeek）暂不加入合盘
- 合盘历史记录

## 实现顺序

1. `lib/coupleTypes.ts` — 关系类型配置
2. `lib/coupleScore.ts` — 抽出现有合冲/生克逻辑 + 四维确定性算分
3. `/api/reading/couple/preview` — 免费预览端点（分数 + 感情模式 + 钩子）
4. `/api/reading/couple/full` — 改造现有 `/api/reading/couple`（解锁检查 + 关系类型 + 深度分析）
5. `FortuneForm.tsx` — couple mode 加关系类型选择器 + URL param
6. `app/result/page.tsx` — 透传 `relationshipType`
7. `CoupleResultView.tsx` — preview/full 两段 + PaywallLock + 分享卡片
8. 本地测试所有5种关系类型
9. 部署（注意：bump CACHE_VERSION，因合盘 prompt 结构变了）
