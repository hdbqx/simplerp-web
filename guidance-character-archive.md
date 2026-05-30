# SimpleRP Cloud 角色档案 JSON 编写指南

这份文档的目标很直接：

你只需要参照这里，手写一个 `.json` 文件，再在前端选中一个角色并导入，就能建立一套可运行的复杂角色设定。

本文会尽量同时做到三件事：

1. 通俗
2. 准确
3. 详细

如果你以前接触过 SillyTavern、酒馆卡、世界书、变量系统，可以把它理解为：

- `character` 负责角色本体
- `variables` 负责动态状态
- `stages` 负责变量阶段规则
- `lorebook_v2` 负责条件注入设定

但要注意，SimpleRP 的导入不是“把整个数据库原样搬进来”，而是“把这份 JSON 解释成一套新设定，然后写入当前选中的角色”。

---

## 1. 先理解导入的真实行为

导入角色档案时，系统会做这些事：

1. 你必须先在前端新建一个角色，或者选中一个已有角色。
2. 你上传一个 JSON 文件。
3. 系统解析 JSON。
4. 系统更新当前角色的基础设定。
5. 系统删除这个角色原有的变量与世界书。
6. 系统根据 JSON 重新创建变量、阶段、世界书以及它们之间的关联。

这意味着两件很重要的事：

- 你不用写数据库里的真实 `id`、`char_id`、`parent_id`。
- 导入会覆盖当前角色的变量和世界书，所以请确认自己导入的是目标角色。

---

## 2. 哪些字段绝对不要手写

手写 JSON 时，不要写这些数据库字段：

- `id`
- `char_id`
- `room_id`
- `parent_id`
- `created_at`
- `updated_at`
- `last_triggered_at`
- 各种数据库内部计数列

原因很简单：

- 这些值是数据库用来建立真实关联的
- 你本地 JSON 里的旧数字，换个角色、换个库、换次导入就失效了
- 系统导入时会自动生成新的真实 ID

你真正应该手写的是这两类“逻辑标识”：

- `ref`：给当前条目起一个临时引用名
- `parent_ref`：让某个世界书条目指向另一个条目的 `ref`

可以把它们理解为“导入时用的别名”。

---

## 3. 角色档案的整体结构

一个合法的角色档案 JSON 大致长这样：

```json
{
  "version": 1,
  "meta": {
    "format": "simplerp-character-archive"
  },
  "character": {
    "name": "角色名",
    "description": "角色基础设定",
    "first_message": "开局第一条消息",
    "summary": "已有总结",
    "hidden_message_count": 0
  },
  "variables": [],
  "lorebook_v2": []
}
```

其中：

- `version`：目前固定写 `1`
- `meta.format`：固定写 `simplerp-character-archive`
- `character`：角色本体
- `variables`：变量列表
- `lorebook_v2`：增强版世界书列表

---

## 4. `character` 区块怎么写

### 4.1 字段说明

`character` 目前建议写这些字段：

- `name`
  - 角色名称
  - 导入时会覆盖当前选中角色的名字

- `description`
  - 基础设定 / 人设 / 世界观 /写作要求
  - 这是角色最核心的长期设定之一
  - 支持宏替换

- `first_message`
  - 首条消息
  - 当这个角色“当前没有历史消息”时，系统会自动把它作为对话历史的第一条消息写入，并显示在前端
  - 适合用来固定文风、开场状态、叙事视角、关系基调

- `summary`
  - 角色当前已有的总结
  - 如果你想导入一个已经“进行到中段”的设定，可以在这里预填总结

- `hidden_message_count`
  - 隐藏前多少条消息
  - 这是前端显示设置，不是删除
  - 被隐藏的消息仍然在数据库中
  - 只是不继续显示在聊天列表里
  - 它们如果没有被上下文截断，仍然可能发给 LLM

### 4.2 一个很重要的区别

`hidden_message_count` 和“上下文截断断点”不是一回事：

