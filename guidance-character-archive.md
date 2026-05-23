# Character Archive Guidance

## 目标

用一份 JSON 同时定义角色基础设定、变量联动和世界书规则。

## 格式

```json
{
  "version": 1,
  "meta": {
    "format": "simplerp-character-archive",
    "exported_at": "2026-05-23T00:00:00.000Z"
  },
  "character": {
    "name": "角色名",
    "description": "人设、背景、说话风格、禁忌、关系",
    "first_message": "第一句开场白",
    "summary": "长期记忆"
  },
  "variables": [
    {
      "name": "情绪值",
      "key": "mood",
      "type": "number",
      "value": 50,
      "default_value": 50,
      "min_value": 0,
      "max_value": 100,
      "step": 1,
      "is_persistent": true,
      "is_visible": true,
      "description": "角色当前情绪强度",
      "tags": "emotion",
      "stages": [
        {
          "name": "低落",
          "condition": "v < 30",
          "priority": 10,
          "stage_prompt": "角色语气变得克制、冷淡。",
          "effects": "{\"set\": 20}",
          "is_active": true
        }
      ]
    }
  ],
  "lorebook_v2": [
    {
      "name": "家族秘密",
      "trigger_mode": "keyword",
      "keywords": "家族,血脉,继承",
      "match_logic": "any",
      "content": "这是角色最隐秘的背景设定。",
      "trigger_condition": "variables.mood < 60",
      "priority": 100,
      "group_name": "核心设定",
      "category": "background",
      "position": "before_system",
      "probability": 1,
      "use_once": false,
      "cooldown_messages": 0,
      "scan_depth": 2,
      "is_active": true,
      "is_constant": false,
      "sort_order": 0
    }
  ]
}
```

## 角色字段

- `description` 是基础人设和表达风格。
- `first_message` 是无历史时注入的第一条消息。
- `summary` 是长期记忆，适合写关系、经历、身份变化。

## 变量字段

- `type` 支持 `number`、`string`、`boolean`、`range`、`dict`、`list`。
- `value` 是当前值，`default_value` 是重置值。
- `stages` 用来定义阶段联动。

### stage 说明

- `condition` 用 `v` 代表变量当前值。
- `stage_prompt` 会进入系统提示词，影响角色说话和行为。
- `effects` 是 JSON 字符串，可写 `set`、`add`、`multiply`。

## 世界书字段

- `trigger_mode` 支持 `keyword`、`regex`、`constant`。
- `match_logic` 支持 `any`、`all`、`not`、`expression`。
- `trigger_condition` 可访问 `variables`、`history`、`context`。
- `position` 决定注入位置。

## 导入规则

- 只要 JSON 满足上述结构即可导入。
- 导入会覆盖当前角色的基础设定、变量和世界书。
- 变量的 `stages` 会一起恢复。
- 你可以直接手写 JSON，不需要先在界面里逐项创建。
