# 创建 YunXiao Raycast 扩展及我的需求命令

| Field | Value |
| --- | --- |
| Status | Completed (2026-10-28 15:25) |
| Artifacts | [Artifacts](../artifacts/create-yunxiao-raycast-extension/) |
| Kind | Task |

## Target
- [x] T1: 新增名为 YunXiao 的 Raycast 扩展，提供合并展示我参与的与我负责的需求的命令，并按需求 ID 去重
- [x] T2: 需求列表完整处理分页并可打开对应云效需求页面
- [x] T3: 提供状态筛选，默认 All，包含全部状态
- [x] T4: 未填写 Token 时，像 Yunxiao Skill 一样从本机 Chrome Local Storage 获取并验证云效 Token；保留手动 Token 覆盖及现有环境变量回退，不修改浏览器原始数据，不输出或持久化提取的凭证

## Scope

仅查询云效，不修改远端需求。用户已确认以我负责的替代我创建的。不输出凭证，不将凭证写入源码、日志或需求缓存；凭证优先级为手动 Token、进程环境变量、Chrome/Chromium 自动读取。浏览器数据仅复制到私有临时目录读取并清理，不修改原始数据。

## Plan

1. 使用已实测的 owners 与 participants 分别查询我负责和我参与的全部状态需求。
2. 独立 YunXiao 扩展接入手动/环境变量/Chrome 自动鉴权、分页、去重及状态筛选；LevelDB JS 和 macOS 通用 N-API 二进制通过构建脚本打包为运行资源，不依赖 Skill 或开发目录。
3. 执行类型检查、构建和允许的只读行为验证；不运行测试套件。鉴权及跨接口分页逻辑需要独立审查。
- Current artifacts: csl-yunxiao，含 Chrome 自动读取和 LevelDB 自包含资源构建脚本；安装资源已通过 Raycast 自带 Node 实测。
- Next action: 冻结当前快照，独立审查鉴权修正及保留行为，随后最终验证。
- Required input: None

## Result

- 已确认现有 GitLab 扩展使用 Raycast React List、TypeScript 和独立 package.json，可以沿用目录及构建约定。
- Chrome 当前需求页面只提供我负责的、我参与的、我关注的和我团队的页签；页面静态代码确认负责使用 owners，参与使用 participants。
- 在现有 group 接口中保留当前用户 participants，省略 visualizeStatus 后 total 为 202，证实此前状态集合不代表全部状态。
- 对 group 接口分别附加 creators、creatorId、createUserId、createdBy 的无效 ID 筛选进行有界只读检查，仍均返回 total=202，不能认定这些创建人参数有效。未枚举其他用户需求，未输出凭证。
- T1: 修正后实际客户端经esbuild转译，使用Raycast自带Node v22.23.4 arm64、安装目录资源、空Token执行真实只读请求：owned38、participating202、unique202，状态9种。清单YunXiao/My Requirements保持，check/lint/build通过。仅输出统计，不输出凭证或需求内容。
- T2: 修正后的自动鉴权实际客户端仍读取两范围全量分页，union202唯一ID；固定详情链接生成逻辑未改变。最终资源与安装目录SHA256逐项相同。Raycast GUI尚未人工操作，未运行测试套件。
- T3: 保持useState(all)默认、全量并集后本地筛选、动态状态及搜索逻辑；修正后实测状态9种，check/lint/build通过。GUI交互未人工验收。
- T4: 实际客户端空Token使用Chrome自动登录成功加载202条需求，Raycast自带Node v22.23.4 arm64可加载安装目录内独立LevelDB资源；无需开发node_modules或Skill。普通读取完成新增遗留临时目录0。静态检查优先级手动>环境变量>Chrome，精确origin/key、0700临时副本、finally关闭清理、GET /me验证候选，固定域名拒绝重定向。file确认原生资源含x64及arm64，实际执行仅验证arm64；未运行测试套件或GUI验收。
- Review gate: Passed — 全新独立只读reviewer b91346c1未发现确认问题，round-02已持久化。主会话check-evidence确认15文件快照与报告哈希，消除机械校验缺口；GUI/x64/故障注入限制仍明确披露。
## Task Summary

**YunXiao 扩展**：[csl-yunxiao](../../csl-yunxiao/) 新增独立 Raycast 扩展、My Requirements 命令、固定云效域名的只读鉴权客户端、全量分页与去重、默认 All 的状态筛选、搜索与详情操作，以及图标和中文使用说明。补充了 Chrome/Chromium Local Storage Token 自动读取、候选验证、临时副本清理，以及随扩展打包的原生 LevelDB 资源与第三方许可。未修改现有 GitLab 扩展。

## Review Assessment

- Schema: task-review-assessment/v1
- Level: R2
- State: Current
- Reason: 新增浏览器凭证读取与原生资源打包，涉及隐私、清理和运行时加载边界
- Snapshot: snapshot:tasks/artifacts/create-yunxiao-raycast-extension/evidence/5af107f5db9537587d38ce594b204a12b70d58a7d69e102db8306758faf7a0d3.json#5af107f5db9537587d38ce594b204a12b70d58a7d69e102db8306758faf7a0d3
- Evidence: T1-T4当前源码、Raycast实际Node+安装资源空Token读取Chrome实测、check/lint/build通过；未运行测试或GUI，未执行x64运行时
- Task fingerprint: 4a96a93059b001a0cdb6bd6ce25875f8c4a683315bc5ba0a978bc0221eaeecd6
## Review Reports

- Schema: task-review-reports/v1

| Round | Report | Snapshot | Outcome | SHA256 |
| --- | --- | --- | --- | --- |
| 01 | [Round 01](../artifacts/create-yunxiao-raycast-extension/reviews/round-01.md) | snapshot:tasks/artifacts/create-yunxiao-raycast-extension/evidence/0619ff1d44b47172eeefb128b2eded0d50de65b7f4c5534c046a796214a2e6cc.json#0619ff1d44b47172eeefb128b2eded0d50de65b7f4c5534c046a796214a2e6cc | no blocking findings | cac967fe9c50af77aba8b8954c4e5c24e93c29af1aa45aeb7b800d18f271fc2e |
| 02 | [Round 02](../artifacts/create-yunxiao-raycast-extension/reviews/round-02.md) | snapshot:tasks/artifacts/create-yunxiao-raycast-extension/evidence/5af107f5db9537587d38ce594b204a12b70d58a7d69e102db8306758faf7a0d3.json#5af107f5db9537587d38ce594b204a12b70d58a7d69e102db8306758faf7a0d3 | no blocking findings | 0c09d7b519a06be2f8fd2a63bb4934e141634d9efe2519a60efaccc39986b6fa |

## Verification

- Passed: 独立审查后重新check/lint/build全部通过，15文件快照和2份审查报告check-evidence通过；重建安装目录的3项原生资源哈希与快照对应源资源一致。T4真实空Token读取Chrome成功及清理证据仍对应当前源码。未运行测试套件；GUI、x64运行及故障注入未实测。