- `hidden_message_count`：只影响前端显示
- `context_cutoff_message_id`：影响发给 LLM 的上下文

而且当前导出 JSON 里：

- 会包含 `hidden_message_count`
- 不会包含 `context_cutoff_message_id`

这是有意如此，因为断点依赖具体消息 ID，不适合跨档案移植。

---

## 5. 宏替换：可以在设定里直接读变量

在这些文本字段中，你都可以使用宏：

- `description`
- `first_message`
- 变量阶段中的 `stage_prompt`
- 世界书中的 `content`

### 5.1 内置宏

- `{{user}}`：当前用户名称
- `{{char}}`：角色名
- `{{char_name}}`：角色名
- `{{date}}`：现实日期
- `{{time}}`：现实时间
- `{{weekday}}`：现实星期

### 5.2 变量宏

如果你有一个变量：

```json
{
  "key": "player_status"
}
```

那么你可以在设定里直接写：

```text
当前玩家状态：
{{player_status}}
```

系统会把这个变量当前值注入进去。

如果这个变量是：

- `dict`
- `list`

那么注入时通常会以 JSON 字符串形式呈现给模型。

这非常适合做“运行时状态面板”。

例如：

```text
你必须严格参考以下实时状态：
{{skills}}
不要捏造技能等级、技能名称或技能效果。
```

---

## 6. `variables` 区块怎么写

`variables` 是一个数组，每个元素代表一个变量。

最小例子：

```json
{
  "ref": "var_affection",
  "name": "好感度",
  "key": "affection",
  "type": "number",
  "value": 10,
  "default_value": 0,
  "is_persistent": true,
  "is_visible": true
}
```

### 6.1 变量字段总览

常用字段如下：

- `ref`
  - 导入用引用名
  - 建议必须写
  - 只在导入过程中使用，不会直接成为数据库真实 ID

- `name`
  - 前端显示名

- `key`
  - 变量唯一键名
  - 很重要
  - 宏替换、变量思考、世界书条件里通常都靠它识别
  - 同一个角色下不要重复

- `type`
  - 支持：
    - `number`
    - `string`
    - `boolean`
    - `range`
    - `dict`
    - `list`

- `value`
  - 当前值

- `default_value`
  - 默认值
  - 用于重置变量时恢复

- `min_value`
  - 主要给 `number` / `range` 使用

- `max_value`
  - 主要给 `number` / `range` 使用

- `step`
  - 步进值
  - 常用于滑条或增减控制

- `is_persistent`
  - 是否持久化
  - 一般建议写 `true`

- `is_visible`
  - 是否在变量界面可见

- `description`
  - 这是给 AI 或创作者看的说明
  - 实际上更接近“变量更新提示词”
  - 建议你写清楚：
    - 这个变量代表什么
    - 什么情况下要更新
    - 更新规则是什么
    - 严禁模型做什么

- `tags`
  - 纯标签文本
  - 方便你自己分类

- `stages`
  - 变量阶段数组
  - 可选

### 6.2 六种变量类型该怎么理解

#### `number`

普通数值。

适合：

- 好感度
- 金钱
- HP
- 理智值

示例：

```json
{
  "ref": "var_sanity",
  "name": "理智值",
  "key": "sanity",
  "type": "number",
  "value": 80,
  "default_value": 100,
  "min_value": 0,
  "max_value": 100,
  "step": 1,
  "is_persistent": true,
  "is_visible": true,
  "description": "角色遭遇超自然冲击时降低；获得安抚、休息或确认安全后可恢复。"
}
```

#### `string`

单段文本。

适合：

- 当前地点
- 当前身份
- 当前称呼
- 当前状态描述

#### `boolean`

布尔值，只能是 `true` 或 `false`。

适合：

- 是否觉醒能力
- 是否已触发事件
- 是否已暴露身份

#### `range`

本质上也是数值，但通常表示有上下限、适合滑动调节。

