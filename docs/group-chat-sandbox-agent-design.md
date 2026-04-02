# 群组聊天改造最终设计：沙箱模式 + Agent 模式

日期：2026-04-02  
范围：在现有“剧场/群组聊天”基础上升级为可控的 **Room/Tab 沙箱系统**，支持 **Agent 模式** 与 **Sandbox 模式**（先设计、后分阶段落地）。

---

## 1. 背景与现状（Why）

当前群组（剧场）实现要点：
- **数据层**：`groups/group_members/messages`，消息以 `group_id` 聚合为单一消息流。
- **生成层**：一次生成只调用“一个角色”的 LLM；群组仅把历史消息拼成文本日志（`(Log: name) -> content`）。
- **问题**：
  1. 群组缺少结构化的“房间/场景状态”，难以长期推进剧情。
  2. 多角色没有真正的多 Agent 编排（谁先说、谁插话、如何收敛）。
  3. 缺少工具权限/预算/隔离，容易出现“穿帮”（角色读到不该读的信息）或 token 爆炸。

---

## 2. 总目标（What）

把“群组聊天”升级为可选的两种模式，并统一在 **Room**（房间）概念之下：

### 2.1 Agent 模式（Multi-Agent Room）
每个角色是独立 Agent：
- 独立 persona/记忆注入、可独立选择 `api_preset_id + model_id`。
- 由 **Director（导演/调度器）** 决定本回合谁发言/行动、是否并行、每个 Agent 目标与工具权限。

### 2.2 沙箱模式（Sandbox Room）
在 Agent 模式上叠加“世界状态工具化”：
- 房间具备结构化 **World State（世界状态 JSON）** 与 **Rules（规则）**。
- Agent/Director 只能通过“受控元语（Function Primitives）”提案更新状态，系统校验并落库。
- 支持状态快照/回滚，保证可控与可追溯。

> 设计上：**Sandbox = Agents + World State + Tool Policy + HITL**。实现可分阶段推进。

---

## 3. 非目标（本期不做）

- 真实代码执行/文件系统/外网抓取（除既有的 LLM 与生图代理）。
- 复杂的多步自动化工具链（先做“提案式工具调用”）。
- 实时 WebSocket 多人协作（先单用户体验）。
- 大规模向量记忆与检索（先用摘要/日志/Inbox）。

---

## 4. 核心概念与术语（Glossary）

- **Room（房间）**：对话与状态的最小隔离单元（对应 UI 的一个 Tab）。
- **Tab（标签页）**：前端侧边栏的可点击实体；**在 MVP 中 TabId=RoomId**（物理隔离）。
- **Global Log（全局日志）**：一个不可变的系统 Tab/Room，用于沉淀世界历史。
- **Director（导演/调度器）**：系统 Agent，负责回合编排、预算控制、状态合并与落库。
- **Agent（角色 Agent）**：角色的 LLM 实例，独立配置与权限。
- **World State（世界状态）**：结构化 JSON（全局/房间两级，见第9节）。
- **Dispatch（公文/信件）**：跨 Room 的异步通信，需玩家审批（HITL）。

---

## 5. 前端交互设计（UI/UX）

### 5.1 侧边栏路由 + 纯净聊天视图（极简架构）
避免模态框堆叠，采用“侧边栏路由 + 单一主视图”：
- **左侧导航栏**：动态渲染 Tab（Room）。包含不可变的【全局日志】以及动态生成的【场景/机构/角色组】分类。
- **右侧主视图**：永远是“当前 Tab 的消息流”。切换 Tab 即切换 Room 的上下文。
- **动态实体增删**：通过工具（例如 `create_character`）落库后，侧边栏实时刷新，不要求整页重载。

### 5.2 绝对防穿帮：物理隔离 + 三层记忆模型
彻底避免“把所有聊天塞进一个 Prompt”的方案。每次请求的上下文由三层拼接：
1. **全局世界状态（Global State）**：所有 Agent 共享（时间、国库、世界真理）。
2. **Room 专属长时记忆（Long-term Summary）**：该 Room 的摘要/关键设定（可由系统定期生成或工具写入）。
3. **Room 专属短时记录（Short-term History）**：SQL 严控 `WHERE room_id = current_room` 的最近 N 条消息。Agent 无法读取其他 Room 的对话。

### 5.3 会话区（消息流）
消息以 `sender_type` 区分：
- `user / agent / director / tool`
并支持折叠展示：
- `世界状态更新`（patch）
- `工具调用记录`（dispatch、query、write_log 等）

