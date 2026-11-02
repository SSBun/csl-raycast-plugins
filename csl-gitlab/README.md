# CSL-Gitlab

在 Raycast 中查看自己创建的 GitLab Merge Requests，支持 GitLab.com 和自托管实例。

## 本地运行

```sh
npm install
npm run dev
```

在 Raycast 中运行「My Merge Requests」，首次使用时填写扩展设置：

- **GitLab Base URL**：实例的完整 HTTPS 地址，默认 `https://gitlab.com`。支持实例子路径，例如 `https://gitlab.example.com/gitlab`，也兼容以 `/api/v4` 结尾的地址。请使用最终地址，不支持重定向。
- **GitLab Personal Access Token**：在 GitLab 用户设置的 Access Tokens 页面创建，授予 `read_api` 权限，然后填入密码型配置项。不要把 Token 写入源码或提交到 Git。

## 使用方式

- 默认展示当前 Token 所属用户创建的 MR，包含全部状态，按更新时间倒序排列。
- 向下滚动自动加载更多，每页 50 条；不是仅展示第一页。
- 搜索框通过 GitLab API 搜索标题和描述，涵盖尚未加载的 MR。
- 状态筛选支持全部、Open、Merged 和 Closed。
- 左侧平台图标优先根据仓库路径中的独立 `ios` / `android` 标记识别（如 `vip-ios`、`Team-iOS-Module`、`vip-android`），再参考标题中的 `[iOS]` / `[Android]` 标签；路径有歧义或无法识别时保留通用代码图标。图标继续使用 MR 状态颜色。
- MR 当前关联的最新 CI 明确为 `failed` 时，在右侧显示红色错误图标，悬停提示「最新 CI 失败」；Open/Merged 等 MR 状态标签保持独立。
- 回车在浏览器中打开 MR；操作菜单支持复制链接、刷新、Test Connection 和打开设置。
- `⌘R` 重新加载当前查询。

仅有权限访问、被指派给你或需要你评审的 MR 不会被列入，除非它也是你创建的。

## 缓存与刷新

- 最近成功获取的首屏 MR（第一页，最多 50 条）会保存在 Raycast 本地缓存中。再次打开同一查询时先显示缓存，同时后台获取最新结果；没有缓存时仍需等待网络。
- 后台获取成功后更新列表及首屏缓存。其余页面继续按需加载，不跨次运行持久化。
- 后台刷新失败时显示错误提示并保留可用的首屏缓存；可使用 `⌘R` 重试。
- 缓存按 GitLab 地址与 Token 的 SHA-256 配置摘要、搜索文本和状态筛选隔离，不把 Token 原文放入缓存键或缓存值。修改配置不会复用旧配置的缓存。
- 仅缓存 MR 标题、标识（包括查询 CI 所需的项目 ID）、链接、状态和更新时间等展示字段，不缓存完整 API 响应。缓存位于本机磁盘，不应视为加密存储，也可能被 Raycast 的 LRU 策略淘汰。
- CI 状态不写入持久缓存。已加载条目通过 MR 详情接口独立查询 `head_pipeline.status`（仅字段缺失时兼容旧版 `pipeline.status`），最多 4 个请求并发，不阻塞列表加载或分页。每次打开及手动刷新重新查询；不自动轮询。
- CI 无流水线、状态未知、运行中、取消、无权限、网络错误或格式无效时不显示红色错误图标。**没有错误图标不代表 CI 已通过**；MR 详情查询失败不会使整个列表加载失败。

## 测试连接

配置完成后，在 Raycast 中运行「Test Connection」，或在「My Merge Requests」的操作菜单中选择同名操作；列表为空或加载失败时也能使用。

验证会使用当前 Base URL 和 Token 请求与你创建的 MR 列表相同的只读 API。显示成功即表示地址可访问、认证有效且可以读取 MR；没有创建过 MR 也可验证成功。失败时显示具体原因，并可从提示中打开扩展设置。验证不修改远端数据，也不会显示 Token 或 MR 内容。

Raycast 原生扩展设置页不支持自定义测试按钮，因此使用独立命令和操作菜单入口。

## 安全与排查

扩展仅读取 MR；Token 只通过 HTTPS 请求的 `PRIVATE-TOKEN` 请求头发送至配置的实例，不跟随重定向，不写入 URL、源码或 MR 缓存。MR 展示字段会按上述策略持久化到本地；连接验证不读取或写入 MR 缓存。不支持 HTTP 地址，也不绕过自签名证书校验。

- **401**：检查 Token 是否有效、是否过期。
- **403**：检查 Token 权限和账户访问权限。
- **404**：检查 Base URL、实例子路径和 GitLab API 可用性。
- **429**：稍后刷新，避免继续触发限流。
- **连接失败**：检查网络、证书和地址是否发生重定向。

## 图标来源

iOS 与 Android 本地 SVG 标志来自 [Simple Icons](https://github.com/simple-icons/simple-icons)，采用 [CC0 1.0](https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md)。运行时不请求远端图标。

## 开发验证

```sh
npm run build
npx tsc --noEmit
npx eslint src
npx prettier --check package.json src README.md
```

真实账户的连通性、MR 内容和 Raycast 中的交互，需要在本机配置凭据后确认。
