export type MergeRequestState = "all" | "opened" | "merged" | "closed";

export interface GitLabPreferences {
  baseUrl: string;
  personalAccessToken: string;
}

export interface MergeRequest {
  id: number;
  iid: number;
  title: string;
  state: string;
  web_url: string;
  updated_at: string;
  references?: { full?: string };
}

const PAGE_SIZE = 50;

function getApiUrl(baseUrl: string) {
  let url: URL;
  try {
    url = new URL(baseUrl.trim());
  } catch {
    throw new Error("GitLab Base URL 无效，请在扩展设置中填写完整的 HTTPS 地址。");
  }

  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("GitLab Base URL 必须使用 HTTPS，且不能包含用户名、密码、查询参数或片段。");
  }

  url.pathname = `${url.pathname.replace(/\/+$/, "").replace(/\/api\/v4$/, "")}/api/v4/merge_requests`;
  return url;
}

function isMergeRequest(value: unknown): value is MergeRequest {
  if (typeof value !== "object" || value === null) return false;
  const mr = value as Record<string, unknown>;
  if (
    typeof mr.id !== "number" ||
    typeof mr.iid !== "number" ||
    typeof mr.title !== "string" ||
    typeof mr.state !== "string" ||
    typeof mr.web_url !== "string" ||
    typeof mr.updated_at !== "string" ||
    !Number.isFinite(Date.parse(mr.updated_at)) ||
    (mr.references !== undefined &&
      (typeof mr.references !== "object" ||
        mr.references === null ||
        ("full" in mr.references && typeof mr.references.full !== "string")))
  ) {
    return false;
  }
  try {
    const url = new URL(mr.web_url);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export async function fetchMergeRequests(
  preferences: GitLabPreferences,
  state: MergeRequestState,
  search: string,
  page: number,
  signal?: AbortSignal,
): Promise<{ data: MergeRequest[]; hasMore: boolean }> {
  const url = getApiUrl(preferences.baseUrl);
  const token = preferences.personalAccessToken.trim();
  if (!token) throw new Error("请在扩展设置中填写 GitLab Personal Access Token。");

  url.search = new URLSearchParams({
    scope: "created_by_me",
    state,
    order_by: "updated_at",
    sort: "desc",
    per_page: String(PAGE_SIZE),
    page: String(page + 1),
    ...(search.trim() ? { search: search.trim() } : {}),
  }).toString();

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "PRIVATE-TOKEN": token, Accept: "application/json" },
      // Never forward the token to a redirect target, even on the same host.
      redirect: "error",
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000),
    });
  } catch {
    if (signal?.aborted) throw new Error("请求已取消。");
    throw new Error("无法连接 GitLab：请检查网络、HTTPS 证书及 Base URL；地址不能发生重定向。");
  }

  if (!response.ok) {
    if (response.status === 401) throw new Error("GitLab Token 无效或已过期，请更新扩展设置。");
    if (response.status === 403) throw new Error("GitLab 拒绝访问，请检查 Token 的 read_api 权限。");
    if (response.status === 404) throw new Error("找不到 GitLab API，请检查 Base URL 和实例子路径。");
    if (response.status === 429) throw new Error("GitLab 请求过于频繁，请稍后刷新。");
    throw new Error(`GitLab 请求失败（HTTP ${response.status}），请稍后重试。`);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error("GitLab 返回了无效的 JSON，请检查 Base URL 是否指向 GitLab 实例。");
  }
  if (!Array.isArray(data) || !data.every(isMergeRequest)) {
    throw new Error("GitLab 返回的数据格式不正确，请检查 Base URL 和实例 API。");
  }

  const nextPage = response.headers.get("x-next-page");
  return { data, hasMore: nextPage === null ? data.length === PAGE_SIZE : nextPage !== "" };
}
