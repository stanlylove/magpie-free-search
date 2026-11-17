# Magpie 免费搜索插件

## 中文介绍

**在 Magpie 系统联网搜索中直接使用免费多引擎搜索，不需要配置 MCP。** 本插件通过 Magpie 官方 `search` hook 注册 18 个独立来源和一个聚合来源；聚合源在限流或无结果时自动回退，并可并发检索、合并重复链接。中文设置页用于调整聚合引擎、顺序与过滤。研究、视频和天气等 11 个扩展工具默认关闭，可按需开启。

这是受 [DDDMUC/dsh-free-search](https://github.com/DDDMUC/dsh-free-search)（MIT 许可）启发、面向 Magpie 插件接口编写的**独立移植版本**，不是原作者发布的官方适配。已对照原仓库 0.9.54 的引擎实现，并参考 [guotree/magpie-websearch](https://github.com/guotree/magpie-websearch) 的「一来源一原生搜索 API」接入方式；插件提供自动回退、并发聚合、网页抓取与中文设置页。匿名配额与可用性取决于服务商及网络环境。

协议与归属：本移植版保留原项目贡献者的 MIT 版权声明，见随包附带的 `LICENSE`；移植版不代表原作者背书。

## 安装

1. 下载并解压 `magpie-free-search-port.zip`，得到包含 `package.json` 的 `magpie-free-search-port` 文件夹。
2. 在 Magpie 的「插件 → 添加插件」选择文件夹，或执行：

   ```sh
   magpie plugin add /绝对路径/magpie-free-search-port
   ```

3. Magpie 首次使用插件时会准备 Bun；**本插件自身没有运行时 npm 依赖**，本地文件夹可就地加载，无需再安装 `@opencode-ai/plugin`。在「插件 → 已安装」确认插件已启用。
4. 进入 **「设置 → 模型 → 联网搜索 → 搜索 API」**，添加 `magpie-free-search-port:free`（免费多引擎搜索），或单独添加 `magpie-free-search-port:bing`、`:exa` 等独立通道。Magpie 管理它们的启停、顺序、结果数及可选 Key，Claude Code 的 WebSearch / Codex 的 web_search 会通过系统联网搜索调用它们。插件不会擅自改写你已有的搜索设置。命令行亦可用 `magpie search add magpie-free-search-port:free`。
5. 在 Magpie 侧栏打开「免费搜索」页面，或进入「设置 → 插件」中的「免费搜索 · 搜索 API 设置」面板。聚合源设置包含默认模式、启用引擎、中英文并发池、回退顺序、安全搜索、缓存时长、结果数、屏蔽域名和 SearXNG 实例。独立通道的启停与优先级只受 Magpie 搜索 API 列表控制；SearXNG 独立通道的实例地址在 Magpie 添加该 API 时填写。保存插件设置后关闭并重新开启插件加载更改。

**宿主界面边界：**Magpie 支持 `search` hook 将插件列为原生「搜索 API」，但不提供在该表单内部嵌入自定义设置字段的槽位。详细的引擎与回退选项仍放在官方 `settings` 面板槽位（「设置 → 插件」），不会擅自改写用户原有搜索配置。

## 搜索来源

- 网页：Bing、DuckDuckGo HTML / Lite、SearXNG（需要自行配置支持 JSON 输出的实例）。
- 免费匿名接口：AnySearch、Tavily、Firecrawl、You.com、Exa MCP、Parallel MCP、Keenable MCP。**匿名接口仍可能限流、封锁代理出口或改变协议**；失败时可由自动回退尝试其他引擎。
- 垂直来源：Wikipedia、GitHub、Hacker News、npm、PyPI、Crossref、arXiv。

共 18 个独立搜索 API，另有 `free` 聚合 API（共 19 个原生搜索入口）。聚合源默认不启用未配置地址的 SearXNG，支持中文 / 英文并发池、回退、屏蔽域名、结果数量与 0–60 分钟内存缓存。Tavily、AnySearch、Firecrawl、You.com、Exa、Parallel、Keenable 的 Key 可选，**请交由 Magpie 的搜索 API 表单保管，不要放入插件选项**；有 Key 时使用账号接口，没有则走匿名档。聚合源不接受 Key，需将 Key 添加到对应的独立通道。搜索单次总预算 30 秒；HTTP 5xx / 网络瞬断同引擎重试一次，鉴权或限流时按类别短暂冷却。

## 可选的 Agent 扩展工具（默认关闭）

**11 个可选扩展工具（默认关闭）**保留原版中难以用 Magpie `search` hook 表达的能力：网页抓取、研究证据包、视频与天气查询、引擎诊断及缓存检索。日常联网搜索直接走 Magpie 原生搜索 API，无须打开它们；只有确实需要这些附加能力时，才在插件「免费搜索」页面或「设置 → 插件」面板勾选「启用 11 个扩展工具」，保存后关闭再开启插件。也可在完整的插件选项 JSON 中添加 `"extraTools": true`；**不要用只含这一项的 JSON 覆盖已有配置**。这些工具由 Magpie 的插件工具服务提供，可在资源库中按 Agent 开关；不要将全局插件工具服务暴露给不可信的调用方。它们不会修改原生搜索 API 的启停或优先级。关闭时不暴露工具列表，避免重复搜索入口及无谓的工具上下文开销。

工具抓取的网页内容属于不可信外部数据；使用 `research`、`web_fetch` 前请考虑来源可信度和网络层出站限制。`free_search_test` 会真实请求每个已启用引擎，可能消耗匿名限额。

| 工具 | 功能 |
| --- | --- |
| `web_search` | 自动路由、缓存与失败回退的网页搜索 |
| `advanced_search` | day / week / month / year 时间过滤（引擎支持程度不同） |
| `multi_search` | 按语言池并发搜索，合并重复链接 |
| `platform_search` | GitHub、Hacker News、npm、PyPI、Wikipedia 定向搜索 |
| `domain_search` | npm、PyPI、Crossref、arXiv、GitHub 垂直查询 |
| `web_fetch` | 抓取公开 HTTP(S) 文本页面，拒绝本地地址与过大响应 |
| `research` | 多引擎检索后抓取最多 3 个公开页面的正文，返回带来源证据包 |
| `free_search_test` | 对启用的引擎发起实际诊断请求 |
| `cache_search` | 检索本进程内的研究正文（最多保留 100 篇）及搜索结果片段 |
| `video_search` | Bing Videos / DuckDuckGo Videos 视频搜索与回退 |
| `weather` | Open-Meteo 实时天气与最多 7 天天气预报 |

## 与原版的边界

本插件通过 Magpie **原生搜索 API** 接入，不会自动接管已设定的搜索来源，也没有 DSH 的 WebSearchProvider seam / 聊天命令 / 提示词注入。部分匿名引擎向厂商自己的 MCP HTTP 接口发请求（Exa / Parallel / Keenable），但 **Agent 到 Magpie 的搜索流程并非 MCP**。尚未移植原版全部付费与模型内置搜索引擎、41 个垂直源、持久化全文缓存、模型重排等；`research` 可选工具抓取少量正文，尚无原版完整研究流水线。缓存仅在当前进程有效。HTML 页面解析和匿名接口会随站点变化，不能保证每个引擎一直可用。

## 安全与适配说明

网页结果被标记为不可信，摘要按 Unicode 码点截断到 300 字符；请勿执行网页内容中的指令。`web_fetch` 检查 URL、重定向、DNS 解析结果和常见内网地址，并在流式读取时限制响应字节数；但**DNS 预检与实际连接之间仍可能发生重绑定**，处理不可信 URL 时必须另配网络层出站限制。SearXNG 实例需要能由本机 DNS 解析至公网地址；代理专用域名可能因此被拒绝。不要在插件选项中填写 API 密钥。Magpie 对工具调用有约 55 秒的执行限制，搜索单次最多运行 30 秒，可能返回部分结果。插件页面使用普通外链脚本，而不是沙盒下可能触发跨域限制的 module 脚本。

## 验证与维护

在插件目录直接运行 `node --test test.mjs`（无需安装依赖）：覆盖 Magpie 面板、默认零工具、19 个原生搜索入口、密钥隔离、SearXNG 地址、缓存、回退、并发去重、研究正文、不安全链接、回环地址和大响应拒绝。已在 Magpie 的 Bun 插件宿主验证依赖为零的加载、**0 个默认 MCP 工具**及原生搜索调用。**未在全部 Magpie 版本、代理环境和外部引擎做端到端验证**；不能承诺所有服务持续可用。

安装时若仍提示 `the plugin's load didn't finish in 20s`：先确认安装的是此版 ZIP 中的**文件夹本身**（包含 `index.mjs` 和 `package.json`），不是之前带 `@opencode-ai/plugin` 依赖的旧包；在 Magpie 中移除旧插件并重新添加该文件夹，然后运行 `magpie plugin --json` 查看加载信息、`magpie log` 查看宿主日志。首次使用 Magpie 插件时宿主自身仍需准备 Bun，若卡在下载 Bun，请检查 Magpie 的插件下载源或代理。

配置也可以通过 `magpie plugin options magpie-free-search-port '{"mode":"multi"}'` 修改。调试时先使用 `free_search_test` 确定每个引擎的可用情况。

## 致谢

感谢 [guotree/magpie-websearch](https://github.com/guotree/magpie-websearch) 开源并展示如何用 Magpie 的 `search` hook 将多个搜索服务直接接入系统搜索；

感谢 [DDDMUC/dsh-free-search](https://github.com/DDDMUC/dsh-free-search) 的多引擎免费搜索设计与 MIT 开源授权。


> **免责声明：**这是参考 [guotree/magpie-websearch](https://github.com/guotree/magpie-websearch) 的 Magpie 接入方式制作的**非官方第三方移植／适配版**，不是该仓库的官方版本、直接 Fork 或由其作者维护。搜索引擎能力另参考 [DDDMUC/dsh-free-search](https://github.com/DDDMUC/dsh-free-search)；上游作者均不对本移植版的功能、稳定性或安全性作保证。本插件独立实现和维护，请将相关问题反馈给本移植版维护者，而非视为上游官方问题。