适合：

- 进度条
- 能量条
- 紧张度

#### `dict`

字典对象，是最强也最常用的复杂变量类型之一。

适合：

- 技能树
- 装备面板
- 多 NPC 状态表
- 复杂人物卡
- 分层成长系统

例如：

```json
{
  "ref": "var_skills",
  "name": "技能面板",
  "key": "skills",
  "type": "dict",
  "value": {
    "words": {
      "level": 5,
      "max_level": 5,
      "name": "常识修改",
      "description": "修改单一目标的常识认知"
    },
    "time_stop": {
      "level": 1,
      "max_level": 5,
      "name": "时停·三秒",
      "description": "暂停时间 3 秒"
    }
  },
  "default_value": {},
  "is_persistent": true,
  "is_visible": true,
  "description": "记录所有技能的当前等级、上限、正式名称与效果说明。等级变化时必须同步更新对应节点。"
}
```

#### `list`

数组列表。

适合：

- 背包列表
- 已见角色列表
- 已完成事件列表
- 状态效果列表

例如：

```json
{
  "ref": "var_inventory",
  "name": "背包",
  "key": "inventory",
  "type": "list",
  "value": ["钥匙", "短刀", "手机"],
  "default_value": [],
  "is_persistent": true,
  "is_visible": true,
  "description": "玩家获得物品时加入，丢弃或消耗物品时移除。"
}
```

### 6.3 关于 `description`，建议你这样写

很多人会把变量描述只写成一句“这是好感度”。

这远远不够。

更实用的写法应该像这样：

```text
这个变量表示女主对玩家的情感温度。
当玩家做出体贴、保护、理解、共情行为时，可以小幅上升。
当玩家做出背叛、侮辱、冷漠、强迫行为时，应明显下降。
不要因为普通对话就剧烈变化。
除非剧情出现重大转折，否则单次变化建议控制在 1 到 5 之间。
```

这种写法的好处是：

- 模型更知道如何更新
- 创作者回头看也更容易维护
- 以后做复杂联动时不容易自相矛盾

---

## 7. `stages`：变量阶段规则怎么写

你可以给一个变量附带多个阶段。

阶段的作用是：

当变量值满足某个条件时，自动向提示词追加对应规则或效果。

一个阶段示例：

```json
{
  "ref": "stage_broken",
  "name": "理智崩溃",
  "condition": "v <= 20",
  "priority": 100,
  "stage_prompt": "角色的思维开始混乱，对现实的判断能力显著下降，描写中要体现错觉、联想失控与极端情绪波动。",
  "effects": "{\"set\":20}",
  "is_active": true
}
```

### 7.1 字段说明

- `ref`
  - 阶段引用名
  - 建议写上

- `name`
  - 阶段显示名

- `condition`
  - 触发条件
  - 条件表达式里使用 `v` 表示当前变量值
  - 常见例子：
    - `v >= 50`
    - `v < 10`
    - `v === true`
    - `v.includes('觉醒')`

- `priority`
  - 优先级
  - 数字越大越优先

- `stage_prompt`
  - 条件满足时注入给模型的文本
  - 这是阶段最核心的部分

- `effects`
  - 阶段附带效果
  - 当前项目中通常以字符串形式存 JSON
  - 常见写法例如：
    - `{"set":100}`
    - `{"add":5}`

- `is_active`
  - 是否启用

### 7.2 阶段最适合做什么

适合做：

- 好感度不同阶段的人设变化
- 腐化度、堕落度、污染度的演变
- HP 不同区间的战斗状态
- 理智值不同区间的感知失真
- 权力、地位、信任度随数值变化带来的写作规则改变

不太适合做：

- 过于复杂的多变量联动逻辑
- 强依赖上下文文本的临时判断

那类情况更适合交给世界书条件或变量思考模块。

---

## 8. `lorebook_v2`：增强版世界书怎么写

