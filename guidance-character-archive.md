# Character Archive Guidance

## How references work

Do not write database ids by hand.
Use `ref` and `parent_ref` as stable identifiers inside the JSON. The app creates new database ids during import and rebuilds all links automatically.

## Minimal example

```json
{
  "version": 1,
  "meta": {
    "format": "simplerp-character-archive"
  },
  "character": {
    "name": "角色名",
    "description": "人设、背景、说话风格、禁忌、关系",
    "first_message": "第一句开场白",
    "summary": "长期记忆"
  },
  "variables": [
    {
      "ref": "mood",
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
          "ref": "mood_low",
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
      "ref": "secret_1",
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

## Rules

- `ref` is the identity inside the archive file.
- `parent_ref` links lorebook entries together.
- On import, the app creates fresh DB ids and maps references automatically.
- You can edit the JSON by hand without knowing any database ids.
- Variable `stages` are restored after the parent variable is created.
- Lorebook links are restored after all entries are created.

## Meaning of fields

- `description`: persona, tone, background, taboo, relationships.
- `first_message`: shown as the first assistant message when there is no history.
- `summary`: long-term memory and relationship evolution.
- `stages.condition`: uses `v` as the current variable value.
- `stage_prompt`: enters the system prompt and influences style/behavior.
- `effects`: JSON string, usually `set`, `add`, or `multiply`.
- `trigger_condition`: can use `variables`, `history`, `context`.
- `position`: decides where lorebook text is injected.
