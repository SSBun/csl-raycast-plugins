# 新增云效我的 Bug 与任务命令

| Field | Value |
| --- | --- |
| Status | Completed (2026-10-29 19:04) |
| Artifacts | [Artifacts](../artifacts/add-yunxiao-bugs-and-tasks/) |
| Kind | Task |

## Target
- [x] T1: My Work Items 替代原需求命令，合并我负责及我参与的需求和分配给我的非 Bug 任务，完整分页、按类型与 ID 去重并明确区分类型
- [x] T2: 独立 My Bugs 命令完整展示分配给我的 Bug
- [x] T3: 两个命令均支持默认 All 状态筛选、状态配色、搜索、按账号和列表隔离的缓存、刷新及正确详情链接，复用自动鉴权且仅查询

## Scope

普通、设计、数据任务归入合并列表，Bug 独立展示；不新增写入云效数据的行为。不输出凭证，不改变 Chrome 自动登录优先级。

## Plan

1. 依据当前前端源码与实测确认 /api/v4/tasks 的类型、分页和分配人筛选。
2. 复用现有列表组件与鉴权逻辑，新增两个入口、类型化数据模型和按账号/列表隔离的缓存；替换原需求命令。
3. 类型检查、Lint、构建、真实只读客户端验证并独立审查；不运行测试套件。
- Current artifacts: csl-yunxiao 两个新入口、共享列表、扩展清单、客户端和 README；旧需求入口已移除。
- Next action: 冻结源码并独立审查，再最终验证。
- Required input: None

## Task Summary

**YunXiao 扩展**：[csl-yunxiao](../../csl-yunxiao/) 将原需求命令替换为 My Work Items，新增 My Bugs；复用共享列表与登录逻辑，接入分配给当前用户的普通/设计/数据任务和 Bug，全量分页、校验类型与经办人，按账号和命令隔离缓存。列表增加类型文字/图标、类型化 ID 和状态筛选，链接按需求或任务类型生成，更新中文说明。

## Result

- T1: 当前前端umi.3094a9b9.js及p__Task__index.66f8ea63.async.js确认assigneeId、类型1/2/4与Bug3。实际新客户端在Raycast Node26.12.1使用Chrome自动鉴权只读全量请求：work-items=365，需求202、任务163、Bug0，kind:id唯一365。经办人/类型逐项校验通过。My Work Items清单与bundle已生成，旧my-requirements源码和清单项已移除。
- T2: 实际新客户端scope=bugs全量分页取得655条，全部kind=bug，unique655，类型必须为3且经办人必须为当前账号，完整通过客户端校验。API /api/v4/tasks 使用groupType=5、50条页、pageNum、total；不传status，包含未完成与已完成。My Bugs清单和bundle已生成。
- T3: 共享列表源码保持All、配色、搜索、后台缓存/失败保留及刷新重新验证登录；cache参数为scope和userId，组件键同时含scope与账号，杜绝跨列表复用。状态键task/bug/visual分开，列表键kind:id。真实载荷均不含Token，详情链接域名固定且需求/任务路由检查全部通过。check/lint/build和diff --check通过。Chrome MCP连接失败，改用当前前端源码+直接GET验证；未运行测试套件，两个命令GUI、账号切换和缓存故障未人工实测。
- Review gate: Passed — 全新独立只读reviewer 03092fa1无确认问题，round-01已保存；主会话check-evidence核对7文件及报告哈希，并再次确认旧未跟踪入口不存在，补齐快照机械边界。GUI/换号/失败运行验证限制保留。
## Review Assessment

- Schema: task-review-assessment/v1
- Level: R2
- State: Current
- Reason: 新任务/Bug接口、两命令共享UI、跨类型ID及缓存隔离涉及完整性和保留行为
- Snapshot: snapshot:tasks/artifacts/add-yunxiao-bugs-and-tasks/evidence/5b8beb63b97a42d7ed75b3c1cada05ef1f45daa0024874e1253483bd44a30298.json#5b8beb63b97a42d7ed75b3c1cada05ef1f45daa0024874e1253483bd44a30298
- Evidence: T1-T3实际GET全量统计、源码与安装清单核对、check/lint/build；旧未跟踪入口缺失单独核对，GUI/故障未实测
- Task fingerprint: bbb7624f1b8a096b883afa772a96830dc83ea6acb8b0e158964a9d59b0f6d31b

## Review Reports

- Schema: task-review-reports/v1

| Round | Report | Snapshot | Outcome | SHA256 |
| --- | --- | --- | --- | --- |
| 01 | [Round 01](../artifacts/add-yunxiao-bugs-and-tasks/reviews/round-01.md) | snapshot:tasks/artifacts/add-yunxiao-bugs-and-tasks/evidence/5b8beb63b97a42d7ed75b3c1cada05ef1f45daa0024874e1253483bd44a30298.json#5b8beb63b97a42d7ed75b3c1cada05ef1f45daa0024874e1253483bd44a30298 | no blocking findings | 4bf024720de9d206c88513e4f2dbdc0bcdbe550579392bd4ee5d350e9c450f73 |

## Verification

- Passed: 独立审查后再次check/lint/build全部通过，当前7文件快照与报告check-evidence通过，旧需求入口不存在；重建安装清单仅My Work Items/My Bugs且两个bundle存在，diff --check通过。T1-T3实时GET结果对应未漂移客户端。未运行测试套件；GUI、换号和缓存故障未人工验收。