### 5.4 异步公文流转：人在回路（HITL）
跨 Room/跨 Agent 通信采用“公文流转 + 玩家审批 + 懒加载”：
1. Agent A 提案 `send_dispatch`（给出压缩摘要）。
2. 系统进入 `pending`，前端提示玩家“准奏/驳回/要求重写”。
3. 放行后，系统向目标 Room 静默插入一条 `tool` 消息（Inbox Injection）。
4. 只有当玩家切到目标 Room，才触发读取与反应（Lazy Trigger）。

---

## 6. 数据模型设计（D1）

说明：现有 `groups/group_members/messages` 可迁移；推荐新增 `rooms` 并逐步替代。

### 6.1 rooms（房间/Tab）
- `id`
- `name`
- `mode`：`chat | agents | sandbox | log`（log 用于全局日志）
- `category`（可选）：用于侧边栏分组（如“机构/角色组/场景”）
- `description`：场景描述
- `rules`：世界规则（Markdown）
- `state_json`：Room 世界状态（sandbox 使用）
- `created_at`
- `updated_at`

### 6.2 room_members（成员）
- `id`
- `room_id`
- `char_id`
- `role`：`agent | npc | narrator`
- `order_index`：轮转顺序
- `is_active`

### 6.3 room_agent_config（每房间的 Agent 配置）
- `id`
- `room_id`
- `char_id`
- `api_preset_id`
- `model_id`
- `temperature`
- `max_output_tokens`
- `tool_policy_json`（工具白名单/字段白名单）

### 6.4 room_turns（回合记录）
- `id`
- `room_id`
- `turn_index`
- `director_plan_json`
- `created_at`

### 6.5 messages（扩展 / 或新建 room_messages）
推荐扩展现有 messages：
- `room_id`（替代 group_id；旧数据可先保留 group_id）
- `sender_type`：`user | agent | director | tool`
- `sender_id`：char_id 或特殊 id
- `meta_json`：tool_call、state_patch、usage、dispatch_id 等

### 6.6 room_summaries（Room 长时记忆）
- `id`
- `room_id`
- `summary`（Markdown）
- `updated_at`
- `source`：`system | director | tool`

### 6.7 world_state（全局世界状态）
单例表（或用 settings.config 承载也可）：
- `id=1`
- `state_json`
- `updated_at`

### 6.8 dispatches（公文流转）
- `id`
- `from_room_id`
- `to_room_id`
- `abstract`（压缩摘要）
- `payload_json`（可选：结构化信息/附件引用）
- `status`：`pending | approved | rejected | rewrite_requested`
- `created_at`
- `resolved_at`
- `resolved_by`（user）

### 6.9 room_state_snapshots（沙箱快照）
- `id`
- `room_id`
- `turn_id`
- `state_json`
- `created_at`

---

## 7. 接口协议设计（Pages Functions）

### 7.1 房间管理
- `GET /api/rooms`
- `POST /api/rooms`
- `PUT /api/rooms`
- `DELETE /api/rooms?id=...`
- `GET /api/rooms?type=members&room_id=...`
- `PUT /api/rooms?type=members`

### 7.2 编排端点（核心）
新增服务端编排入口，统一多 Agent 调用与落库：
- `POST /api/room_chat`
  - 输入：`room_id`、`user_input`、`options`（本轮策略覆盖）
  - 输出：SSE（推荐）或 JSON：
    - `director_plan`
    - `messages[]`（按顺序产出：sender_type）
    - `state_patch`（可选）
    - `usage`（可选）

兼容：
- 单人聊天继续用 `/api/llm`。
- `rooms.mode=chat` 可沿用旧逻辑；`agents/sandbox` 走 `/api/room_chat`。

### 7.3 Dispatch（公文流转）
- `GET /api/dispatches?status=pending`
- `POST /api/dispatches`：创建提案（由工具调用触发）
- `PUT /api/dispatches`：审批/驳回/要求重写

---

## 8. Orchestrator（Director）设计

### 8.1 职责
1. 构造可控上下文（第5.2的三层记忆 + rules + budgets）。
2. 输出 Director Plan：谁发言、顺序/并行、每个 Agent 的 goal 与工具白名单。
3. 执行计划：依次/并行调用 Agent，收集输出与结构化提案（patch/dispatch/memory/log）。
4. 归并落库：写 messages/turns；若有 state_patch：校验 -> 应用 -> snapshot。

