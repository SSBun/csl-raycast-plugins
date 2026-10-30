import { readChromeTokenCandidates } from "./chrome-token";

export const BASE_URL = "https://one.in.zhihu.com";
const PAGE_SIZE = 20;
const MAX_PAGES = 1_000;

type Relation = "owned" | "participating";
export type ListScope = "work-items" | "bugs";
export type WorkItemKind = "requirement" | "task" | "bug";

export interface WorkItem {
  id: number;
  kind: WorkItemKind;
  typeLabel: string;
  name: string;
  statusKey: string;
  statusLabel: string;
  ownerName?: string;
  updatedAt?: string;
  relations: (Relation | "assigned")[];
}

export interface YunxiaoSession {
  token: string;
  userId: number;
}

export interface WorkItemsResult {
  items: WorkItem[];
  statuses: { key: string; label: string }[];
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function normalizeToken(value: string): string {
  if (/[\0\r\n]/.test(value)) throw new Error("Token 不能包含换行或控制字符，请检查扩展设置。");
  const token = value.trim().replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("请在扩展设置中填写 YunXiao Token，或设置 YUNXIAO_TOKEN 环境变量。");
  if (!/^[-A-Za-z0-9._~+/]+=*$/.test(token)) {
    throw new Error("Token 格式无效，请只填写 Token 值（可带 Bearer 前缀）。");
  }
  return `Bearer ${token}`;
}

async function get(path: string, token: string, signal?: AbortSignal): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: "GET",
      headers: { Authorization: token, Accept: "application/json" },
      redirect: "error",
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000),
    });
  } catch {
    if (signal?.aborted) throw new Error("请求已取消。");
    throw new Error("无法连接云效，请检查公司网络或 VPN；请求超时或重定向也会被拒绝。");
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("云效 Token 已过期或没有访问权限，请重新登录云效并更新扩展设置。");
    }
    throw new Error(`云效请求失败（HTTP ${response.status}），请稍后刷新。`);
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("云效返回了非 JSON 响应，请检查登录状态和网络。");
  }
  if (!object(payload) || payload.code !== 0 || !("data" in payload)) {
    // Do not surface server messages: they may contain credentials or private data.
    throw new Error("云效未成功返回数据，请检查 Token 或权限后刷新。");
  }
  return payload.data;
}

function parseRequirement(value: unknown, relation: Relation): WorkItem {
  if (!object(value) || !nonNegativeInteger(value.id) || value.id === 0 || typeof value.name !== "string") {
    throw new Error("云效需求数据格式发生变化，已停止加载，避免显示不完整的列表。");
  }
  const visual = object(value.visualizeStatus) ? value.visualizeStatus : undefined;
  const visualCode = visual && nonNegativeInteger(visual.code) ? visual.code : undefined;
  const status = nonNegativeInteger(value.status) ? value.status : undefined;
  const statusKey =
    visualCode !== undefined ? `visual:${visualCode}` : status !== undefined ? `status:${status}` : "unknown";
  const statusLabel =
    visual && typeof visual.text === "string" && visual.text.trim()
      ? visual.text
      : status !== undefined
        ? `状态 ${status}`
        : "未知状态";
  const ownerName =
    object(value.owner) && typeof value.owner.name === "string" ? value.owner.name : undefined;
  const updatedAt =
    typeof value.updateTime === "string" && Number.isFinite(Date.parse(value.updateTime))
      ? value.updateTime
      : undefined;
  return {
    id: value.id,
    kind: "requirement",
    typeLabel: "需求",
    name: value.name,
    statusKey,
    statusLabel,
    ownerName,
    updatedAt,
    relations: [relation],
  };
}

