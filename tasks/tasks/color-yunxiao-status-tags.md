# 为云效需求状态标签增加区分颜色

| Field | Value |
| --- | --- |
| Status | Completed (2026-10-29 17:11) |
| Artifacts | [Artifacts](../artifacts/color-yunxiao-status-tags/) |
| Kind | Task |

## Scope

仅调整需求列表状态标签的显示颜色。保留状态文字、列表图标、状态筛选、查询和鉴权逻辑。未知状态使用中性色回退。

## Task Summary

**YunXiao 扩展**：[csl-yunxiao](../../csl-yunxiao/) 为已实测的九种状态添加固定颜色映射，并将状态标签改为带颜色的 Raycast tag；内建颜色适配主题，已上线状态使用浅深色动态青色并开启对比度调整。

## Target
- [x] T1: YunXiao 需求列表中不同状态的标签使用可区分且一致的颜色，保留状态文字与现有查询筛选行为

## Result

- T1: 九种已实测visual状态使用固定区分色，标签保留statusLabel，未知状态回退SecondaryText。修改限定Color导入、STATUS_COLORS常量及tag显示对象，查询/筛选/鉴权不变。SDK类型文档确认内建色及动态light/dark/adjustContrast支持。check、lint、build通过，未运行测试套件；未人工验收浅深主题GUI。
- Review gate: Skipped — See Review Assessment for the recorded exemption
## Review Assessment

- Schema: task-review-assessment/v1
- Level: R1
- State: Current
- Reason: 单文件状态标签显示样式调整，不改变数据或控制流
- Snapshot: snapshot:tasks/artifacts/color-yunxiao-status-tags/evidence/54760354d320f84912e3c35d3694cd25d8eccb2474ab34e985c9912f594557b3.json#54760354d320f84912e3c35d3694cd25d8eccb2474ab34e985c9912f594557b3
- Evidence: T1的源码核对、SDK支持与类型检查/Lint/构建结果
- Result clarity: 用户确认不同状态标签区分颜色且保留文字和业务行为，九种已知状态独立映射
- Bounded impact: 仅List.Item accessories.tag颜色，对API、凭证、分页和筛选无修改
- Low risk: 视觉显示变更可恢复，未知状态中性回退；保留文字不单靠颜色表达状态
- Sufficient verification: TypeScript、Raycast lint、图标/清单检查和build通过，源码映射与已有实测状态键一致
- Task fingerprint: 24d2ed56898909fc74d936309defc3d5b1d2f7142f1aafde80a7d1e779f68deb

## Verification

- Passed: 构建后源码未改动，快照覆盖当前UI文件；check/lint/build和git diff --check通过。未运行测试套件，GUI配色效果需用户查看。
