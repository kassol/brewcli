# BrewCLI

Homebrew 交互式 TUI 管理工具。

## 技术栈

- Runtime: Bun
- Language: TypeScript (strict)
- TUI: Ink (React for CLI) + React 19
- Build: `bun build --compile --target=bun` -> 单二进制
- Test: bun:test (74 tests)

## 目录结构

```
src/
├── index.tsx              # 入口，alt-screen 管理
├── app.tsx                # 根组件，页面路由 + 全局状态 + 键绑定
├── meta.ts                # 应用名/版本/描述元信息
├── theme.ts               # 颜色主题 (Catppuccin) + 布局常量
├── brew/                  # Homebrew CLI 抽象层
│   ├── types.ts           # brew JSON v2 类型定义
│   ├── executor.ts        # Bun.spawn 封装 + 超时/错误处理
│   ├── formula.ts         # Formula CRUD + deps/uses/pin
│   ├── cask.ts            # Cask CRUD
│   ├── service.ts         # brew services 操作
│   ├── tap.ts             # Tap 管理
│   ├── cleanup.ts         # cleanup/autoremove/doctor
│   ├── search.ts          # 搜索 (formulae + casks, min 2 chars)
│   └── index.ts           # 统一导出
├── components/            # 可复用 UI 组件
│   ├── Sidebar.tsx        # 分组侧边导航 (SidebarSection)
│   ├── Table.tsx          # 通用表格 (排序/滚动/多选)
│   ├── Tree.tsx           # 树形组件 (支持 Unicode 树形连接符)
│   ├── SearchBar.tsx      # 全局搜索弹层 (debounce 300ms)
│   ├── StatusBar.tsx      # 底部状态栏
│   ├── ConfirmDialog.tsx  # 确认对话框
│   ├── HelpOverlay.tsx    # 快捷键帮助弹层 (? 键)
│   └── Loading.tsx        # 加载/错误状态
├── pages/                 # 功能页面
│   ├── Dashboard.tsx      # 概览统计 (6 stat cards)
│   ├── Formulae.tsx       # Formula 列表 (intentional/deps 筛选)
│   ├── Casks.tsx          # Cask 列表 + 操作
│   ├── Outdated.tsx       # 独立的过期包视图
│   ├── Detail.tsx         # 包详情 (Info/Deps/Uses tabs)
│   ├── Services.tsx       # 服务管理
│   ├── Taps.tsx           # Tap 管理
│   └── Cleanup.tsx        # 清理维护 (dry-run 预览)
└── hooks/                 # React Hooks
    ├── useAsync.ts        # 通用异步数据加载
    └── useTerminalSize.ts # 终端尺寸响应

tests/
├── brew/                  # brew 抽象层集成测试
│   ├── executor.test.ts   # 执行器 + 缓存 + 错误处理
│   ├── formula.test.ts    # formula 操作
│   ├── cask.test.ts       # cask 操作
│   ├── service.test.ts    # service 操作
│   ├── tap.test.ts        # tap 操作
│   ├── cleanup.test.ts    # cleanup 操作
│   ├── search.test.ts     # 搜索
│   └── types.test.ts      # 类型兼容性验证
├── components/            # 组件逻辑测试
│   ├── tree.test.ts       # parseDepsTree 解析器
│   └── table.test.ts      # pad + scrollOffset 计算
└── hooks/
    └── useAsync.test.ts   # SWR 缓存 + 失效逻辑

.github/
└── workflows/
    ├── ci.yml             # macOS CI: typecheck + test + build
    └── release.yml        # tag 发布 + GitHub Release + Homebrew tap 更新

docs/
└── assets/                # README 截图与 demo GIF

scripts/
├── capture_demo.py        # 生成 README 截图/GIF
└── render_homebrew_formula.py # 生成 tap formula

README.md                  # 对外项目说明
CONTRIBUTING.md            # 贡献约定
LICENSE                    # MIT 许可证
```

## 常用命令

```bash
bun run dev          # 开发运行
make build           # 编译单二进制
make install         # 安装到 /usr/local/bin
make typecheck       # 类型检查
make test            # 运行测试
```

## 架构要点

### Brew 抽象层
- 通过 `Bun.spawn(["brew", ...args])` 调用 brew CLI
- JSON 输出优先 (`--json=v2`)，文本输出按行解析
- 内置 TTL 缓存 (默认 30s)，操作后自动 `clearCache()`
- 统一超时管理 (默认 60s，安装/升级 300-600s)

### UI 架构
- 单根 `<App>` 组件管理全局状态 (page, mode, focus)
- Mode: normal | search | detail | confirm | help
- Focus: sidebar | main，通过 Tab/h/l 切换
- `useInput({ isActive })` 实现焦点级键绑定隔离
- 全屏模式：alt-screen buffer + cursor 隐藏
- Sidebar 分组：Packages / Updates / System 三个区域
- 支持 `--help` / `--version`，非交互终端直接报错退出

### 数据流
- 每个页面独立管理数据加载 (`useAsync` SWR hook)
- `useAsync` 支持模块级缓存、TTL 过期后台刷新、`refreshing` 状态、手动刷新
- 操作 -> 确认对话框 -> 执行 -> 通知 (3s 自动消失) + `invalidateCache()` 广播失效
- 页面间通过 App 的回调函数通信

### Cork 参考的 UX 特性
- Formulae 区分主动安装 / 依赖安装 ([t] 键切换 all/intentional/dependency)
- 列表显示包描述 (name - truncated_desc)
- 独立的 Outdated 页面 (installed -> available 版本对比)
- 快捷键帮助弹层 ([?] 键)
- Sidebar 分组 header

## 全局规范

- 所有 brew 交互通过 `src/brew/` 抽象层，禁止页面直接 spawn
- 组件通过 props 接收 `isFocused`，控制键绑定激活
- 类型严格：`strict: true`，无 any
- 错误处理：BrewError 包含 command, exitCode, stderr
- 测试：所有 brew 模块 + 纯逻辑组件 + 工具函数

## 变更日志

- 2026-03-18: 增加截图/GIF、Release 工作流、Homebrew tap 发布链路
- 2026-03-18: 增加 README / CONTRIBUTING / LICENSE / GitHub Actions CI，补齐仓库元信息
- 2026-03-18: 增加 SWR 缓存/自动刷新/手动刷新，测试扩展到 74 项
- 2026-03-18: 参考 Cork 优化 UI/UX，新增 Outdated/Help 页面，完整测试套件 (68 tests)
- 2026-03-17: 初始版本，全功能实现