`lorebook_v2` 是一个数组，每个元素是一条世界书。

最小例子：

```json
{
  "ref": "lore_city",
  "name": "城市设定",
  "trigger_mode": "keyword",
  "keywords": "雾城,主城区,旧城区",
  "match_logic": "any",
  "content": "雾城常年潮湿，旧城区街道狭窄，地下帮派活跃。",
  "priority": 10,
  "position": "before_system",
  "probability": 1,
  "use_once": false,
  "cooldown_messages": 0,
  "scan_depth": 2,
  "is_active": true,
  "is_constant": false,
  "sort_order": 0
}
```

### 8.1 世界书字段总览

常用字段如下：

- `ref`
  - 条目引用名
  - 建议必须写

- `parent_ref`
  - 父条目的引用名
  - 用于树状结构或分组结构
  - 它引用的是别的条目的 `ref`
  - 不是数据库 `parent_id`

- `name`
  - 条目名称

- `trigger_mode`
  - 触发方式
  - 支持：
    - `keyword`
    - `regex`
    - `constant`

- `keywords`
  - 关键词列表
  - 当前通常写成逗号分隔字符串
  - 例如：`"学院,学生会,会长"`

- `regex_pattern`
  - 正则表达式
  - 仅在 `trigger_mode = "regex"` 时使用

- `match_logic`
  - 关键词匹配逻辑
  - 支持：
    - `any`
    - `all`
    - `not`
    - `expression`

- `match_expression`
  - 当 `match_logic = "expression"` 时使用
  - 例如：`k0 AND (k1 OR k2)`

- `content`
  - 注入给模型的实际内容
  - 世界书最核心的字段

- `trigger_condition`
  - 额外条件表达式
  - 用于根据变量、历史等决定是否允许触发

- `priority`
  - 优先级，越大越靠前

- `group_name`
  - 分组名

- `category`
  - 分类名

- `position`
  - 注入位置
  - 目前支持：
    - `before_system`
    - `after_system`
    - `last`
    - `before_user`
    - `after_user`
    - `before_ai`
    - `after_ai`

- `insertion_depth`
  - 插入深度
  - 高阶参数，不确定时可以不写

- `probability`
  - 触发概率
  - `0` 到 `1`

- `use_once`
  - 是否触发一次后就停用

- `cooldown_messages`
  - 冷却消息数

- `trigger_count`
  - 触发计数
  - 一般不用手写，通常让系统自己维护

- `scan_depth`
  - 向前扫描多少条消息来判断触发

- `is_active`
  - 是否启用

- `is_constant`
  - 是否常驻
  - 常和 `trigger_mode = "constant"` 一起使用

- `sort_order`
  - 排序值

### 8.2 三种触发模式怎么选

#### `keyword`

最常用。

适合：

- 某角色名出现时补设定
- 某地点出现时补地理细节
- 某技能名出现时补技能规则

#### `regex`

适合精确文本模式匹配。

例如：

- 某种格式化命令
- 特殊口令
- 复杂关键词变体

#### `constant`

常驻注入。

适合：

- 全局写作规则
- 永久世界法则
- 不允许违背的叙事规范

例如：

```json
{
  "ref": "lore_rule_view",
  "name": "叙事视角规则",
  "trigger_mode": "constant",
  "content": "始终使用第三人称叙事，避免使用诗化排比，动作描写优先于心理独白。",
  "priority": 100,
  "position": "before_system",
  "probability": 1,
  "use_once": false,
  "cooldown_messages": 0,
  "scan_depth": 2,
  "is_active": true,
  "is_constant": true,
  "sort_order": 0
}
```

### 8.3 `trigger_condition` 能做什么

这是世界书最强的部分之一。

你可以让世界书不只是“看见关键词就触发”，而是“看见关键词并且满足某个变量条件才触发”。

例如：

```json
{
  "trigger_condition": "variables.skills?.time_stop?.level >= 1"
}
```

