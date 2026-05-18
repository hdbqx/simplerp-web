# 数据库迁移指南 (v2 → v3)

本文档说明如何将数据库从 v2 版本升级到 v3 版本。

## 主要变更

### 新增表
- `variables` - 对话变量定义
- `variable_stages` - 变量阶段性表现
- `variable_thought_config` - 变量思考 API 配置
- `lorebook_v2` - 增强版世界书
- `snapshots` - 快照主表
- `snapshot_messages` - 快照消息数据
- `snapshot_variables` - 快照变量数据
- `auto_snapshot_rules` - 自动快照规则
- `message_edits` - 消息编辑历史

### 扩展表
- `messages` - 新增 `snapshot_id`, `branch_id` 字段
- `room_messages` - 新增 `snapshot_id`, `branch_id` 字段

## 迁移步骤

### 1. 备份现有数据库
在开始迁移前，请先备份您的数据库。

### 2. 运行迁移 SQL
使用以下命令运行 schema.sql：

```bash
# 本地开发
npx wrangler d1 execute simplerp-db --file=./schema.sql --local

# 生产环境
npx wrangler d1 execute simplerp-db --file=./schema.sql --remote
```

该操作是幂等的，使用 `CREATE TABLE IF NOT EXISTS`，不会丢失现有数据。

### 3. 数据迁移（可选）

#### 从旧世界书迁移到新世界书
可以通过 API 进行迁移：

```javascript
// 在浏览器控制台中运行
const migrateLorebook = async (charId) => {
  await fetch(`/api/lorebook-v2?action=migrate&char_id=${charId}`, { 
    method: 'POST' 
  });
};

// 为所有角色运行迁移
// 需要先获取角色列表
```

## 验证迁移

运行以下命令验证表是否创建成功：

```sql
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
```

应该看到以下表：
- characters
- messages
- settings
- lorebook
- lorebook_v2 (新)
- api_presets
- rooms
- room_members
- room_messages
- images
- variables (新)
- variable_stages (新)
- variable_thought_config (新)
- snapshots (新)
- snapshot_messages (新)
- snapshot_variables (新)
- auto_snapshot_rules (新)
- message_edits (新)

## 回滚

如果需要回滚，可以使用备份的数据库恢复。

注意：新创建的表数据将在回滚后丢失。
