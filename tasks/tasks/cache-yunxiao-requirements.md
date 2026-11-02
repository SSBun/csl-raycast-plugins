# 缓存云效需求列表以加快首次渲染

| Field | Value |
| --- | --- |
| Status | Completed (2026-10-29 17:49) |
| Artifacts | [Artifacts](../artifacts/cache-yunxiao-requirements/) |
| Kind | Task |

## Scope

仅在本机缓存上次完整成功响应的列表显示字段、状态选项和更新时间，不缓存 Token、鉴权会话或完整服务端响应。首次打开先实时确认账号，失败不展示缓存；确认后使用用户 ID 隔离缓存并后台刷新。保留默认 All、状态配色、搜索和手动刷新重新验证登录的行为。

## Plan

1. 拆分账号确认与需求分页获取，鉴权仅保留内存。
2. 复用 Raycast useCachedPromise 持久缓存成功列表，按账号挂载；刷新失败保留上次结果并展示更新时间，刷新发现换号则切换账号组件且禁止旧键写入新数据。
3. 自检源码、SDK缓存及取消语义，执行类型检查/Lint/构建、真实只读客户端验证和独立审查，不运行测试套件。
- Current artifacts: csl-yunxiao/src/my-requirements.tsx、csl-yunxiao/src/lib/yunxiao.ts、csl-yunxiao/README.md。
- Next action: 冻结快照并执行独立只读审查，随后最终验证。
- Required input: None

## Task Summary

**YunXiao 扩展**：[csl-yunxiao](../../csl-yunxiao/) 拆分实时账号确认与列表获取，添加按用户 ID 隔离的 Raycast 成功结果缓存、后台刷新、失败时旧数据提示和更新时间；刷新重新识别账号，切换时替换列表组件。更新中文说明，保留配色、筛选、分页和 Chrome 鉴权逻辑。

## Target
- [x] T1: YunXiao 需求列表可使用上次成功获取的数据快速渲染，并刷新为最新结果
- [x] T2: 缓存不包含凭证且不跨账号混用，保留现有状态筛选及手动刷新行为

## Result

- T1: 源码及已安装SDK useCachedPromise/useCachedState/usePromise实现核对：缓存仅在完整Promise成功onData写入，缓存作为首帧data返回并后台执行；失败不写缓存且UI不再因error隐藏数据，显示失败/后台更新及fetchedAt。真实客户端拆分调用仍返回202唯一需求、9状态；本次身份确认2869ms、分页3930ms，缓存省去等待分页但首次仍需账号确认。check/lint/build通过。deeplink尝试未能观察到Raycast窗口，跨启动实际GUI缓存命中尚未人工验证，未运行测试套件。
- T2: 缓存hook参数仅userId，回包只含requirements/statuses/fetchedAt；鉴权使用非缓存usePromise。真实序列化载荷41396字节，所有需求字段均属显示字段，未包含完整或裸Token。显式凭证变化通过内存SHA键重挂载鉴权，账号ID不同重挂载列表；刷新重新验证登录，ID不匹配在分页和缓存写入前切换并抛出受控错误。SDK旧callId隔离与AbortController清理已查阅。筛选和状态颜色映射保留；切换账号、故障及GUI行为为源码核对而非运行时故障注入验证。
- Review gate: Passed — 独立只读reviewer 32a3608d无确认问题，round-01已持久化；主会话check-evidence确认5文件与报告哈希，补齐机械快照缺口。GUI缓存命中/切换/失败保留未实测限制保留。
## Review Assessment

- Schema: task-review-assessment/v1
- Level: R2
- State: Current
- Reason: 新增本地用户数据持久缓存及异步账号切换，需检查隐私隔离与失败保留语义
- Snapshot: snapshot:tasks/artifacts/cache-yunxiao-requirements/evidence/0af8946cceb11826eef443bc273b78f93bcead7b8a6de15bef18fe29b5c47a4e.json#0af8946cceb11826eef443bc273b78f93bcead7b8a6de15bef18fe29b5c47a4e
- Evidence: T1-T2源码/SDK语义核对、实时数据载荷字段检查与check/lint/build；GUI缓存命中及故障注入未实测
- Task fingerprint: a37caebf0909b971b2b209fcfdc26bcf298aa0b69be96eea6dfb2718a003c194

## Review Reports

- Schema: task-review-reports/v1

| Round | Report | Snapshot | Outcome | SHA256 |
| --- | --- | --- | --- | --- |
| 01 | [Round 01](../artifacts/cache-yunxiao-requirements/reviews/round-01.md) | snapshot:tasks/artifacts/cache-yunxiao-requirements/evidence/0af8946cceb11826eef443bc273b78f93bcead7b8a6de15bef18fe29b5c47a4e.json#0af8946cceb11826eef443bc273b78f93bcead7b8a6de15bef18fe29b5c47a4e | no blocking findings | 341c812920c5cd87e5cc6f3b2a5d3f19a948fa58133ae4d5c5bfd2e22a317376 |

## Verification

- Passed: 独立审查后check/lint/build全部再次通过，check-evidence核对当前5文件快照及round-01报告一致，git diff --check通过。实际数据载荷与SDK缓存语义证据对应未漂移源码；未运行测试套件，跨启动缓存GUI命中、切换与失败保留未人工验证。