意思是：

只有当变量 `skills.time_stop.level >= 1` 时，这条世界书才真正允许注入。

再比如：

```json
{
  "trigger_condition": "variables.affection >= 60"
}
```

这很适合做：

- 高好感后才解锁的内幕
- 觉醒能力后才启用的技能说明
- 进入某阶段后才出现的隐藏世界规则

### 8.4 关于注入位置 `position`

这里很关键。

你可以粗略这样理解：

- `before_system`
  - 非常靠前
  - 适合高优先级规则、世界根规则、强设定

- `after_system`
  - 仍然属于系统层
  - 适合补充型规则

- `before_user`
  - 放在用户消息之前

- `after_user`
  - 放在用户消息之后
  - 常适合“针对当前用户输入”的辅助规则

- `before_ai`
  - 放在 AI 回复前
  - 对当前回复影响较直接

- `after_ai`
  - 放在 AI 回复后
  - 一般较少作为主要规则位置

- `last`
  - 最后注入

如果你不确定怎么选，实用建议是：

- 写作总规则：`before_system`
- 关键词补充设定：`after_user` 或 `before_ai`
- 对当前回合强约束的拦截规则：通常优先试 `after_user`

---

## 9. `parent_ref` 到底怎么用

如果你的世界书有父子结构，不要写：

```json
{
  "parent_id": 12
}
```

要写：

```json
{
  "ref": "lore_skill_time_stop",
  "parent_ref": "lore_skills_root"
}
```

例如：

```json
[
  {
    "ref": "lore_skills_root",
    "name": "技能总表",
    "trigger_mode": "constant",
    "content": "这是技能系统总规则。",
    "priority": 50,
    "position": "before_system",
    "probability": 1,
    "use_once": false,
    "cooldown_messages": 0,
    "scan_depth": 2,
    "is_active": true,
    "is_constant": true,
    "sort_order": 0
  },
  {
    "ref": "lore_skill_time_stop",
    "parent_ref": "lore_skills_root",
    "name": "时停说明",
    "trigger_mode": "keyword",
    "keywords": "时停,时间暂停",
    "match_logic": "any",
    "content": "时停技能初始可暂停 3 秒。",
    "priority": 80,
    "position": "after_user",
    "probability": 1,
    "use_once": false,
    "cooldown_messages": 0,
    "scan_depth": 2,
    "is_active": true,
    "is_constant": false,
    "sort_order": 1
  }
]
```

导入时系统会先创建所有条目，再根据 `parent_ref -> ref` 的关系回填真实父子关联。

---

## 10. 一个完整可导入的示例

下面这个示例可以直接作为模板参考。