### 8.2 Director Plan（建议结构）
```json
{
  "turn_index": 12,
  "policy": { "max_agents": 2, "parallel": false },
  "speakers": [
    { "char_id": 3, "goal": "回应玩家并推动剧情", "tools": ["update_state", "commit_memory"] },
    { "char_id": 8, "goal": "补充线索/吐槽", "tools": ["write_log"] }
  ],
  "notes": "避免两人同时长篇"
}
```

### 8.3 轮转策略（可配置）
- `manual`：玩家点名/只让某个 Agent 回应
- `round_robin`：按 `order_index` 轮转
- `director`：由 Director 决定（推荐 sandbox）
- `hybrid`：默认轮转 + Director 可插入

---

## 9. Sandbox（世界状态）设计

### 9.1 双层状态
- **Global State**：全局真理（时间、宏观资源、全局事件计数）。
- **Room State**：房间专属状态（当前场景物件、人物关系、局部事实）。

### 9.2 状态更新机制：提案式 patch
Agent/Director 不直接写 JSON，而是输出 patch 提案（白名单 op）：
```json
{ "op": "add_fact", "path": "/facts", "value": "NPC 透露了暗号" }
```

服务端负责：
- 校验 op、path 范围、patch 大小
- 应用到 `state_json`
- 生成 `room_state_snapshots`（可回滚）

---

## 10. 沙箱核心元语（Function Calling Primitives）

让 AI 严格按固定语法操作系统，避免自然语言“隐性改规则”。

### 10.1 必备五大元语（MVP）
1. `update_state(patch[])`：更新 Global/Room State（仅提案，服务端校验后落库）。
2. `send_dispatch(to_room_id, abstract, payload?)`：跨 Room 通信提案（进入 HITL 流程）。
3. `query_world(query)`：查阅真相（按白名单查询 rooms/messages/state）。
4. `commit_memory(room_id, text)`：刻印 Room 长时记忆（写 room_summaries）。
5. `write_log(text)`：写入全局日志 Room。

可选：
- `roll_dice(sides, reason)`：风险动作随机性判定（只返回结构化结果）。
- `request_image(prompt, params)`：复用现有生图代理（受 tool_policy 控制）。

---

## 11. 安全与预算（Budget / Policy）

MVP 安全策略：
- 每回合最多 LLM 调用：`1 (director 可选) + K (agents)`，K 初始 ≤2
- 超时：例如 30s
- 单次输出上限（字符或 token）
- 工具白名单 + 参数白名单（tool_policy_json）
- Dispatch 必须经过玩家审批（HITL）
- Room 隔离：任何查询必须带 room_id 且服务端强制校验

---

## 12. 迁移与实施阶段（Roadmap）

### 12.1 兼容迁移
短期：
- 保留 `groups` 作为历史“旧剧场”
- 新增 `rooms`，提供从 group 导入到 room（mode=chat）

中期：
- UI 统一显示“Room/Tab”，旧 group 仅作为历史数据源
- `messages.group_id` 逐步迁移到 `room_id`

### 12.2 分阶段落地
1. **Phase A（Agent Room MVP）**
   - rooms + room_members + room_chat（先规则轮转，不用 LLM 输出 Director Plan）
   - 每回合固定 1 个 Agent 回应，可点名 override
2. **Phase B（Director 规划）**
   - 引入 Director 模型输出 plan
   - 支持每回合 2 个 Agent 发言、有限并行
3. **Phase C（Sandbox State）**
   - state_json + patch + snapshot + 回滚
   - 消息流展示状态变更折叠块
4. **Phase D（Dispatch/HITL）**
   - dispatches + 审批 UI + inbox injection + lazy trigger

---

## 13. 开放问题（需确认）

1. Sandbox 是否严格回合制（玩家一句 -> 系统一回合）？是否允许插话？
绝对严格回合制。
2. Director 是否必须使用 LLM，还是允许“规则导演”（更稳定）？
规则导演
3. Narrator（旁白）是否作为独立 Agent？
为一种特殊的 System Role，附属于 Director。
4. 默认成员数量上限、并发策略、每回合最大发言人数？
基于 Cloudflare Worker 的限制保守设置。
5. LLM 调用是否全部迁移到服务端编排（浏览器不持 key），还是继续沿用当前前端带 key 的方式？
必须 100% 迁移到服务端。
