# Tunnel 管理器（Node.js / Electron）

这是一个中文 GUI 管理器，用来统一管理：
- `cloudflared.exe`
- 你选择的本机应用（Ollama、SD WebUI 等）
- 内置日志面板（不弹黑终端）

## 功能

- 启动 / 停止 / 重启 Cloudflared
- 启动选中应用 / 停止选中应用 / 全部启停
- 勾选状态自动保存
- 配置文件热切换
- 日志在窗口内实时展示

## 使用

1. 编辑 `tunnel_manager.config.json`，填好真实路径
2. 双击运行 `start_tunnel_manager.bat`

首次运行会自动执行 `npm install`。

## 配置示例

```json
{
  "start_cloudflared_on_launch": false,
  "cloudflared": {
    "name": "Cloudflared",
    "command": "E:\\\\path\\\\cloudflared.exe tunnel run sdwebui",
    "cwd": "E:\\\\path"
  },
  "apps": [
    {
      "id": "ollama",
      "name": "Ollama",
      "enabled": true,
      "requires_cloudflared": true,
      "command": "ollama serve",
      "cwd": "C:\\\\"
    },
    {
      "id": "sdwebui",
      "name": "SD WebUI",
      "enabled": true,
      "requires_cloudflared": true,
      "command": "start.bat",
      "cwd": "E:\\\\apps\\\\webui"
    }
  ]
}
```

## 字段说明

- `start_cloudflared_on_launch`: 打开 GUI 后是否自动启动 cloudflared
- `cloudflared.command`: cloudflared 启动命令
- Token 模式建议：
  - `command`: `.\\cloudflared.exe tunnel run --token %CF_TUNNEL_TOKEN%`
  - `env.CF_TUNNEL_TOKEN`: 你的 token
- `apps[].requires_cloudflared`: 启动该应用前是否自动先启动 cloudflared
- `apps[].command`:
  - 字符串：用 shell 启动（适合 `.bat`）
  - 数组：直接启动（适合 `["ollama","serve"]`）