```json
{
  "version": 1,
  "meta": {
    "format": "simplerp-character-archive"
  },
  "character": {
    "name": "都市异能沙箱",
    "description": "你正在扮演一套持续运转的都市异能世界。你必须严格参考实时变量，不能随意捏造玩家未持有的技能、物品或关系状态。\n\n【玩家技能面板】\n{{skills}}\n\n【玩家背包】\n{{inventory}}\n\n【主要 NPC 状态】\n{{npc_state}}\n",
    "first_message": "夜色刚刚压下城市的霓虹。你收到一条匿名短信：\"今晚 11 点前到旧港仓库，否则你会永远错过真相。\"",
    "summary": "",
    "hidden_message_count": 0
  },
  "variables": [
    {
      "ref": "var_affection",
      "name": "林雨晴好感度",
      "key": "affection_linyuqing",
      "type": "number",
      "value": 12,
      "default_value": 0,
      "min_value": 0,
      "max_value": 100,
      "step": 1,
      "is_persistent": true,
      "is_visible": true,
      "description": "表示林雨晴对玩家的信任与情感温度。普通交流只小幅变化。真正的保护、理解、帮助会提升；背叛、欺骗、侮辱会下降。",
      "tags": "npc,emotion",
      "stages": [
        {
          "ref": "stage_affection_high",
          "name": "高信任阶段",
          "condition": "v >= 70",
          "priority": 70,
          "stage_prompt": "林雨晴对玩家有较高信任，互动中可以自然表现出主动关心、透露更多隐私与配合行为。",
          "effects": "",
          "is_active": true
        }
      ]
    },
    {
      "ref": "var_inventory",
      "name": "玩家背包",
      "key": "inventory",
      "type": "list",
      "value": ["旧仓库钥匙", "一次性手套", "手机"],
      "default_value": [],
      "is_persistent": true,
      "is_visible": true,
      "description": "玩家获得物品时加入，消耗或遗失时移除。",
      "tags": "item"
    },
    {
      "ref": "var_skills",
      "name": "技能面板",
      "key": "skills",
      "type": "dict",
      "value": {
        "time_stop": {
          "level": 1,
          "max_level": 5,
          "name": "时停·三秒",
          "description": "暂停时间 3 秒"
        },
        "words": {
          "level": 3,
          "max_level": 5,
          "name": "常识修改",
          "description": "修改单一目标的常识认知"
        }
      },
      "default_value": {},
      "is_persistent": true,
      "is_visible": true,
      "description": "记录玩家已掌握技能及等级。技能升级、觉醒或失效时必须同步更新对应节点。",
      "tags": "system,skill"
    },
    {
      "ref": "var_npc_state",
      "name": "主要 NPC 状态",
      "key": "npc_state",
      "type": "dict",
      "value": {
        "林雨晴": {
          "mood": "警惕但好奇",
          "trust": 35,
          "location": "旧港附近",
          "secret_known": false
        }
      },
      "default_value": {},
      "is_persistent": true,
      "is_visible": true,
      "description": "跟踪主要 NPC 的位置、情绪、信任和秘密掌握情况，防止剧情穿帮。",
      "tags": "npc,state"
    }
  ],
  "lorebook_v2": [
    {
      "ref": "lore_global_style",
      "name": "全局叙事规则",
      "trigger_mode": "constant",
      "content": "场景描写要明确空间、动作与视线焦点。避免空泛抒情。战斗或对峙时优先写动作链与即时反应。",
      "priority": 100,
      "position": "before_system",
      "probability": 1,
      "use_once": false,
      "cooldown_messages": 0,
      "trigger_count": -1,
      "scan_depth": 2,
      "is_active": true,
      "is_constant": true,
      "sort_order": 0
    },
    {
      "ref": "lore_skills_root",
      "name": "技能系统总则",
      "trigger_mode": "constant",
      "content": "所有技能必须以变量面板中的实时数据为准，不能凭空新增玩家未持有的能力。",
      "priority": 90,
      "position": "before_system",
      "probability": 1,
      "use_once": false,
      "cooldown_messages": 0,
      "trigger_count": -1,
      "scan_depth": 2,
      "is_active": true,
      "is_constant": true,
      "sort_order": 1
    },
    {
      "ref": "lore_skill_time_stop",
      "parent_ref": "lore_skills_root",
      "name": "时停技能说明",
      "trigger_mode": "keyword",
      "keywords": "时停,暂停时间,时间停止",
      "match_logic": "any",
      "content": "当玩家发动时停时，当前阶段默认只能暂停 3 秒，且不能在停止时间内无限完成复杂长链行为。",
      "trigger_condition": "variables.skills?.time_stop?.level >= 1",
      "priority": 80,
      "position": "after_user",
      "probability": 1,
      "use_once": false,
      "cooldown_messages": 0,
      "trigger_count": -1,
      "scan_depth": 3,
      "is_active": true,
      "is_constant": false,
      "sort_order": 2
    },
    {
      "ref": "lore_old_harbor",
      "name": "旧港仓库设定",
      "trigger_mode": "keyword",
      "keywords": "旧港,仓库,仓储区",
      "match_logic": "any",
      "content": "旧港仓库区年久失修，夜里照明稀少，地面潮湿，集装箱之间形成大量视觉死角。",
      "priority": 40,
      "position": "before_ai",
      "probability": 1,
      "use_once": false,
      "cooldown_messages": 0,
      "trigger_count": -1,
      "scan_depth": 3,
      "is_active": true,
      "is_constant": false,
      "sort_order": 3
    }
  ]
}
```

