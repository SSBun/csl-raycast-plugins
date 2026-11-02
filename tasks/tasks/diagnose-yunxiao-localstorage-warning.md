# 定位 Raycast Node localStorage 警告

| Field | Value |
| --- | --- |
| Status | Completed (2026-10-29 18:06) |
| Kind | Task |

## Scope

只读诊断用户日志，不修改扩展、Raycast 安装文件或运行时设置。不屏蔽警告，不添加 localstorage-file，不读取或输出凭证。

## Task Summary

未修改代码或产品组件，仅检查宿主运行时和 SDK，并在独立进程复现警告。

## Target
- [x] T1: 定位 localStorage ExperimentalWarning 的触发来源并说明对鉴权和需求缓存的影响及处理建议

## Result

- T1: proc_pidpath确认日志PID6021为Raycast Backend使用Node v26.12.1，非此前验证过的v22.23.4。该26运行时访问globalThis.localStorage即产生同文ExperimentalWarning并返回undefined。加载Raycast自带react-devtools-raycast，在独立进程initialize并用本地空传输调用connectWithCustomMessagingProtocol，捕获堆栈指向getIsReloadAndProfileSupported -> Node internal/webstorage:42，退出成功。宿主调试探测try/catch处理不可用Storage。扩展源码和构建JS无localStorage调用；SDK Cache实现直接使用文件journal/storage，不依赖该全局；Chrome鉴权仍走classic-level副本。原始6021警告堆栈未捕获，因此不能排除其他宿主探测；未声称所有用户GUI路径已验证。建议无需修改需求缓存、无需localstorage-file；列表正常时可暂忽略，应由宿主SDK修正探测以彻底消除。未修改产品源码，未运行测试套件。
- Review gate: Skipped — See Review Assessment for the recorded exemption
## Review Assessment

- Schema: task-review-assessment/v1
- Level: R0
- State: Current
- Reason: 只读运行时警告调查，无交付源码改动
- Snapshot: no-file:raycast-node26-devtools-storage-probe-warning-stack
- Evidence: 原始日志、进程路径、Node26复现和实际宿主DevTools堆栈、SDK Cache实现检查
- Task fingerprint: d73263b4bf3b83879bf244ad57295343cd5ef1aec089bb211de81478a9464981

## Verification

- Passed: 独立进程实际宿主DevTools探测成功复现相同warning，堆栈明确；诊断进程成功退出，没有改动安装文件或项目配置，未全局屏蔽警告。原始宿主堆栈与GUI仍有限制。
