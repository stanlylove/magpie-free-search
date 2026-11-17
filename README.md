# Magpie 免费搜索移植版

> **免责声明：**本项目是参考 [guotree/magpie-websearch](https://github.com/guotree/magpie-websearch) 接入方式制作的**非官方第三方移植／适配版**，并非该仓库的官方发布、直接 Fork 或由其作者维护。搜索能力另受 DDDMUC/dsh-free-search 启发；两个上游项目均不为本项目的功能、可用性或安全性背书。

## 中文介绍

这是一个**可直接下载安装的 Magpie 原生联网搜索插件**，不只是功能展示页。它提供 18 个独立搜索通道与 1 个聚合通道，直接由 Magpie 系统搜索调用，无需 MCP；研究、视频与天气等 11 个扩展工具默认关闭，可选择启用。支持失败回退、并发聚合、结果过滤和缓存，匿名来源无需 API Key，但可用性受服务商限流和网络环境影响。

本项目包含一个面向 Magpie 的免费多引擎搜索插件，以及用于了解功能、生成配置和下载安装包的网页工作台。插件受 [DDDMUC/dsh-free-search](https://github.com/DDDMUC/dsh-free-search) 启发，是**独立的部分移植**，并非原项目的官方 Magpie 版本。

## 快速开始

1. 在网页工作台的「安装指南」下载 `magpie-free-search-port.zip` 并解压。
2. 执行 `magpie plugin add /绝对路径/magpie-free-search-port`，或在 Magpie 的插件页面添加解压后的文件夹。
3. 在「设置 → 模型 → 联网搜索 → 搜索 API」添加 `magpie-free-search-port:free`，或直接添加单个引擎通道；Magpie 负责优先级与可选 Key。
4. 在「免费搜索」插件页面配置聚合源引擎、回退与过滤；保存后重新启用插件。扩展工具按需单独打开，默认不需要 MCP。

插件源码、详细工具列表、适配边界与安全提示见 [`public/plugin/README.md`](public/plugin/README.md)。网页工作台使用 Vite + React + TypeScript 构建，可用 `npm install`、`npm run build` 生成静态站点。实际搜索运行在 Magpie 的 Bun 插件主机，而不是网页工作台中。

## 上传到 GitHub

本仓库根目录是**网页工作台**（Vite 项目），可直接作为普通 Git 仓库上传；`npm ci && npm run check` 会运行 lint、插件测试和站点构建。根目录的 `package.json` 不是 Magpie 插件清单，**不要**对整个工作台仓库运行 `magpie plugin add github:用户名/仓库名`。

当前工作区已初始化为 `main` 分支，文件已暂存；先在 GitHub 创建空仓库，再用你自己的 Git 身份提交并推送网页工作台：

```sh
git status
git commit -m "发布 Magpie 免费搜索工作台"
git remote add origin https://github.com/你的用户名/你的工作台仓库.git
git push -u origin main
```

如果 Git 提示身份未设置，请先运行 `git config user.name "你的名字"` 和 `git config user.email "你的邮箱"`。`你的用户名`、`你的工作台仓库` 均需替换为你在 GitHub 创建的实际名称。

若想让别人用 `github:` **直接安装插件**，请在 GitHub 另建一个空仓库，把 `magpie-free-search-port.zip` 解压后的 `magpie-free-search-port/` 文件夹**内容**放到该仓库根目录（`index.mjs`、`package.json`、`page/`、`README.md`、`LICENSE`、`test.mjs`、`.gitignore`）。在这个文件夹里运行：

```sh
node --test test.mjs
git init -b main
git add .
git commit -m "发布 Magpie 免费搜索插件"
git remote add origin https://github.com/你的用户名/magpie-free-search-port.git
git push -u origin main
```

将 `你的用户名` 换成自己的 GitHub 用户名，推送前先在 GitHub 创建对应的空仓库。之后使用 `magpie plugin add github:你的用户名/magpie-free-search-port` 安装。不要把 API Key、`.env`、`node_modules/` 或站点构建产物提交到插件仓库；随包的 `.gitignore` 会排除常见的敏感文件与构建目录。

## 致谢

感谢 [guotree/magpie-websearch](https://github.com/guotree/magpie-websearch) 提供 Magpie 原生 `search` hook「一来源一 API」的开源实现参考；感谢 [DDDMUC/dsh-free-search](https://github.com/DDDMUC/dsh-free-search) 提供免费多引擎搜索、回退与聚合的设计参考。此项目独立维护，不代表两位作者或其仓库。