async function fetchRelation(token: string, userId: number, relation: Relation, signal?: AbortSignal) {
  const items = new Map<number, WorkItem>();
  let total: number | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    signal?.throwIfAborted();
    const startRow = page * PAGE_SIZE;
    const params = new URLSearchParams({
      entityType: "6",
      groupType: "0",
      moduleCreateSource: relation === "owned" ? "4" : "5",
      tableType: relation === "owned" ? "21" : "22",
      userId: String(userId),
      [relation === "owned" ? "owners" : "participants"]: String(userId),
      startRow: String(startRow),
      endRow: String(startRow + PAGE_SIZE),
    });
    // No visualizeStatus parameter means ALL states, including completed/closed requirements.
    const groups = await get(`/api/prj/v1/epics/group?${params}`, token, signal);
    if (!Array.isArray(groups)) throw new Error("云效分组响应格式无效。");
    if (groups.length === 0 && page === 0) return [];
    const group: unknown = groups[0];
    if (
      groups.length !== 1 ||
      !object(group) ||
      !Array.isArray(group.epicList) ||
      !object(group.pageInfo) ||
      !nonNegativeInteger(group.pageInfo.total)
    ) {
      throw new Error("云效分页响应格式发生变化，无法确认列表完整性。");
    }
    const currentTotal = group.pageInfo.total;
    if (total !== undefined && total !== currentTotal) {
      throw new Error("加载期间需求数量发生变化，请刷新以获取完整列表。");
    }
    total = currentTotal;
    if (group.epicList.length !== Math.min(PAGE_SIZE, Math.max(0, total - startRow))) {
      throw new Error("云效返回的分页条数与总数不一致，请刷新后重试。");
    }
    for (const raw of group.epicList) {
      const item = parseRequirement(raw, relation);
      if (items.has(item.id)) throw new Error("加载期间需求分页发生重叠，请刷新以获取完整列表。");
      items.set(item.id, item);
    }
    // hasNextPage is false even when more rows exist on this API. Use total instead.
    if (startRow + PAGE_SIZE >= total) return [...items.values()];
  }
  throw new Error("需求数量超出安全加载上限，未展示截断结果，请在云效网页查看。");
}

async function currentUserId(token: string, signal?: AbortSignal): Promise<number> {
  const user = await get("/api/base/user/me", token, signal);
  if (!object(user) || !nonNegativeInteger(user.id) || user.id === 0) {
    throw new Error("无法识别当前云效用户，请检查登录状态。");
  }
  return user.id;
}

export async function resolveSession(
  tokenValue: string,
  assetsPath?: string,
  signal?: AbortSignal,
): Promise<YunxiaoSession> {
  if (tokenValue.trim()) {
    const token = normalizeToken(tokenValue);
    return { token, userId: await currentUserId(token, signal) };
  }
  if (!assetsPath) throw new Error("缺少浏览器登录读取组件，请重新安装扩展。");
  const candidates = await readChromeTokenCandidates(assetsPath, signal);
  for (const candidate of candidates) {
    signal?.throwIfAborted();
    try {
      const token = normalizeToken(candidate);
      return { token, userId: await currentUserId(token, signal) };
    } catch {
      if (signal?.aborted) signal.throwIfAborted();
      // Expired tokens in another profile must not hide a valid login.
    }
  }
  throw new Error(
    "无法验证 Chrome 中的云效登录，请检查公司网络并重新登录 one.in.zhihu.com，或手动填写 Token。",
  );
}

async function fetchRequirements(
  { token, userId }: YunxiaoSession,
  signal?: AbortSignal,
): Promise<WorkItem[]> {
  // Run sequentially so a failed relation cannot leave another paging loop running.
  const owned = await fetchRelation(token, userId, "owned", signal);
  const participating = await fetchRelation(token, userId, "participating", signal);
  const merged = new Map<number, WorkItem>(owned.map((item) => [item.id, item]));
  for (const item of participating) {
    const previous = merged.get(item.id);
    merged.set(item.id, previous ? { ...item, relations: ["owned", "participating"] } : item);
  }
  return [...merged.values()];
}

