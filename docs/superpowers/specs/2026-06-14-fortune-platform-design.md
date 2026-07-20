# Fortune Platform — 设计规格文档

**日期：** 2026-06-14  
**项目：** project_daydream / fortune-app  
**目标用户：** 对命运好奇的中文初学者，免费平台

---

## 一、现有代码库状态

### 已建好的
- `app/page.tsx` — 首页，展示 FortuneForm
- `app/result/page.tsx` — 结果页（服务端渲染），算命盘 + 展示 AiReading
- `app/api/interpret/route.ts` — SSE 流式 API，调 claude-haiku-4-5，单次输出五段解读
- `lib/ziwei.ts` — 封装 iztro，计算紫微斗数命盘，返回 12 宫 + 星曜
- `lib/bazi.ts` — 八字计算
- `lib/knowledge.ts` — 读 knowledge/stars/major/*.md 模板，目前模板全空，返回空字符串
- `components/AiReading.tsx` — SSE 流式渲染组件
- `components/ZiweiChart.tsx`, `BaziChart.tsx` — 命盘图

### 当前流程（需要改造）
```
用户填表 → URL params → /result 服务端渲染 → AiReading 自动启动 SSE → 单次 Haiku 解读
```

---

## 二、新目标流程（5步向导）

```
步骤1: 输入生辰
  ↓
步骤2: 展示命盘图 + 命格总览（Sonnet 生成，~200字）
  ↓
步骤3: 双派解读（三合派 vs 四化派并列，底部两派共识）
  ↓
步骤4: 话题深入（用户选：财运/感情/事业/健康/流年）
  ↓
步骤5: 聊天跟进（最多5条，Haiku）+ 反馈评分（👍/👎）
```

步骤2-5 全部在客户端状态管理，不再用 URL params 跳页（改为单页 React 状态机）。

---

## 三、RAG 架构

### 方案：预处理文本 + 关键词检索（推荐）

不用向量数据库，原因：71本书内容结构化程度高（星曜名称、宫位名称是固定词汇），关键词匹配已足够精准。

**一次性预处理流程（本地脚本运行）：**

```
knowledge/sources/三合派/*.pdf
        ↓ pdfplumber (Python)
knowledge/extracted/三合派/王亭之-中州派初级讲义.txt   ← 全文
knowledge/extracted/三合派/王亭之-中州派初级讲义.chunks.json  ← 分块
```

chunks.json 结构：
```json
[
  {
    "id": "wang-tingzhi-p42",
    "school": "三合派",
    "source": "王亭之-中州派初级讲义",
    "page": 42,
    "text": "紫微星入命宫，主人有领导气质..."
  }
]
```

**运行时检索逻辑（`lib/rag.ts`）：**

```
输入：星曜列表 + 话题 + 学派
  ↓
在对应学派的 chunks 中搜索包含这些星曜名的段落
  ↓
按相关度排序（星曜名出现次数），取 top 5 chunks，合计约 1500 tokens
  ↓
注入 prompt
```

---

## 四、API Routes

### 现有（保留，小改）
- `POST /api/interpret` — 保留现有结构，改用 Sonnet 模型

### 新增

#### `POST /api/reading/overview`
步骤2调用，生成命格总览。

请求：
```json
{
  "ziwei": { "summary": "...", "soulPalace": "...", "mainStar": "...", ... },
  "bazi": { "dayMaster": "...", ... }
}
```
返回：SSE 流，~200字总览，简要描述命主特质和整体格局。

#### `POST /api/reading/dual-school`
步骤3调用，生成双派解读。

请求：
```json
{
  "ziwei": { ... },
  "topic": "overall"
}
```
返回：SSE 流，格式：
```
【三合派】\n...\n\n【四化派】\n...\n\n【两派共识】\n...
```
客户端按`【三合派】`/`【四化派】`/`【两派共识】`分割，渲染到对应区域。

模型：claude-sonnet-4-6，prompt caching 缓存系统提示 + RAG 知识库部分。

#### `POST /api/reading/topic`
步骤4调用，话题深入解读。

请求：
```json
{
  "ziwei": { ... },
  "topic": "wealth"   // wealth | love | career | health | annual
}
```
返回：SSE 流，双派视角针对该话题的详细解读，约 400 字。

模型：claude-sonnet-4-6。

#### `POST /api/chat`
步骤5调用，聊天跟进。

请求：
```json
{
  "ziwei": { ... },
  "messages": [
    { "role": "assistant", "content": "你的命盘显示..." },
    { "role": "user", "content": "今年财运如何？" }
  ],
  "remainingQuestions": 4
}
```
返回：SSE 流，简短回答，~150字。  
模型：claude-haiku-4-5-20251001。

#### `POST /api/feedback`
步骤5调用，保存评分。

请求：
```json
{
  "sessionId": "uuid",
  "rating": "up",   // "up" | "down"
  "comment": "很准"
}
```
返回：`{ "ok": true }`

存储：追加到 `data/feedback.jsonl`，每行一条 JSON 记录。

---

## 五、组件结构

### 改造现有组件

**`app/result/page.tsx`** → 拆成客户端向导  
现在是服务端渲染页面（SSR），改为：
- 保留服务端算命盘（SSR，iztro 计算快）
- 将命盘数据通过 props 传给新的客户端 `WizardFlow` 组件
- WizardFlow 管理步骤状态

**`app/api/interpret/route.ts`**  
保留，改模型为 claude-sonnet-4-6，或直接废弃改用新路由。

### 新增组件

```
components/
  WizardFlow.tsx          ← 主状态机，管理当前步骤
  WizardStep.tsx          ← 步骤容器（进度条 + 内容插槽）
  DualSchoolReading.tsx   ← 步骤3：三合/四化并排 + 共识
  TopicSelector.tsx       ← 步骤4：话题卡片选择
  TopicReading.tsx        ← 步骤4：话题解读展示
  ChatInterface.tsx       ← 步骤5：聊天 UI，含剩余次数显示
  FeedbackWidget.tsx      ← 步骤5：👍/👎 评分
```

---

## 六、步骤3 详细设计

### Prompt 结构（dual-school）

系统提示（可缓存）：
```
你是精通三合派和四化派的紫微斗数命理师。
请严格按以下格式输出，用【三合派】【四化派】【两派共识】三个标记分隔：
...
```

用户消息：
```
命盘数据：[ziwei summary + 主要宫位星曜]

三合派参考知识：
[RAG chunks from 三合派书籍：王亭之、陆斌兆]

四化派参考知识：
[RAG chunks from 四化派书籍：蔡明宏、许铨仁]

请从两派分别给出命格整体解读，各150字左右，然后给出两派共识100字。
```

### 客户端渲染逻辑

```typescript
// DualSchoolReading.tsx
// 流式接收文本，按标记分割到三个区域
const MARKERS = ['【三合派】', '【四化派】', '【两派共识】'];

// 实时解析：遇到标记切换当前写入的区域
// 三列布局：三合 | 四化 | 共识（共识占全宽）
```

---

## 七、步骤5 聊天 Session 管理

**设计：无服务端状态，客户端维护历史。**

```typescript
// ChatInterface.tsx 内部状态
const [messages, setMessages] = useState<Message[]>([
  { role: 'assistant', content: overviewText }  // 用步骤2总览作为初始上下文
]);
const [remaining, setRemaining] = useState(5);
```

每次发送：
1. 把完整 messages 历史 + 命盘数据发给 `/api/chat`
2. 接收流式回复，append 到 messages
3. remaining - 1
4. remaining === 0 时隐藏输入框，显示"已用完今日免费提问"

**上下文控制：** messages 最多保留最近 6 条（3轮对话），避免 token 过多。

---

## 八、反馈数据存储

文件：`data/feedback.jsonl`（追加写入，不读取）

每条记录：
```json
{"ts":"2026-06-14T10:00:00Z","sessionId":"abc123","rating":"up","comment":"","mainStar":"紫微","soulPalace":"子"}
```

`data/` 目录加入 `.gitignore`，不上传。

定期手动查看：`cat data/feedback.jsonl | python3 -c "import sys,json; [print(json.loads(l)['rating']) for l in sys.stdin]"`

---

## 九、成本控制

| 场景 | 模型 | 预估 tokens | 预估成本/次 |
|------|------|-------------|-------------|
| 步骤2 总览 | Sonnet | 1500 in / 200 out | ~$0.007 |
| 步骤3 双派 | Sonnet + cache | 3000 in(cached) / 600 out | ~$0.012 |
| 步骤4 话题 | Sonnet + cache | 2500 in(cached) / 400 out | ~$0.009 |
| 步骤5 聊天×5 | Haiku | 500 in / 150 out × 5 | ~$0.004 |
| **合计** | | | **~$0.03/用户** |

Prompt caching 应用于：系统提示 + RAG 知识库内容（这部分固定，缓存后 90% 折扣）。

---

## 十、不做的事（YAGNI）

- 不做向量数据库（关键词搜索够用）
- 不做用户账号系统（URL 分享足够）
- 不做实时数据库（jsonl 文件够用于早期反馈收集）
- 不做多语言（先做好中文）
- 步骤2-4 不做流派切换（先固定三合+四化）
