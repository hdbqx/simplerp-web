
# SimpleRP Cloud 角色档案高阶编写指南 (V2.0)

SimpleRP Cloud 的角色档案 (`.json`) 远不止是一张静态的角色卡，它是一个**完整的动态沙箱逻辑包**。通过组合**多类型变量 (Variables)**、**阶段状态机 (Stages)**、**增强版世界书 (Lorebook V2)** 以及**宏注入监控台**，你可以超越单一的角色扮演，构建出包含多 NPC 追踪、系统外挂、动态跃迁的硬核上帝视角沙箱。

---

## Ⅰ. 核心规范：引用与映射 (References)

在手写或使用脚本生成 JSON 档案时，**绝对不要手动编写真实的数据库 ID (如 `id: 1`)**。
请全程使用 `ref`（自身引用标识）和 `parent_ref`（父级引用标识）作为唯一标识符。系统在导入时，会自动在底层数据库中创建全新的真实 ID，并根据这些 `ref` 完美重建变量阶段与世界书的父子树级关联。

---

## Ⅱ. 宏替换与沙箱注入系统 (Macro Injection)

在角色的基础设定（`description`）、开场白（`first_message`）、阶段提示词（`stage_prompt`）以及世界书内容（`content`）中，你可以使用宏标签。引擎会在最终组装 System Prompt 前对其进行热替换。

### 1. 内置系统宏
* `{{user}}`: 当前玩家设定的名字
* `{{char}}` 或 `{{char_name}}`: 当前扮演角色的名字
* `{{date}}`: 现实日期（如：2026/5/23）
* `{{time}}`: 现实时间（如：14:30:00）
* `{{weekday}}`: 现实星期（如：星期六）

### 2. 动态变量极速注入 (极度重要)
你可以直接将变量的 `key` 包裹在双方括号中进行实时数据注入。
**高阶用法**：对于复杂字典（Dict）或列表（List）变量，注入宏后，系统会将其转化为 JSON 字符串直接暴露给大模型。这使得你可以构建**“运行时对象状态监控台 (Runtime Monitor)”**。

*示例（写在 `description` 中）：*
```text
【当前活动 NPC 状态追踪网】
{{active_npc_network}}
※ 规范：你必须严格读取上述 JSON 数据，NPC 的所有行为反馈必须以上述数据（如好感度、当前装备、所受 Buff）为绝对锚点，严禁产生幻觉。

```

---

## Ⅲ. 变量与推演引擎 (Variables & Stages)

变量是沙箱运转的血液。除了基础的数值记录，它更是后台推演引擎与前端提示词联动的核心。

### 1. 变量基础字段

* `key`: 变量的唯一英文标识（用于宏替换和世界书条件判断，必须唯一）。
* `type`: 支持 `number`, `string`, `boolean`, `range`, `dict`, `list`。
* *进阶提示*：在多角色沙箱中，强烈建议使用 `dict` 追踪复杂状态（如角色池跃迁、技能等级表）。


* `description`: 给后台推演大模型看的**开发者审计指令**。在这里写明该变量的更新规则（例如：“当玩家声明使用技能时，必须将技能名追加到此字典的 unlocked_skills 数组中”）。

### 2. 阶段表现 (Stages) - 状态机的灵魂

阶段表现允许你在变量达到特定条件时，**动态地向 System Prompt 注入心理暗示或行为准则**。

* `condition`: 触发条件表达式。**必须使用 `v` 代表当前变量的值**（如 `v > 50`）。
* `priority`: 优先级（数字越大越优先判定）。
* `stage_prompt`: 条件满足时，无缝强力注入到 AI 提示词中的文本，直接改变演变轨迹。
* `effects`: 达到该阶段时触发的绝对数值副作用（如 `{"set": 100}`, `{"add": 10}`）。

---

## Ⅳ. 增强版世界书 (Lorebook V2)

对标顶级跑团引擎，支持深度扫描、多级匹配与 JS 条件拦截。在高级沙箱中，世界书不仅用于补充设定，更是“规则补丁”**和**“技能图鉴”。

### 1. 触发模式 (`trigger_mode`)

* `keyword` (关键词触发): 配合 `keywords` 和 `match_logic` 使用。
* `match_logic`: 支持 `any` (命中任一), `all` (全命中), `not` (均未命中), `expression` (自定义逻辑，如 `k0 AND (k1 OR k2)`)。


