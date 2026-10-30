# YunXiao

用于知乎云效的 Raycast 扩展，提供两个只读命令：

- **My Work Items**：合并「我负责的 + 我参与的」需求，以及分配给我的普通、设计和数据任务；替代原 My Requirements 命令。
- **My Bugs**：独立查看全部分配给我的 Bug，不混入需求与任务列表。

## 安装与运行

在本扩展目录执行：

```bash
npm install
npm run dev
```

随后在 Raycast 搜索 **My Work Items** 或 **My Bugs**（副标题均为 **YunXiao**）。需要能访问公司内网的网络或 VPN。

## 登录

**默认无需填写 Token**：先在本机 Chrome 或 Chromium 登录 `https://one.in.zhihu.com`，再运行命令。凭证按以下顺序选择：

1. 扩展设置中的密码类型 **YunXiao Token**（支持裸 Token 或 `Bearer ` 前缀）。
2. Raycast 进程环境中的 `YUNXIAO_TOKEN`。
3. Chrome/Chromium Local Storage 中的云效 Token。

终端中的环境变量不一定会被从 Dock 启动的 Raycast 继承。显式设置的 Token 失效时会报错，不会悄悄切换到浏览器的其他账号。

Token 来源：在 Chrome 登录 `https://one.in.zhihu.com`，打开开发者工具的 Application → Local Storage → `https://one.in.zhihu.com`，将 `token` 项的值直接填入 Raycast 扩展设置。不要将 Token 发到聊天、提交到 Git 或写入命令参数。

自动读取沿用 Yunxiao Skill 的方式，但不依赖本机安装该 Skill：将浏览器 Local Storage LevelDB 复制到权限为 `0700` 的临时目录，仅读取云效域名的 `token` 记录，用只读接口验证候选值，并在读取结束或取消时删除临时副本。不修改浏览器原始数据，不要求开启 Chrome 的 JavaScript Apple Events。

支持 `Default` 和 `Profile N` 配置。先检查 Chrome，再检查 Chromium；各浏览器优先最近使用/活跃的配置，然后是 Default 和其余配置。使用第一个验证成功的账号；多个配置登录不同账号时，可用手动 Token 指定账号。无法验证时会提示检查网络或重新登录云效。

原生 LevelDB 的 JavaScript 和 macOS arm64/x64 通用 N-API 二进制随扩展资源一起打包，不在运行时下载，不依赖开发目录或系统 Node。安装、构建和开发命令会生成这些资源；若安装时使用了 `--ignore-scripts`，直接调用 Raycast CLI 前需先执行 `npm run prepare-native`。

## 功能

- 合并需求时按需求 ID 去重；同时属于「我负责的」与「我参与的」时显示两个关系。任务和 Bug 按经办人筛选，不包括仅由我创建但分配给其他人的条目。
- 通过图标和类型文字区分需求、普通/设计/数据任务及 Bug；列表 ID 包含类型，避免不同类型的相同数字 ID 互相覆盖。
- 两个命令每次打开均默认 **All（全部状态）**，不向接口传状态限制，包括已完成记录；状态标签带颜色。合并列表的状态下拉区分「需求」和「任务」的状态。
- 首次加载完成所需范围的全部分页后展示列表，按更新时间降序排列；后续打开先确认当前账号，再显示该账号、该命令上次成功获取的列表，同时后台刷新。
- 状态选项来自完整列表中实际出现的状态，不硬编码状态集合；切换状态不重复请求。
- 搜索名称、类型、ID、负责人或经办人；回车打开对应类型的详情，可复制链接或刷新。
- 使用 Raycast 本地缓存保存完整成功结果的列表显示字段、状态选项和更新时间，以用户 ID 和命令范围共同隔离，Bug 与合并列表不会互相复用缓存；不缓存服务端完整响应、Token、鉴权会话或浏览器数据。缓存由 Raycast 管理，可能被回收。
- 后台或手动刷新失败时保留上次结果，列表标明「更新失败」和上次更新时间，并提示错误；空结果也可缓存。刷新成功后替换缓存，不保存失败或未完成的分页。
- 手动刷新仍重新检查登录；检测到账号切换后改用新账号缓存，不将新账号结果写入旧账号缓存。首次打开如果无法确认账号，不展示任何列表缓存，避免账号混用。
- Token 仅在本次命令内存中使用，Chrome 临时数据库副本读取后清理；手动 Token 仍由 Raycast 的密码设置管理。

## 接口与边界

仅向固定的 `https://one.in.zhihu.com` 发送带 `Authorization` 的 GET 请求，禁止跟随重定向，不创建或修改需求、任务或 Bug。

1. `GET /api/base/user/me` 获取当前用户。
2. 需求：`GET /api/prj/v1/epics/group` 分别使用 `owners` 和 `participants`；不传 `visualizeStatus`，分页使用 `startRow`、`endRow` 和 `pageInfo.total`，不依赖不准确的 `hasNextPage`。
3. 任务与 Bug：`GET /api/v4/tasks` 使用当前用户的 `assigneeId`、不分组的 `groupType=5`、`pageNum/pageSize` 和 `total`。任务类型为 `1,2,4`，Bug 为 `3`；不传 `status`，设置 `withSubTasks=true`。校验响应类型与经办人，异常筛选结果不展示。
4. 需求详情使用 `/epic/detail/{id}/tab/overview`；任务与 Bug 详情均使用 `/task/detail/{id}`。

遇到接口失败、响应格式变化、分页数量变化或重叠时，会提示刷新，不将半份结果当作完整列表；有缓存时仅保留标明更新时间的上次完整结果。每个需求范围最多 20,000 条，任务或 Bug 范围最多 50,000 条，超限明确报错，不静默截断。多个范围查询并非服务器事务快照；查询期间数据更新可能需要再次刷新。

## 开发检查

```bash
npm run check
npm run lint
npm run build
```

这些命令分别执行 TypeScript 检查、Raycast 清单/图标/代码检查，以及扩展构建，不执行测试套件。
