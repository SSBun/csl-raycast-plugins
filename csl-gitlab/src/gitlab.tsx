import { createHash } from "node:crypto";
import { useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { fetchMergeRequests, GitLabPreferences, MergeRequestState } from "./lib/gitlab";
import testConnection from "./test-connection";

const STATE_LABELS: Record<string, string> = {
  opened: "Open",
  merged: "Merged",
  closed: "Closed",
  locked: "Locked",
};

const STATE_COLORS: Record<string, Color> = {
  opened: Color.Green,
  merged: Color.Purple,
  closed: Color.Red,
  locked: Color.Orange,
};

export default function Command() {
  const preferences = getPreferenceValues<GitLabPreferences>();
  const [state, setState] = useState<MergeRequestState>("all");
  const [search, setSearch] = useState("");
  const abortable = useRef<AbortController | null>(null);
  // Isolate account configurations without persisting the token in cache keys.
  const accountCacheKey = createHash("sha256")
    .update(JSON.stringify([preferences.baseUrl.trim(), preferences.personalAccessToken.trim()]))
    .digest("hex");
  const { data, error, isLoading, pagination, revalidate } = useCachedPromise(
    (_accountCacheKey: string, currentState: MergeRequestState, currentSearch: string) =>
      async ({ page }: { page: number }) => {
        const result = await fetchMergeRequests(
          preferences,
          currentState,
          currentSearch,
          page,
          abortable.current?.signal,
        );
        // Persist only the fields rendered by the list, not the full API response.
        return {
          data: result.data.map((mr) => ({
            id: mr.id,
            iid: mr.iid,
            title: mr.title,
            state: mr.state,
            web_url: mr.web_url,
            updated_at: mr.updated_at,
            references: mr.references ? { full: mr.references.full } : undefined,
          })),
          hasMore: result.hasMore,
        };
      },
    [accountCacheKey, state, search],
    {
      abortable,
      keepPreviousData: false,
      onError: async (error) => {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could Not Refresh Merge Requests",
          message: error.message,
        });
      },
    },
  );

  const commonActions = (
    <>
      <Action
        title="刷新"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
      <Action title="Test Connection" icon={Icon.Network} onAction={testConnection} />
      <Action title="扩展设置" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </>
  );

  return (
    <List
      navigationTitle="My Merge Requests"
      isLoading={isLoading}
      searchBarPlaceholder="Search my merge requests by title or description…"
      onSearchTextChange={setSearch}
      filtering={false}
      throttle
      pagination={error || isLoading ? undefined : pagination}
      actions={<ActionPanel>{commonActions}</ActionPanel>}
      searchBarAccessory={
        <List.Dropdown
          tooltip="按 MR 状态筛选"
          value={state}
          onChange={(value) => setState(value as MergeRequestState)}
        >
          <List.Dropdown.Item title="全部状态" value="all" />
          <List.Dropdown.Item title="Open" value="opened" />
          <List.Dropdown.Item title="Merged" value="merged" />
          <List.Dropdown.Item title="Closed" value="closed" />
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          title="无法加载 Merge Requests"
          description={error.message}
          icon={Icon.ExclamationMark}
          actions={<ActionPanel>{commonActions}</ActionPanel>}
        />
      ) : (
        <List.EmptyView
          title={isLoading ? "正在加载 Merge Requests…" : "没有找到 Merge Requests"}
          description={isLoading ? "正在连接 GitLab。" : "仅显示你创建的 MR；可尝试更改搜索或状态筛选。"}
          icon={Icon.MagnifyingGlass}
          actions={<ActionPanel>{commonActions}</ActionPanel>}
        />
      )}
      {data?.map((mr) => (
        <List.Item
          key={mr.id}
          id={String(mr.id)}
          title={mr.title}
          subtitle={mr.references?.full ?? `!${mr.iid}`}
          icon={{ source: Icon.Code, tintColor: STATE_COLORS[mr.state] ?? Color.SecondaryText }}
          accessories={[
            { tag: { value: STATE_LABELS[mr.state] ?? mr.state, color: STATE_COLORS[mr.state] } },
            { date: new Date(mr.updated_at), tooltip: `更新时间：${new Date(mr.updated_at).toLocaleString()}` },
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={mr.web_url} />
              <Action.CopyToClipboard title="复制 MR 链接" content={mr.web_url} />
              {commonActions}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