* `regex` (正则表达式): 高阶文本模式捕获。
* `constant` (常驻激活): 无视文本扫描，只要满足 JS 条件即刻注入。**常用于定义全局强制描写规范（拦截器）。**

### 2. 深度控制参数

* `scan_depth`: 往回扫描的历史消息轮数。
* `probability`: 触发概率 (0.0 ~ 1.0)。
* `cooldown_messages`: 触发后的冷却轮数，防止高频设定刷屏。
* `position`: 注入位置。`before_system` (最高权重系统级), `after_user` (直接影响 AI 判定), `before_ai` 等。

### 3. 终极拦截：条件表达式 (`trigger_condition`)

通过 JS 表达式实现世界书与变量的联动。系统暴露 `variables`, `history`, `context` 对象。

* *示例*：`variables.system_skills_profile.level >= 3 && history.length > 5`

---

## Ⅴ. 终极架构示例：系统流动态沙箱

以下展示了一个完美结合“复杂字典状态机”、“宏注入监控”与“规则型世界书”的高阶沙箱 JSON 结构：

```json
{
  "version": 1,
  "meta": {
    "format": "simplerp-character-archive"
  },
  "character": {
    "name": "末日生存系统沙箱",
    "description": "【世界观】\n这里是2030年，丧尸危机爆发。\n==================================================\n【RUNTIME OBJECT DATA MONITOR // 沙箱运行时状态监控】\n==================================================\n你作为沙箱演化引擎，必须严格感知以下由前端宏动态注入的实时状态：\n\n【1. 玩家资产与技能盘】\n{{player_session}}\n※ 规范：只有技能在此列表中，玩家才能使用。\n\n【2. 营地幸存者动态关系网】\n{{active_survivors}}\n※ 规范：你必须严格遵循 NPC 的感染度(infection)、信任度(trust)。\n\n【行为守则】你【绝对不允许】在输出文本中暴露任何 JSON 代码块！",
    "first_message": "【系统提示】绑定成功，末日求生开始。请输入指令或采取行动。",
    "summary": ""
  },
  "variables": [
    {
      "ref": "var_session",
      "name": "玩家资产与状态",
      "key": "player_session",
      "type": "dict",
      "value": {
        "unlocked_skills": ["洞察之眼", "初级治疗"],
        "inventory": ["半瓶矿泉水", "消防斧"]
      },
      "is_persistent": true,
      "is_visible": true,
      "description": "【审计指令】玩家获得物品或觉醒技能时，更新此字典对应的数组。"
    },
    {
      "ref": "var_survivors",
      "name": "已出场幸存者网络",
      "key": "active_survivors",
      "type": "dict",
      "value": {
        "林医生": {
          "is_active": true,
          "infection": 15,
          "trust": 40,
          "applied_buffs": ["饥饿"],
          "outfit_history": ["上装：染血的白大褂，下装：战术长裤"]
        }
      },
      "is_persistent": true,
      "is_visible": true,
      "description": "【审计指令】当新 NPC 登场，必须在此处初始化其档案。每次跨越时间线，必须更新 outfit_history 防止穿戏。"
    }
  ],
  "lorebook_v2": [
    {
      "ref": "lore_rule_1",
      "name": "【全局拦截器】换装与出场描写规范",
      "trigger_mode": "constant",
      "content": "【描写规范（必须绝对执行）】\n当任何角色首次露面，或跨越时间线后，你必须在文本开头进行三段式视觉描写：\n- 上装：材质/状态\n- 下装：类型/状态\n- 随身：武器或特殊物品",
      "priority": 100,
      "position": "before_system",
      "is_active": true,
      "is_constant": true
    },
    {
      "ref": "lore_skill_1",
      "name": "技能图鉴：洞察之眼",
      "trigger_mode": "keyword",
      "keywords": "技能,洞察之眼,探查",
      "match_logic": "any",
      "content": "【系统设定：洞察之眼】\n效果：玩家使用该技能时，你可以向玩家精准播报目标对象的隐藏数值（如：实际感染度、对玩家的真实隐秘想法），甚至透视其衣物下的伤口状态。",
      "trigger_condition": "variables.player_session.unlocked_skills.includes('洞察之眼')",
      "priority": 80,
      "position": "after_user",
      "is_active": true,
      "is_constant": false
    }
  ]
}

```

```

```