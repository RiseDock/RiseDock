# 启程典 (RiseDock)

<p align="center">
  <img src="./public/logo.png" width="600" alt="启程典">
</p>

<p align="center">
  <strong>场景化工作环境启动工具</strong> — 按工作、生活场景分组管理应用程序，一键批量启动，告别桌面混乱
</p>

## 功能总览

### 场景管理
- 🗂 **多场景分组** — 按工作/学习/生活等场景分类管理启动项
- ✏️ **场景编辑** — 创建、重命名、删除场景
- 🃏 **场景卡片** — 首页卡片式展示所有场景，快速预览和启动
- ⌨️ **场景快捷键** — 每个场景可绑定独立全局快捷键，一键切换
- 📤 **导入导出** — 备份和恢复场景数据（JSON 格式）

### 启动项管理
- ⚡ **5 种类型** — 支持应用程序、文件、文件夹、网址、图片
- 📌 **置顶固定** — 常用启动项置顶显示，可折叠置顶区域
- ✅ **启用/禁用** — 独立开关控制每个启动项是否参与批量启动
- 🔄 **拖拽排序** — 自由拖动调整启动项顺序
- 📦 **批量添加** — 支持批量选择文件或文件夹一次性添加

### 快速启动
- 🚀 **单项启动** — 点击即可启动应用、打开文件或网址
- 💥 **批量启动** — 一键启动场景内所有已启用的启动项，支持自定义启动延迟
- 🔍 **进程检测** — 自动检测目标进程是否已运行

### 全局搜索
- 🔎 **Ctrl+K 搜索** — 全局快捷键呼出搜索面板
- 🏷️ **多关键词** — 空格分隔，同时搜索场景名称和启动项名称/路径
- 📂 **分组结果** — 按场景分组展示，快速定位
- ⌨️ **键盘导航** — ↑↓ 选择、Enter 跳转、Esc 关闭

### 授权系统
- 🔑 **机器码绑定** — 基于 CPU/主板/磁盘硬件指纹，一机一码
- 🛡️ **HMAC-SHA256 签名** — 授权文件防篡改验证
- 📅 **有效期管理** — 授权到期自动检测，支持续期升级
- 🆓 **免费使用** — 免费版支持 1 个场景、每场景 3 个启动项

### 界面与体验
- 🪟 **无边框窗口** — 自定义标题栏，最小化/最大化/关闭
- 📌 **系统托盘** — 关闭窗口最小化到托盘，托盘菜单快速操作
- 🖱️ **右键菜单** — 启动项右键菜单：启动、编辑、复制路径、置顶、删除
- 🎨 **现代化设计** — Tailwind CSS v4，简洁清爽的界面风格
- 🔔 **Toast 通知** — 操作反馈即时提示

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | React 18 + TypeScript | UI 构建 |
| 构建工具 | Vite 5 | 前端打包 |
| 桌面框架 | Tauri 2.0 | 跨平台桌面应用 |
| 后端语言 | Rust | 系统级操作 |
| 状态管理 | Zustand | 前端全局状态 |
| 样式方案 | Tailwind CSS v4 | 原子化 CSS |
| 数据库 | SQLite | 本地持久化存储 |
| 拖拽库 | dnd-kit | 启动项排序 |
| 打包工具 | NSIS | Windows 安装包 |

## 安装

1. 从 [Releases](../../releases) 下载最新版 `RiseDock_x.x.x_x64-setup.exe`
2. 运行安装程序，按提示完成安装
3. 从桌面快捷方式启动启程典

> Windows 10 及以上系统，无需管理员权限

## 从源码构建

### 环境依赖

| 工具 | 版本要求 | 说明 |
|------|----------|------|
| Node.js | 18.x+ | JavaScript 运行时 |
| Rust | 最新稳定版 | 系统编程语言 |
| VS Build Tools | 2022+ | C++ 编译工具链（Windows） |
| WebView2 | 最新版 | 内嵌浏览器（Win10/11 通常已自带） |

### 编译步骤

```bash
# 1. 克隆项目
git clone https://github.com/RiseDock/risedock.git
cd risedock

# 2. 安装前端依赖
npm install

# 3. 开发模式运行
npm run tauri dev

# 4. 发布模式打包
npm run tauri build
```

构建产物位于 `src-tauri/target/release/bundle/nsis/`。

## 项目结构

```
risedock/
├── src/                    # 前端源码
│   ├── components/         # UI 组件
│   │   ├── App.tsx         # 主应用（标题栏、快捷键、搜索）
│   │   ├── Sidebar.tsx     # 侧边栏（场景列表）
│   │   ├── SceneEditor.tsx # 场景编辑器（启动项管理）
│   │   ├── EmptyState.tsx  # 首页（品牌展示 + 场景卡片）
│   │   ├── SortableItem.tsx# 可拖拽启动项行
│   │   ├── ContextMenu.tsx # 右键菜单
│   │   ├── SearchModal.tsx # 全局搜索面板
│   │   ├── HotkeyModal.tsx # 快捷键录入
│   │   ├── LicenseModal.tsx# 授权管理
│   │   ├── HelpModal.tsx   # 帮助文档
│   │   ├── Toast.tsx       # 通知提示
│   │   └── ConfirmDialog.tsx# 确认对话框
│   ├── stores/             # Zustand 状态管理
│   ├── services/           # 数据库服务
│   └── App.css             # 全局样式
├── src-tauri/              # Tauri/Rust 后端
│   ├── src/
│   │   ├── commands/       # Tauri 命令
│   │   │   ├── launcher.rs # 启动执行
│   │   │   ├── license.rs  # 授权验证
│   │   │   └── storage.rs  # 数据存储
│   │   └── crypto/         # 加密模块
│   │       ├── machine_code.rs # 机器码生成
│   │       └── license_key.rs  # 授权签名
│   └── tauri.conf.json     # Tauri 配置
├── public/                 # 静态资源
├── package.json
└── README.md
```

## 交流群

<p align="center">
  <strong>扫码加入启程典官方微信交流群</strong>
</p>

<p align="center">
  <img src="./public/risedock_wechat_qrcode.jpg" width="300" alt="启程典官方交流群">
</p>

<p align="center">
  反馈问题、提建议、交流使用心得，欢迎进群聊 🎉
</p>

## 授权

本项目基于 [MIT License](LICENSE) 开源。

Copyright (c) 2026 启程典
