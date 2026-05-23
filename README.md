# SimpleRP Cloud

一个轻量、纯粹、基于 Cloudflare 生态的全栈 AI 角色扮演与多智能体沙箱平台。

## ✨ 核心亮点

- 💬 **双对话模式**：支持沉浸式的「单人角色扮演」与支持多 AI 互动的「剧场群聊」模式。
- 🧠 **动态记忆**：内置世界书（Lorebook）系统与对话长线记忆自动总结功能。
- 🎨 **极速生图**：集成独立生图工作台，支持 OpenAI 兼容接口及 ComfyUI 本地内网穿透（Hugging Face 隧道）。
- ⚡ **Serverless 架构**：纯 Cloudflare 原生应用（Pages + Functions + D1 数据库），前端 React + Vite，轻松实现零成本高可用部署。

## 🛠️ 技术栈

- **前端**: React 19, TypeScript, Vite, Tailwind CSS, DaisyUI
- **后端 & 边缘计算**: Cloudflare Pages Functions
- **数据库**: Cloudflare D1 (SQLite)

## 🚀 快速开始

确保你已安装 Node.js 18+ 与 npm。

### 1. 克隆与安装

```bash
git clone [https://github.com/hdbqx/simplerp-web.git](https://github.com/hdbqx/simplerp-web.git)
cd simplerp-web
npm install

```
### 2. 初始化本地数据库
项目依赖 Cloudflare D1，本地开发前需要先将表结构写入本地 SQLite 模拟环境：
```bash
npx wrangler d1 execute simplerp-db --file=./schema.sql

```
### 3. 启动开发服务器
```bash
npm run dev

```
打开浏览器访问终端提示的本地地址（通常为 http://localhost:5173）即可使用。
## ☁️ 部署指南
本项目可一键部署至 **Cloudflare Pages**：
 1. 在 Cloudflare 面板创建一个新的 D1 数据库，并将其 ID 填入 wrangler.toml 中的 database_id。
 2. 运行 npx wrangler d1 execute simplerp-db --file=./schema.sql --remote 初始化线上数据库。
 3. 连接你的 GitHub 仓库到 Cloudflare Pages，构建命令填 npm run build，输出目录填 dist，并绑定 D1 数据库。
**安全提醒**：部署后，请务必在 Cloudflare Pages 的「Settings -> Environment variables」中配置 AUTH_USER 和 AUTH_PASS，以启用网页的基础密码访问保护。

## 角色档案导入导出

可导出并直接编辑 JSON 后再导入，格式如下：

```json
{
  "version": 1,
  "character": {
    "name": "角色名",
    "description": "人设/世界观",
    "first_message": "第一条消息",
    "summary": "长期记忆"
  },
  "variables": [],
  "lorebook_v2": []
}
```

导入会覆盖当前角色的基础设定、关联变量和关联世界书。
