# Fortune Platform — 实施计划

**日期：** 2026-06-14  
**参考规格：** `docs/superpowers/specs/2026-06-14-fortune-platform-design.md`

---

## 构建顺序

### 阶段一：RAG 知识库（可独立完成）

**任务 1 — PDF 文字提取脚本**  
写 `scripts/extract-pdfs.py`，用 pdfplumber 批量提取 knowledge/sources/ 下所有 PDF，输出到 `knowledge/extracted/<学派>/<书名>.txt`。  
命令：`python3 scripts/extract-pdfs.py`  
依赖：`pip install pdfplumber`

**任务 2 — 分块脚本**  
写 `scripts/chunk-knowledge.py`，读取提取的文本，按 500 字分块，输出 `knowledge/extracted/<学派>/<书名>.chunks.json`。  
每块含：school、source、page_hint、text 字段。

**任务 3 — RAG 检索模块**  
写 `lib/rag.ts`，实现 `searchKnowledge(stars: string[], topic: string, school: '三合派'|'四化派'): string`。  
逻辑：读对应学派的 chunks JSON，按星曜名关键词过滤，返回 top 5 拼接文本。  
注意：Node.js 环境，同步读文件，chunks 文件在 build 时打包进去或用 `fs.readFileSync`。

> 任务 1、2 可并行（都是 Python 脚本，互不依赖）。任务 3 依赖任务 2 的输出格式。

---

### 阶段二：新 API Routes

**任务 4 — `/api/reading/overview`**  
输入：ziwei + bazi 数据。  
输出：SSE 流，Sonnet 生成 ~200 字总览。  
复用 AiReading.tsx 的 SSE 消费逻辑。

**任务 5 — `/api/reading/dual-school`**  
输入：ziwei 数据。  
输出：SSE 流，含【三合派】【四化派】【两派共识】标记。  
使用 RAG 模块（依赖任务 3）注入双派知识。  
使用 prompt caching（系统提示 + 知识库部分加 cache_control）。

**任务 6 — `/api/reading/topic`**  
输入：ziwei + topic（wealth/love/career/health/annual）。  
输出：SSE 流，双派视角话题解读 ~400 字。  
复用 dual-school 的 RAG 注入逻辑。

**任务 7 — `/api/chat`**  
输入：ziwei + messages 历史数组（最多 6 条）。  
输出：SSE 流，Haiku 回答 ~150 字。  
不需要 RAG（对话已有上下文）。

**任务 8 — `/api/feedback`**  
输入：rating + sessionId + 可选 comment。  
写入 `data/feedback.jsonl`，创建 `data/` 目录并加入 `.gitignore`。  
返回 `{ ok: true }`。

> 任务 4、7、8 互相独立，可并行。任务 5、6 依赖任务 3。

---

### 阶段三：前端向导

**任务 9 — WizardFlow 状态机**  
写 `components/WizardFlow.tsx`，管理当前步骤（1-5）和各步骤数据。  
接收命盘数据 props（由 result/page.tsx 服务端算好传入）。  
步骤间数据流：每步完成后将输出存入状态，传给下一步。

**任务 10 — 步骤2：总览**  
在 WizardFlow 内，步骤2 自动调用 `/api/reading/overview`，复用 AiReading.tsx 渲染流式文本。  
完成后显示"继续 →"按钮。

**任务 11 — 步骤3：DualSchoolReading 组件**  
写 `components/DualSchoolReading.tsx`。  
调用 `/api/reading/dual-school`，流式解析【标记】，分别渲染到三合/四化/共识三个区域。  
布局：上方左右两栏（三合 | 四化），下方全宽共识区。

**任务 12 — 步骤4：TopicSelector + TopicReading**  
写 `components/TopicSelector.tsx`（卡片选择：财运/感情/事业/健康/流年）。  
写 `components/TopicReading.tsx`（调用 `/api/reading/topic`，展示解读）。  
用户可切换话题，重新加载解读。

**任务 13 — 步骤5：ChatInterface + FeedbackWidget**  
写 `components/ChatInterface.tsx`，维护 messages 状态，调用 `/api/chat`，显示剩余次数。  
写 `components/FeedbackWidget.tsx`，👍/👎 按钮，调用 `/api/feedback`，提交后显示感谢语。

**任务 14 — 改造 result/page.tsx**  
服务端部分保留（SSR 算命盘），将命盘数据传给 `<WizardFlow>` 客户端组件。  
删除旧的 AiReading 自动启动逻辑和 I Ching 区块（或保留为可选方法）。

> 任务 9 是基础，10-13 依赖它，可在 9 完成后并行开发。任务 14 最后做。

---

## 完整依赖图

```
任务1 ──┐
任务2 ──┤→ 任务3 → 任务5 → (前端任务11)
        │        → 任务6 → (前端任务12)
任务4 ──┘ (独立) → (前端任务10)
任务7 ────────── (独立) → (前端任务13)
任务8 ────────── (独立) → (前端任务13)
任务9 → 任务10/11/12/13 → 任务14
```

---

## 验收标准

- [ ] 输入1990-01-01，性别男，能走完5步向导
- [ ] 步骤3 三合派/四化派/共识三个区块都有内容
- [ ] 步骤5 聊天第6条提问时输入框消失
- [ ] 点击👍后显示感谢，`data/feedback.jsonl` 有记录
- [ ] `knowledge/extracted/` 有来自至少三合派和四化派的文本文件
- [ ] `/api/reading/dual-school` 的 RAG 知识来源可在 prompt 中验证（加 debug 日志）

---

## 推荐开始顺序

先做 **任务1+2+3**（RAG 基础），再做 **任务5**（双派 API），再做 **任务9+11**（能看到前端效果）。  
这条线走通之后，其余任务可以任意顺序填充。
