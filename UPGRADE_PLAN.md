# SimpleRP Cloud 全量升级计划

基于对 [现有代码结构](file:///e:/AiWeb/project/simplerp-web/src/App.tsx) 的深入研究，效仿 SillyTavern 实现三大核心功能的全面升级。

---

## 📋 升级概览

| 功能模块 | 优先级 | 工作量 |
|---------|--------|--------|
| 变量系统与阶段性表现 | P0 | 高 |
| 世界书机制深化 | P0 | 高 |
| 快照式历史管理 | P0 | 高 |

---

## 一、数据库 Schema 变更计划

### 1.1 新增表结构

```sql
-- ============================================
-- 10. 对话变量定义表
-- ============================================
CREATE TABLE IF NOT EXISTS variables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    char_id INTEGER,           -- 关联角色ID（可为空表示全局变量）
    room_id INTEGER,           -- 关联房间ID（可为空表示非房间变量）
    name TEXT NOT NULL,        -- 变量名（如：好感度、心情值）
    key TEXT NOT NULL,         -- 变量键（如：affection, mood，用于模板替换）
    type TEXT NOT NULL,        -- 类型：number/string/boolean/range
    value TEXT,                -- 当前值（JSON格式存储）
    min_value REAL,            -- 最小值（number/range类型用）
    max_value REAL,            -- 最大值（number/range类型用）
    step REAL,                 -- 步长
    is_persistent INTEGER DEFAULT 1,  -- 是否持久化
    is_visible INTEGER DEFAULT 1,      -- 是否在界面显示
    description TEXT,          -- 变量描述
    created_at INTEGER,
    updated_at INTEGER
);

-- ============================================
-- 11. 变量阶段性表现配置表
-- ============================================
CREATE TABLE IF NOT EXISTS variable_stages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    variable_id INTEGER NOT NULL,
    name TEXT NOT NULL,        -- 阶段名称（如：冷漠、友好、亲密）
    condition TEXT NOT NULL,   -- 触发条件（JSON格式，支持表达式）
    priority INTEGER DEFAULT 0,-- 优先级，数字越大越优先
    stage_prompt TEXT,         -- 该阶段注入的提示词
    is_active INTEGER DEFAULT 1,
    created_at INTEGER
);

-- ============================================
-- 12. 变量思考API配置表
-- ============================================
CREATE TABLE IF NOT EXISTS variable_thought_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    char_id INTEGER,
    room_id INTEGER,
    preset_id INTEGER,         -- 使用的API预设ID
    model TEXT,                -- 使用的模型
    thought_prompt TEXT,       -- 思考提示词模板
    update_condition TEXT,     -- 何时触发思考更新（如：每条消息后/每N条后）
    update_interval INTEGER,   -- 更新间隔（N条消息）
    is_auto_update INTEGER DEFAULT 0,
    created_at INTEGER
);

-- ============================================
-- 13. 世界书扩展表（增强原有lorebook）
-- ============================================
CREATE TABLE IF NOT EXISTS lorebook_v2 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    char_id INTEGER,
    room_id INTEGER,
    name TEXT NOT NULL,        -- 条目名称
    keywords TEXT,             -- 关键词（兼容原有格式）
    regex_pattern TEXT,        -- 正则表达式匹配
    content TEXT NOT NULL,     -- 内容
    trigger_condition TEXT,    -- 复杂触发条件（JSON格式，支持变量判断等）
    priority INTEGER DEFAULT 0,-- 优先级
    category TEXT,             -- 分类标签
    position TEXT DEFAULT 'before_system', -- 注入位置（before_system/after_system/last）
    insertion_depth INTEGER,   -- 深度插入（递归深度）
    parent_id INTEGER,         -- 父条目ID（实现嵌套）
    probability REAL DEFAULT 1.0,  -- 触发概率（0-1）
    use_once INTEGER DEFAULT 0,-- 是否只触发一次
    cooldown_messages INTEGER DEFAULT 0, -- 触发后冷却N条消息
    last_triggered_at INTEGER, -- 上次触发时间
    is_active INTEGER DEFAULT 1,
    created_at INTEGER,
    updated_at INTEGER
);

-- ============================================
-- 14. 快照主表
-- ============================================
CREATE TABLE IF NOT EXISTS snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    char_id INTEGER,
    room_id INTEGER,
    name TEXT NOT NULL,        -- 快照名称
    description TEXT,          -- 快照描述
    thumbnail TEXT,            -- 缩略图（base64或URL）
    snapshot_type TEXT DEFAULT 'manual',  -- manual/auto/checkpoint
    message_count INTEGER,     -- 快照时的消息数量
    created_at INTEGER
);

-- ============================================
-- 15. 快照消息数据
-- ============================================
CREATE TABLE IF NOT EXISTS snapshot_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_id INTEGER NOT NULL,
    original_message_id INTEGER,  -- 原始消息ID
    char_id INTEGER,
    room_id INTEGER,
    role TEXT NOT NULL,
    content TEXT,
    image TEXT,
    timestamp INTEGER,
    order_index INTEGER       -- 消息顺序
);

-- ============================================
-- 16. 快照变量数据
-- ============================================
CREATE TABLE IF NOT EXISTS snapshot_variables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_id INTEGER NOT NULL,
    variable_id INTEGER,
    key TEXT NOT NULL,
    value TEXT,
    type TEXT
);

-- ============================================
-- 17. 自动快照规则表
-- ============================================
CREATE TABLE IF NOT EXISTS auto_snapshot_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    char_id INTEGER,
    room_id INTEGER,
    name TEXT NOT NULL,
    rule_type TEXT NOT NULL,  -- interval/turn_count/variable_change
    interval_minutes INTEGER, -- 间隔分钟（interval类型用）
    turn_count INTEGER,       -- 回合数（turn_count类型用）
    variable_key TEXT,        -- 监控的变量key（variable_change类型用）
    keep_count INTEGER DEFAULT 10,  -- 保留多少个自动快照
    is_active INTEGER DEFAULT 1,
    created_at INTEGER
);

-- ============================================
-- 18. 消息编辑历史表
-- ============================================
CREATE TABLE IF NOT EXISTS message_edits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    char_id INTEGER,
    room_id INTEGER,
    old_content TEXT,
    new_content TEXT,
    edited_at INTEGER
);
```

### 1.2 现有表扩展

```sql
-- 为messages表添加snapshot_id字段
ALTER TABLE messages ADD COLUMN snapshot_id INTEGER;

-- 为room_messages表添加snapshot_id字段
ALTER TABLE room_messages ADD COLUMN snapshot_id INTEGER;

-- 为messages表添加branch_id字段（支持分支）
ALTER TABLE messages ADD COLUMN branch_id TEXT;

-- 为room_messages表添加branch_id字段
ALTER TABLE room_messages ADD COLUMN branch_id TEXT;
```

---

## 二、变量系统架构设计

### 2.1 核心数据结构

```typescript
// src/lib/db.ts 新增类型定义

export type VariableType = 'number' | 'string' | 'boolean' | 'range';

export interface Variable {
  id?: number;
  char_id?: number;
  room_id?: number;
  name: string;
  key: string;
  type: VariableType;
  value: any;
  min_value?: number;
  max_value?: number;
  step?: number;
  is_persistent: boolean;
  is_visible: boolean;
  description?: string;
  created_at?: number;
  updated_at?: number;
}

export interface VariableStage {
  id?: number;
  variable_id: number;
  name: string;
  condition: string;  // 条件表达式，如 "value >= 50 && value < 80"
  priority: number;
  stage_prompt?: string;
  is_active: boolean;
  created_at?: number;
}

export interface VariableThoughtConfig {
  id?: number;
  char_id?: number;
  room_id?: number;
  preset_id?: number;
  model?: string;
  thought_prompt?: string;
  update_condition?: string;
  update_interval?: number;
  is_auto_update: boolean;
  created_at?: number;
}
```

### 2.2 变量工作流程

```
用户输入
    ↓
[可选] 触发变量思考API → 分析对话 → 更新变量
    ↓
评估变量阶段性配置 → 确定当前阶段
    ↓
生成阶段提示词注入
    ↓
替换变量模板（{{variable.key}}）
    ↓
LLM 调用
```

### 2.3 变量思考API设计

**思考提示词模板示例：**

```
你是一个专业的剧情分析师。请分析当前对话，更新以下变量：

当前对话历史：
{{recent_history}}

变量定义：
{{variables_definition}}

请以JSON格式输出需要更新的变量值：
{
  "updates": [
    {
      "key": "affection",
      "value": 65,
      "reason": "用户角色表现出了关心"
    }
  ]
}
```

### 2.4 后端API设计

新增文件：`functions/api/variables.ts`

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/variables` | GET | 获取变量列表 |
| `/api/variables` | POST | 创建变量 |
| `/api/variables` | PUT | 更新变量 |
| `/api/variables` | DELETE | 删除变量 |
| `/api/variables/stages` | GET/POST/PUT/DELETE | 阶段配置管理 |
| `/api/variables/thought` | POST | 触发变量思考 |
| `/api/variables/thought-config` | GET/POST/PUT | 思考配置管理 |

---

## 三、世界书机制深化方案

### 3.1 核心增强特性

| 特性 | 说明 |
|------|------|
| 正则匹配 | 除关键词外支持正则表达式 |
| 条件触发 | 支持变量判断、消息角色等复杂条件 |
| 优先级系统 | 可排序触发顺序 |
| 嵌套条目 | 支持父子层级结构 |
| 概率触发 | 设置触发概率 |
| 冷却机制 | 触发后N条消息内不重复 |
| 一次性使用 | 某些条目只触发一次 |
| 分类管理 | 支持标签分类 |
| 灵活注入位置 | before_system / after_system / last |

### 3.2 触发条件格式 (JSON)

```json
{
  "type": "and|or",
  "conditions": [
    {
      "type": "variable",
      "key": "affection",
      "operator": ">=",
      "value": 50
    },
    {
      "type": "role",
      "value": "user|assistant|any"
    },
    {
      "type": "message_count",
      "operator": ">",
      "value": 10
    },
    {
      "type": "custom",
      "expression": "some_js_expression"
    }
  ]
}
```

### 3.3 世界书扫描算法

```typescript
// src/lib/lorebook-engine.ts (新增)

export class LorebookEngine {
  constructor(private entries: LorebookV2[]) {}

  scan(
    input: string,
    history: Message[],
    variables: Record<string, any>,
    context: any
  ): LorebookV2[] {
    const triggered: LorebookV2[] = [];
    
    // 1. 过滤活跃条目
    const activeEntries = this.entries.filter(e => e.is_active);
    
    // 2. 按优先级排序
    activeEntries.sort((a, b) => b.priority - a.priority);
    
    for (const entry of activeEntries) {
      if (this.shouldTrigger(entry, input, history, variables, context)) {
        triggered.push(entry);
        this.updateTriggerState(entry);
      }
    }
    
    // 3. 处理嵌套
    return this.resolveNesting(triggered);
  }

  private shouldTrigger(
    entry: LorebookV2,
    input: string,
    history: Message[],
    variables: Record<string, any>,
    context: any
  ): boolean {
    // 实现触发判断逻辑
    // 支持关键词、正则、条件、概率、冷却等
  }

  buildInjection(triggered: LorebookV2[]): string {
    // 按position分组，构建注入内容
  }
}
```

### 3.4 后端API设计

升级现有 `lorebook.ts` 为 V2 版本，或新增 `lorebook_v2.ts`

---

## 四、快照式历史管理系统

### 4.1 核心概念

- **快照 (Snapshot)**：某一时刻对话状态的完整备份（消息 + 变量）
- **分支 (Branch)**：从某个快照分叉出的独立对话线
- **回滚 (Rollback)**：恢复到某个快照状态
- **自动快照**：按规则自动创建快照

### 4.2 快照创建流程

```
创建快照请求
    ↓
复制当前消息到 snapshot_messages
    ↓
复制当前变量值到 snapshot_variables
    ↓
记录快照元数据
    ↓
[可选] 生成缩略图（截取最后几条消息）
```

### 4.3 回滚流程

```
选择快照
    ↓
[可选] 创建当前状态的临时快照
    ↓
清空当前消息（标记或删除）
    ↓
从 snapshot_messages 恢复消息
    ↓
从 snapshot_variables 恢复变量
    ↓
更新角色/房间的 summary
```

### 4.4 分支功能设计

```typescript
// 消息结构扩展
interface MessageWithBranch extends Message {
  branch_id?: string;  // 分支标识
}

// 分支操作
interface BranchOperation {
  createBranch(fromSnapshotId: number, name: string): Promise<string>;
  switchBranch(branchId: string): Promise<void>;
  mergeBranch(branchId: string, targetBranchId?: string): Promise<void>;
  deleteBranch(branchId: string): Promise<void>;
  listBranches(): Promise<BranchInfo[]>;
}
```

### 4.5 后端API设计

新增文件：`functions/api/snapshots.ts`

| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/snapshots` | GET | 获取快照列表 |
| `/api/snapshots` | POST | 创建快照 |
| `/api/snapshots/:id` | GET | 获取快照详情 |
| `/api/snapshots/:id` | DELETE | 删除快照 |
| `/api/snapshots/:id/restore` | POST | 恢复快照 |
| `/api/snapshots/:id/branch` | POST | 从快照创建分支 |
| `/api/branches` | GET | 获取分支列表 |
| `/api/branches/:id/switch` | POST | 切换分支 |
| `/api/auto-snapshot-rules` | GET/POST/PUT/DELETE | 自动快照规则管理 |

---

## 五、前端 UI 改造方案

### 5.1 新增组件结构

```
src/components/
├── variables/
│   ├── VariableManager.tsx       # 变量管理面板
│   ├── VariableEditor.tsx        # 变量编辑器
│   ├── StageConfig.tsx           # 阶段配置
│   ├── ThoughtConfig.tsx         # 思考API配置
│   └── VariableDisplay.tsx       # 变量显示组件
├── lorebook/
│   ├── LorebookManagerV2.tsx     # 世界书V2管理器
│   ├── LorebookEntryEditor.tsx   # 条目编辑器
│   ├── ConditionBuilder.tsx      # 条件构建器
│   └── LorebookTree.tsx          # 树形视图
└── snapshots/
    ├── SnapshotManager.tsx       # 快照管理器
    ├── SnapshotViewer.tsx        # 快照查看器
    ├── SnapshotDiff.tsx          # 快照对比
    ├── BranchSelector.tsx        # 分支选择器
    └── AutoSnapshotConfig.tsx    # 自动快照配置
```

### 5.2 主界面改造

**侧边栏扩展：**

```
┌─────────────────┐
│ SimpleRP        │
├─────────────────┤
│ [●] 单人        │
│ [●] 剧场        │
│ [●] 生图        │
│ [●] 变量 🆕     │  ← 新增
│ [●] 世界书 🆕   │  ← 升级
│ [●] 快照 🆕     │  ← 新增
├─────────────────┤
│ 系统设置        │
└─────────────────┘
```

**对话区域增强：**

```
┌─────────────────────────────────────┐
│ [变量面板] [世界书状态] [快照]      │ ← 顶部工具栏
├─────────────────────────────────────┤
│                                     │
│      对话消息区域                   │
│                                     │
│  [回滚到这里] [从这里分支]          │ ← 每条消息操作
│                                     │
├─────────────────────────────────────┤
│ 输入框...                           │
└─────────────────────────────────────┘
```

### 5.3 变量管理器 UI

```
┌─────────────────────────────────┐
│ 变量管理                    [+] │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ 好感度: 65/100 [████████░░░] │ │
│ │   当前阶段: 友好             │ │
│ │   [编辑] [阶段配置]           │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ 心情值: 80                   │ │
│ │   当前阶段: 愉悦             │ │
│ │   [编辑] [阶段配置]           │ │
│ └─────────────────────────────┘ │
│                                 │
│ [思考API配置] [手动触发思考]    │
└─────────────────────────────────┘
```

### 5.4 世界书V2管理器 UI

```
┌─────────────────────────────────────┐
│ 世界书管理      [+添加] [分类] [搜索]│
├─────────────────────────────────────┤
│ ┌───┐  ┌─────────────────────────┐ │
│ │📁│  │ 条目名称: 皇宫设定        │ │
│ │📁│  │ 优先级: 50               │ │
│ │📁│  │ 关键词: 皇宫,大殿        │ │
│ │   │  │ 触发条件: [条件构建器]   │ │
│ │   │  │ 内容:                   │ │
│ │   │  │ [多行编辑器]             │ │
│ │   │  │ [保存] [预览触发]        │ │
│ └───┘  └─────────────────────────┘ │
│                                     │
│ 嵌套视图 / 列表视图 切换           │
└─────────────────────────────────────┘
```

### 5.5 快照管理器 UI

```
┌─────────────────────────────────────┐
│ 快照管理      [+创建快照] [自动规则] │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐ │
│  │ 📸 关键抉择点 (手动)          │ │
│  │    2024-01-15 14:30           │ │
│  │    25条消息                    │ │
│  │    [恢复] [查看] [分支] [删除] │ │
│  └───────────────────────────────┘ │
│  ┌───────────────────────────────┐ │
│  │ 📸 自动快照 #3 (每10回合)     │ │
│  │    2024-01-15 14:00           │ │
│  │    [恢复] [查看] [删除]        │ │
│  └───────────────────────────────┘ │
│                                     │
│ 分支: [主分支 ▼]                    │
└─────────────────────────────────────┘
```

### 5.6 新增状态管理

```typescript
// src/lib/store.ts (新增或扩展)

interface AppState {
  // ... 现有状态
  
  // 新增：变量相关
  variables: Variable[];
  variableStages: VariableStage[];
  variableThoughtConfig?: VariableThoughtConfig;
  
  // 新增：世界书V2
  lorebookV2: LorebookV2[];
  
  // 新增：快照相关
  snapshots: Snapshot[];
  currentBranchId?: string;
  branches: BranchInfo[];
  autoSnapshotRules: AutoSnapshotRule[];
}
```

---

## 六、LLM 调用流程升级

### 6.1 新的完整调用链

```typescript
// 伪代码展示新流程

async function enhancedChatFlow(
  char: Character,
  history: Message[],
  userInput: string,
  settings: Settings,
  model: string
) {
  // 1. 获取当前变量
  const variables = await api.variables.list(char.id);
  
  // 2. [可选] 触发变量思考更新
  if (shouldTriggerThoughtUpdate()) {
    await triggerVariableThought(char, history, userInput, variables);
  }
  
  // 3. 评估变量阶段
  const stagePrompts = evaluateVariableStages(variables);
  
  // 4. 扫描世界书V2
  const lorebookEngine = new LorebookEngine(lorebookV2Entries);
  const lorebookInjection = lorebookEngine.scan(
    userInput,
    history,
    variablesToMap(variables),
    { char, settings }
  );
  
  // 5. 构建完整提示词
  let systemPrompt = char.description;
  systemPrompt += buildStageInjection(stagePrompts);
  systemPrompt += lorebookEngine.buildInjection(lorebookInjection);
  
  // 6. 变量替换
  systemPrompt = replaceVariables(systemPrompt, variables, settings, char);
  
  // 7. 调用LLM
  const response = await llmClient.chatStream(
    char,
    history,
    userInput,
    settings,
    model,
    [], // 旧的lorebook
    { systemPrompt } // 新的完整提示词
  );
  
  return response;
}
```

---

## 七、实施阶段划分

### Phase 1: 数据库与基础设施 (优先级 P0)
1. 执行 schema 变更
2. 建立迁移脚本
3. 完善类型定义

### Phase 2: 变量系统 (优先级 P0)
1. 后端 API (`variables.ts`)
2. 变量管理 UI
3. 变量思考 API 集成
4. 阶段配置功能

### Phase 3: 世界书 V2 (优先级 P0)
1. 后端 API (`lorebook_v2.ts`)
2. `LorebookEngine` 核心逻辑
3. 世界书管理器 UI
4. 条件构建器

### Phase 4: 快照系统 (优先级 P0)
1. 后端 API (`snapshots.ts`)
2. 快照管理器 UI
3. 回滚与分支功能
4. 自动快照规则

### Phase 5: 集成与优化 (优先级 P1)
1. 整合所有功能到主流程
2. 性能优化
3. UI/UX 优化
4. 测试与 bug 修复

---

## 八、关键文件修改清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `schema.sql` | 修改 | 添加新表和字段 |
| `src/lib/db.ts` | 修改 | 新增类型定义和 API 客户端 |
| `src/lib/llm.ts` | 重写 | 集成新的变量和世界书逻辑 |
| `src/App.tsx` | 大幅修改 | 添加新功能入口和状态管理 |
| `functions/api/lorebook.ts` | 升级 | 或创建 lorebook_v2.ts |
| **新增** `functions/api/variables.ts` | 新建 | 变量 API |
| **新增** `functions/api/snapshots.ts` | 新建 | 快照 API |
| **新增** `src/lib/lorebook-engine.ts` | 新建 | 世界书核心引擎 |
| **新增** `src/lib/variable-engine.ts` | 新建 | 变量引擎 |
| **新增** `src/components/variables/*` | 新建 | 变量相关组件 |
| **新增** `src/components/lorebook/*` | 新建 | 世界书V2组件 |
| **新增** `src/components/snapshots/*` | 新建 | 快照相关组件 |

---

## 九、风险与注意事项

1. **向后兼容**：保留原有 `lorebook` 表和 API，逐步迁移到 V2
2. **数据迁移**：提供从旧世界书到新世界书的迁移工具
3. **性能考虑**：快照可能占用较多存储空间，设计清理策略
4. **UI 复杂度**：新增功能较多，注意保持界面简洁，可折叠面板
5. **测试覆盖**：重点测试回滚、分支、变量思考等复杂流程

---

## 十、后续扩展方向（可选）

- 变量导入/导出
- 世界书市场（分享模板）
- 快照导出为故事
- 多维度变量关系图
- AI 辅助变量配置生成
