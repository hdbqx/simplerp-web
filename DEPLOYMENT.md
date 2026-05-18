# SimpleRP v2 部署与迁移指南

## 📋 环境准备

确保您的系统已安装：
- Node.js 18+
- Git
- Wrangler CLI (`npm install -g wrangler`)
---
`

## 🗄️ 1. D1 数据库迁移

### 方式一：使用 wrangler 命令行

```bash
# 登录 Cloudflare 登录
wrangler login

# 执行 schema.sql 到生产数据库
wrangler d1 execute simplerp-db --file=./schema.sql --remote
```

### 方式二：通过 Cloudflare Dashboard

1. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Workers & Pages > D1 > simplerp-db
3. 点击 **Console**
4. 复制并执行 `schema.sql` 中的 SQL 语句
5. 逐段执行所有 CREATE TABLE 语句

## 📝 2. Git 提交与推送

```bash
# 检查当前 git 状态
git status

# 添加所有更改
git add .

# 提交更改
git commit -m "v2大更新"

# 推送到 GitHub 仓库
git push
```

## 🚀 3. Cloudflare 自动部署

推送成功后，Cloudflare Pages 会自动：
1. 检测到新的提交
2. 自动开始部署新版本
3. 使用 Pages Functions 部署

## 📊 项目变更摘要

### 新功能列表

1. **对话变量系统
2. 变量阶段化表现
3. 变量思考 API
4. 世界书 v2（增强）
5. 快照式历史管理
6. 对话分支

### 新增文件

详见 `UPGRADE_PLAN.md` 和代码

## 🎉

## 🔧 验证安装依赖（可选）

如果是全新部署环境：

```bash
# 安装依赖
npm install

# 本地开发预览
npm run dev
```