function parseAssignedItem(value: unknown, kind: "task" | "bug", userId: number): WorkItem {
  if (
    !object(value) ||
    !nonNegativeInteger(value.id) ||
    value.id === 0 ||
    typeof value.title !== "string" ||
    !object(value.type) ||
    !nonNegativeInteger(value.type.code) ||
    !object(value.status) ||
    !nonNegativeInteger(value.status.code) ||
    typeof value.status.text !== "string"
  ) {
    throw new Error("云效任务/Bug 数据格式发生变化，已停止加载。");
  }
  const assignee = object(value.assignee) ? value.assignee : undefined;
  if (
    (assignee?.id ?? value.assigneeId) !== userId ||
    !(kind === "bug" ? [3] : [1, 2, 4]).includes(value.type.code)
  ) {
    throw new Error("云效返回的任务/Bug 不符合当前账号或类型筛选，已停止加载。");
  }
  return {
    id: value.id,
    kind,
    typeLabel: kind === "bug" ? "Bug" : typeof value.type.text === "string" ? value.type.text : "任务",
    name: value.title,
    statusKey: `${kind}:${value.status.code}`,
    statusLabel: value.status.text,
    ownerName: typeof assignee?.name === "string" ? assignee.name : undefined,
    updatedAt:
      typeof value.updateTime === "string" && Number.isFinite(Date.parse(value.updateTime))
        ? value.updateTime
        : undefined,
    relations: ["assigned"],
  };
}

async function fetchAssignedItems(
  { token, userId }: YunxiaoSession,
  kind: "task" | "bug",
  signal?: AbortSignal,
): Promise<WorkItem[]> {
  const pageSize = 50;
  const items = new Map<number, WorkItem>();
  let total: number | undefined;
  for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
    signal?.throwIfAborted();
    const params = new URLSearchParams({
      assigneeId: String(userId),
      type: kind === "bug" ? "3" : "1,2,4",
      // Unlike epics, groupType=5 returns a flat paginated task list.
      groupType: "5",
      moduleCreateSource: "1",
      sortType: "16",
      withSubTasks: "true",
      pageNum: String(pageNum),
      pageSize: String(pageSize),
    });
    // Omitting status includes completed items, not just the site's default status=0.
    const page = await get(`/api/v4/tasks?${params}`, token, signal);
    if (
      !object(page) ||
      !Array.isArray(page.list) ||
      !nonNegativeInteger(page.total) ||
      page.pageNum !== pageNum ||
      page.pageSize !== pageSize
    ) {
      throw new Error("云效任务/Bug 分页格式发生变化，无法确认列表完整性。");
    }
    if (total !== undefined && page.total !== total) {
      throw new Error("加载期间任务/Bug 数量发生变化，请刷新后重试。");
    }
    total = page.total;
    const start = (pageNum - 1) * pageSize;
    if (page.list.length !== Math.min(pageSize, Math.max(0, total - start))) {
      throw new Error("云效任务/Bug 分页条数与总数不一致，请刷新后重试。");
    }
    for (const raw of page.list) {
      const item = parseAssignedItem(raw, kind, userId);
      if (items.has(item.id)) throw new Error("任务/Bug 分页发生重叠，请刷新以获取完整列表。");
      items.set(item.id, item);
    }
    if (start + pageSize >= total) return [...items.values()];
  }
  throw new Error("任务/Bug 数量超出安全加载上限，未展示截断结果，请在云效网页查看。");
}

export async function fetchWorkItems(
  session: YunxiaoSession,
  scope: ListScope,
  signal?: AbortSignal,
): Promise<WorkItemsResult> {
  const items =
    scope === "bugs"
      ? await fetchAssignedItems(session, "bug", signal)
      : [
          ...(await fetchRequirements(session, signal)),
          ...(await fetchAssignedItems(session, "task", signal)),
        ];
  items.sort(
    (a, b) =>
      (Date.parse(b.updatedAt ?? "") || 0) - (Date.parse(a.updatedAt ?? "") || 0) ||
      b.id - a.id ||
      a.kind.localeCompare(b.kind),
  );
  const statuses = [
    ...new Map(
      items.map((item) => [
        item.statusKey,
        scope === "bugs"
          ? item.statusLabel
          : `${item.kind === "requirement" ? "需求" : "任务"} · ${item.statusLabel}`,
      ]),
    ).entries(),
  ]
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "zh-CN"));
  return { items, statuses };
}

export function workItemUrl(item: Pick<WorkItem, "id" | "kind">) {
  return item.kind === "requirement"
    ? `${BASE_URL}/epic/detail/${item.id}/tab/overview`
    : `${BASE_URL}/task/detail/${item.id}`;
}