---

## 11. 哪些内容不会跟着这个 JSON 走

这点非常重要。

角色档案 JSON 目前主要用于导入导出“设定结构”，而不是完整聊天存档。

通常不会作为角色档案一起迁移的内容包括：

- 当前聊天历史消息
- 消息编辑记录
- 快照 / 分支
- 上下文截断断点 `context_cutoff_message_id`
- 预设选择状态
- 模型选择状态
- 房间 / 群聊数据

所以你要把它理解为：

- 这是“角色设定包”
- 不是“整个运行存档包”

---

## 12. 和总结功能有关的注意事项

当前项目已经支持新的上下文管理方式。

你需要区分三个概念：

### 12.1 隐藏

- 字段：`hidden_message_count`
- 作用：前端不再显示前 X 条消息
- 不删除数据库
- 不自动影响 LLM 上下文

### 12.2 截断

- 作用：断点之前的消息不再发送给 LLM
- 它依赖具体消息 ID
- 因此当前不适合作为可移植 JSON 字段导出导入

### 12.3 总结

- 总结会基于“未被截断的历史”加上“已有总结”来继续归纳
- 提示词模板里现在已经支持：
  - `{{history}}`
  - `{{summary}}`

如果你在 `character.summary` 里预填内容，模型后续总结时会把这部分也纳入考虑。

---

## 13. 最常见的手写错误

### 错误 1：手写数据库 ID

错误：

```json
{
  "id": 15,
  "char_id": 1
}
```

问题：

- 这些值没有可移植性
- 还可能误导你自己

正确做法：

- 删除这些字段
- 用 `ref` 和 `parent_ref`

### 错误 2：变量 `key` 重复

问题：

- 宏替换和变量引用会混乱

正确做法：

- 同一角色下每个变量 `key` 唯一

### 错误 3：把复杂对象写成字符串

错误：

```json
{
  "type": "dict",
  "value": "{\"hp\":100}"
}
```

这会让结构变得别扭。

正确做法：

```json
{
  "type": "dict",
  "value": {
    "hp": 100
  }
}
```

### 错误 4：JSON 语法不合法

常见原因：

- 最后一项多了逗号
- 双引号写成单引号
- 对象少了逗号
- 列表或对象没有闭合

比如下面这个就是错的：

```json
{
  "a": 1,
  "b": 2,
}
```

### 错误 5：`description` 只写一句空话

错误：

```text
这是一个好感度变量。
```

更好的写法应该明确更新规则和边界。

### 错误 6：把 `parent_ref` 写成不存在的名字

如果你写了：

```json
{
  "parent_ref": "lore_root_xxx"
}
```

那么 `lore_root_xxx` 必须真的是某条世界书的 `ref`。

---

## 14. 手写 JSON 的实用建议

如果你准备手写一个复杂角色档案，推荐顺序是：

1. 先写 `character`
2. 再写基础变量
3. 再补变量 `description`
4. 再给关键变量加 `stages`
5. 最后写 `lorebook_v2`

实践上最稳的策略是：

1. 先在前端建一个简单角色
2. 导出一次 JSON
3. 以导出的结构为骨架修改
4. 再重新导入

这样你最不容易漏字段，也最不容易把格式写错。

---

## 15. 一句话总结导入规则

你可以把这套系统记成下面这句话：

“角色档案 JSON 写的是逻辑结构，不是数据库主键；写的是设定关系，不是历史存档。”

只要抓住这个核心，就不容易在导入导出时犯方向性错误。
