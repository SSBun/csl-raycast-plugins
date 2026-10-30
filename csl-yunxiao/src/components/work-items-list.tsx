import { createHash } from "node:crypto";
import { useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Color,
  environment,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import {
  BASE_URL,
  fetchWorkItems,
  ListScope,
  workItemUrl,
  resolveSession,
  YunxiaoSession,
} from "../lib/yunxiao";

const STATUS_COLORS: Record<string, Color.ColorLike> = {
  "visual:96": Color.Blue, // Development
  "visual:97": Color.Red, // Blocked
  "visual:100": Color.Orange, // Planning
  "visual:101": Color.Yellow, // Awaiting kickoff approval
  "visual:107": Color.Magenta, // Awaiting release
  "visual:108": { light: "#008577", dark: "#5EDBCD", adjustContrast: true }, // Released, awaiting summary
  "visual:109": Color.Green, // Completed
  "visual:110": Color.Purple, // Design acceptance
  "visual:200": Color.SecondaryText, // Closed
  "task:0": Color.Orange, // Incomplete
  "task:3": Color.Green, // Completed
  "bug:0": Color.Red, // Unresolved
  "bug:3": Color.Green, // Resolved
};

export default function WorkItemsCommand({ scope }: { scope: ListScope }) {
  const preferences = getPreferenceValues<{ token?: string }>();
  const token = preferences.token?.trim() ? preferences.token : process.env.YUNXIAO_TOKEN || "";
  // Remount before reading any cache when explicit credentials change; never use a token as a cache key.
  const identity = createHash("sha256").update(token).digest("hex");
  return <AccountGate key={`${scope}:${identity}`} tokenValue={token} scope={scope} />;
}

function AccountGate({ tokenValue, scope }: { tokenValue: string; scope: ListScope }) {
  const abortable = useRef<AbortController | null>(null);
  const [switchedSession, setSwitchedSession] = useState<YunxiaoSession>();
  // Authentication is never cached. Confirm the account before revealing its persisted requirements.
  const { data, error, isLoading, revalidate } = usePromise(
    (value: string) => resolveSession(value, environment.assetsPath, abortable.current?.signal),
    [tokenValue],
    { abortable },
  );
  const session = switchedSession ?? data;
  if (!session || isLoading || error) {
    return (
      <List isLoading={isLoading} navigationTitle={scope === "bugs" ? "My Bugs" : "My Work Items"}>
        <List.EmptyView
          title={error ? "无法确认云效账号" : "正在确认云效账号…"}
          description={
            error ? `${error.message} 为避免账号混用，暂不显示缓存。` : "确认后优先显示该账号的上次结果。"
          }
          actions={
            <ActionPanel>
              <Action title="重试" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action title="扩展设置" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action.OpenInBrowser title="打开云效" url={BASE_URL} />
            </ActionPanel>
          }
        />
      </List>
    );
  }
  return (
    <WorkItemsList
      key={`${scope}:${session.userId}`}
      scope={scope}
      session={session}
      tokenValue={tokenValue}
      onAccountChange={setSwitchedSession}
    />
  );
}

class AccountChangedError extends Error {}

function WorkItemsList({
  scope,
  session,
  tokenValue,
  onAccountChange,
}: {
  scope: ListScope;
  session: YunxiaoSession;
  tokenValue: string;
  onAccountChange: (session: YunxiaoSession) => void;
}) {
  const [status, setStatus] = useState("all");
  const abortable = useRef<AbortController | null>(null);
  const initialSession = useRef<YunxiaoSession | undefined>(session);
  const { data, error, isLoading, revalidate } = useCachedPromise(
    async (listScope: ListScope, userId: number) => {
      const signal = abortable.current?.signal;
      // The first fetch reuses the confirmed session. Manual refresh rechecks Chrome/token identity.
      const current =
        initialSession.current ?? (await resolveSession(tokenValue, environment.assetsPath, signal));
      initialSession.current = undefined;
      signal?.throwIfAborted();
      if (current.userId !== userId) {
        onAccountChange(current);
        // Never write the new account's response under the old account's cache key.
        throw new AccountChangedError("云效账号已切换，正在加载对应数据。");
      }
      const result = await fetchWorkItems(current, listScope, signal);
      return { ...result, fetchedAt: Date.now() };
    },
    [scope, session.userId],
    {
      abortable,
      keepPreviousData: false,
      onError: async (error) => {
        if (error instanceof AccountChangedError) return;
        await showToast({ style: Toast.Style.Failure, title: "列表更新失败", message: error.message });
      },
    },
  );
  const updateTime = data ? new Date(data.fetchedAt).toLocaleString() : "";
  const sectionTitle = error
    ? "更新失败 · 当前显示上次结果"
    : isLoading
      ? "上次结果 · 正在后台更新"
      : "最新结果";
  const visible = data?.items.filter((item) => status === "all" || item.statusKey === status) ?? [];
  const commonActions = (
    <>
      <Action
        title="刷新"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
      <Action title="扩展设置" icon={Icon.Gear} onAction={openExtensionPreferences} />
      <Action.OpenInBrowser title="打开云效" url={`${BASE_URL}/task/tab/mine`} />
    </>
  );

  return (
    <List
      navigationTitle={scope === "bugs" ? "My Bugs · 分配给我" : "My Work Items · 需求与任务"}
      isLoading={isLoading}
      searchBarPlaceholder={scope === "bugs" ? "搜索 Bug、ID 或经办人…" : "搜索需求、任务、ID 或负责人…"}
      actions={<ActionPanel>{commonActions}</ActionPanel>}
      searchBarAccessory={
        <List.Dropdown tooltip="按状态筛选" value={status} onChange={setStatus}>
          <List.Dropdown.Item title="All（全部状态）" value="all" />
          {data?.statuses.map((item) => (
            <List.Dropdown.Item key={item.key} title={item.label} value={item.key} />
          ))}
          {status !== "all" && !data?.statuses.some((item) => item.key === status) && (
            <List.Dropdown.Item title="当前状态（暂无条目）" value={status} />
          )}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title={error && !data ? "无法加载列表" : isLoading && !data ? "正在加载全部条目…" : "没有匹配的条目"}
        description={
          error
            ? `${error.message}${data ? ` 当前显示上次结果（${updateTime}）。` : ""}`
            : isLoading
              ? data
                ? `正在后台更新，当前为 ${updateTime} 的结果。`
                : "正在加载全部分页，仅在完整成功后更新缓存。"
              : "可以更改搜索条件或选择 All（全部状态）。"
        }
        icon={error ? Icon.ExclamationMark : Icon.MagnifyingGlass}
        actions={<ActionPanel>{commonActions}</ActionPanel>}
      />
      <List.Section
        title={data ? sectionTitle : undefined}
        subtitle={data ? `更新于 ${updateTime}` : undefined}
      >
        {visible.map((item) => (
          <List.Item
            key={`${item.kind}:${item.id}`}
            id={`${item.kind}:${item.id}`}
            title={item.name}
            subtitle={`${item.typeLabel} · #${item.id}${item.ownerName ? ` · ${item.ownerName}` : ""}`}
            keywords={[String(item.id), item.typeLabel, item.ownerName ?? "", item.statusLabel]}
            icon={item.kind === "bug" ? Icon.Bug : item.kind === "task" ? Icon.CheckList : Icon.List}
            accessories={[
              {
                tag: { value: item.statusLabel, color: STATUS_COLORS[item.statusKey] ?? Color.SecondaryText },
              },
              {
                text:
                  item.kind !== "requirement"
                    ? "分配给我"
                    : item.relations.length === 2
                      ? "我负责 · 我参与"
                      : item.relations[0] === "owned"
                        ? "我负责"
                        : "我参与",
              },
              ...(item.updatedAt ? [{ date: new Date(item.updatedAt), tooltip: "更新时间" }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={workItemUrl(item)} />
                <Action.CopyToClipboard title="复制链接" content={workItemUrl(item)} />
                {commonActions}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
