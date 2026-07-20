#!/bin/zsh
# Fortune platform design session — runs at 3am when quota resets

cd /Users/nikipro/Desktop/Projects/fortune-app

LOG="/Users/nikipro/Desktop/Projects/fortune-app/design-session-3am.log"
echo "=== Started at $(date) ===" >> "$LOG"

/Users/nikipro/.local/bin/claude -p \
  --allowedTools "Bash,Read,Write,Edit,Glob,Grep" \
  --add-dir /Users/nikipro/Desktop/Projects/fortune-app \
  "你是在继续一个紫微斗数命理平台（fortune platform）的产品设计 brainstorming session。

## 已确定的设计决策

### 现有代码库（在当前目录）
- Next.js app，已有组件：FortuneForm, ZiweiChart, BaziChart, AiReading
- 已安装 iztro 库（紫微斗数命盘计算）
- 已安装 Anthropic SDK
- knowledge/ 目录：有空白 MD 模板（14颗主星 × 12宫位，6个格局）
- knowledge/sources/ 有71本PDF，按学派分类（三合派/四化派/飞星派/古籍经典/etc.）
- lib/ziwei.ts, lib/bazi.ts, lib/knowledge.ts 已存在

### 产品决策
1. 架构：RAG from 71本PDF → Claude 生成解读（不手动填知识库）
2. 用户流程 — 5步向导：
   - 步骤1：输入生辰（出生日期、时辰、性别）
   - 步骤2：展示紫微斗数命盘图 + 简要命格总览
   - 步骤3：双派解读 — 三合派视角 vs 四化派视角并列展示，底部给出「两派共识」摘要
   - 步骤4：话题深入 — 用户选择财运/感情/事业/健康/流年，AI针对该话题用双派视角详细解读
   - 步骤5：聊天跟进（最多5条免费提问）+ 反馈评分（👍/👎）
3. 模型分配：claude-sonnet-4-6 出初始解读；claude-haiku-4-5-20251001 接聊天
4. 成本控制：知识库 context 用 prompt caching；每 session 限5条聊天
5. 目标用户：对命运好奇的初学者；免费平台

## 你的任务

首先读取现有代码（重点：lib/knowledge.ts, lib/ziwei.ts, app/api/ 目录, components/AiReading.tsx, app/page.tsx, app/result/ 目录），理解现有结构。

然后完成以下工作：

1. 写完整设计规格文档到 docs/superpowers/specs/2026-06-14-fortune-platform-design.md，内容包括：
   - 架构总览（RAG pipeline：如何从PDF提取文字、分块、检索）
   - 需要的 API routes（端点、输入输出格式）
   - 组件结构（现有组件需要改什么，新增哪些组件）
   - 5个步骤的数据流
   - 步骤3详细设计：双派 prompt 如何构建，页面如何呈现
   - 步骤5聊天 session 管理（如何在5条消息之间维持上下文）
   - 反馈数据存储方案（简单有效：存哪里、存什么格式）
   - RAG 方案推荐：对于 knowledge/sources/ 里的PDF，最简单有效的方案是什么（考虑：预先提取文字→分块→存JSON/MD，vs 向量数据库，vs 关键词检索）

2. 写实施计划到 docs/superpowers/plans/2026-06-14-fortune-platform-plan.md，按逻辑顺序列出编号任务，标注哪些可以并行。

3. 如果 docs/superpowers/specs/ 和 docs/superpowers/plans/ 目录不存在，先创建。

4. 不要 git commit，只写文件就好，让用户醒来后自己审阅和提交。

设计要实用、可落地，避免过度设计。优先利用现有 Next.js 结构。" \
  >> "$LOG" 2>&1

echo "=== Finished at $(date) ===" >> "$LOG"
