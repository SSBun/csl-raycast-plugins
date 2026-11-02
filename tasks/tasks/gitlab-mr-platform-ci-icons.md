# 为 GitLab MR 增加平台图标与 CI 失败提示

| Field | Value |
| --- | --- |
| Status | Completed (2026-11-02 11:48) |
| Artifacts | [Artifacts](../artifacts/gitlab-mr-platform-ci-icons/) |
| Kind | Task |

## Scope

仅修改 GitLab 扩展。平台优先参考仓库路径，标题平台标签备用；不明确时保留通用图标。CI 仅明确 failed 时提示错误，未知/无流水线/查询失败不误报失败。保持 MR 列表、分页、搜索、缓存和打开行为，补充读取使用配置实例的 HTTPS GET 且不跟随重定向。

## Plan

1. 使用本地 SVG 平台标志；仓库路径优先识别，歧义回退，不下载运行时远端图标。
2. 独立查询各 MR 详情的 head_pipeline（字段缺失时兼容 pipeline）；限制并发，不阻塞列表首屏或分页，刷新/取消与账号变化正确隔离。
3. 自检字段校验、未知 CI 回退、图标资源与缓存最小字段，执行类型检查/Lint/构建及独立审查，不运行测试套件。
- Current artifacts: csl-gitlab 的列表、GitLab 客户端、README 和两个本地 SVG 平台图标。
- Next action: 冻结快照并独立审查，随后最终验证。
- Required input: None

## Task Summary

**GitLab 扩展**：[csl-gitlab](../../csl-gitlab/) 增加 iOS/Android 本地平台图标与仓库/标题识别，保留 MR 状态颜色和标签；按已加载 MR 独立读取 head pipeline，限制并发并支持取消和刷新，仅明确失败时显示红色错误图标。缓存补充项目 ID，不持久化 CI 状态；更新使用说明和图标来源。

## Target
- [x] T1: GitLab MR 列表左侧按所属平台显示 iOS 或 Android 图标，无法识别时保留通用图标
- [x] T2: MR 的最新 CI 失败时显示独立错误图标，保留原有 MR 状态及列表功能

## Result

- T1: 源码核对仓库references.full优先、同实例URL路径（剔除实例子路径）其次、标题平台标签备用；大小写无关的独立ios/android标记覆盖截图vip-ios、Team-iOS-Module、vip-android，不明确/冲突回退Icon.Code。Simple Icons CC0 SVG均解析为24×24单path，QuickLook栅格预览确认iOS字标和Android机器人，安装目录资源SHA与源一致。tsc、ESLint、build与diff --check通过，未GUI验收。
- T2: 对照GitLab官方 https://docs.gitlab.com/api/merge_requests/ 单MR详情的head_pipeline.status契约；源码仅GET配置实例projects/:id/merge_requests/:iid，验证MR身份，明确head_pipeline=null不回退，字段缺失才兼容pipeline。仅status===failed且非加载中显示红色XMarkCircleFilled，其他状态/错误/无权限为unknown。4并发且排队后检查取消；CI不写缓存，手动刷新与账号配置变化重挂载，列表分页查询和Test Connection不等待CI。tsc/ESLint/build通过。无可用环境变量GitLab凭证且Chrome MCP连接报transport错误，未进行真实私有CI请求或GUI验证；未运行测试套件。
- Review gate: Passed — 独立只读reviewer 40fed888无确认问题，round-01已保存；主会话check-evidence确认7文件及报告哈希一致，补齐机械快照证据。保留真实CI、GUI与异步运行验证限制。
## Review Assessment

- Schema: task-review-assessment/v1
- Level: R2
- State: Current
- Reason: 新增带凭证的逐MR详情请求与限流取消、CI状态边界，需检查保留列表行为及误报风险
- Snapshot: snapshot:tasks/artifacts/gitlab-mr-platform-ci-icons/evidence/96de992cbb669fec65046dc837a0524ad60bcc2429f1e0a13312e5cd863a3a92.json#96de992cbb669fec65046dc837a0524ad60bcc2429f1e0a13312e5cd863a3a92
- Evidence: T1-T2源码/官方REST契约、SVG预览与安装资源比较，tsc/ESLint/build通过；真实CI与GUI未实测，未运行测试套件
- Task fingerprint: 7f107833b3f04aace02900b1d124e0f6e882e4002174f32f60e8ff75fc7794ef

## Review Reports

- Schema: task-review-reports/v1

| Round | Report | Snapshot | Outcome | SHA256 |
| --- | --- | --- | --- | --- |
| 01 | [Round 01](../artifacts/gitlab-mr-platform-ci-icons/reviews/round-01.md) | snapshot:tasks/artifacts/gitlab-mr-platform-ci-icons/evidence/96de992cbb669fec65046dc837a0524ad60bcc2429f1e0a13312e5cd863a3a92.json#96de992cbb669fec65046dc837a0524ad60bcc2429f1e0a13312e5cd863a3a92 | no blocking findings | d614755c7249e7adf2db4a95704ed35bf0b41b4c1ab9ab0a7ce82aafe5449d42 |

## Verification

- Passed: 独立审查后重新tsc、ESLint、Prettier、build及diff --check全部通过；check-evidence确认7文件及报告哈希，安装目录2个SVG资源与受审查源文件一致。真实私有CI/GUI及异步运行场景未实测，未运行测试套件。
