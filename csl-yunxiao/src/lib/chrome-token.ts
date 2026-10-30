import { chmod, cp, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import type { ClassicLevel } from "classic-level";

const TOKEN_KEYS = ["_https://one.in.zhihu.com\u0000\u0001token", "_https://one.in.zhihu.com..token"];
const PROFILE_PATTERN = /^(?:Default|Profile \d+)$/;
const CHROME_ROOTS = [
  join(homedir(), "Library/Application Support/Google/Chrome"),
  join(homedir(), "Library/Application Support/Chromium"),
];

async function profiles(root: string) {
  const entries = await readdir(root, { withFileTypes: true });
  let preferred: string[] = [];
  try {
    const state = JSON.parse(await readFile(join(root, "Local State"), "utf8"));
    preferred = [state.profile?.last_used, ...(state.profile?.last_active_profiles ?? [])].filter(
      (name): name is string => typeof name === "string" && PROFILE_PATTERN.test(name),
    );
  } catch {
    // Missing/corrupt Local State does not prevent reading conventional profiles.
  }
  const rank = (name: string) => {
    const index = preferred.indexOf(name);
    return index >= 0 ? index : name === "Default" ? preferred.length : Number.MAX_SAFE_INTEGER;
  };
  return entries
    .filter((entry) => entry.isDirectory() && PROFILE_PATTERN.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, undefined, { numeric: true }));
}

function extractTokens(value: Buffer): string[] {
  const tokens = new Set<string>();
  for (const encoding of ["utf8", "utf16le", "latin1"] as const) {
    const text = value.toString(encoding);
    for (const match of text.matchAll(/\bBearer\s+[-A-Za-z0-9._~+/=]{8,4096}(?=$|[^-A-Za-z0-9._~+/=])/gi)) {
      tokens.add(match[0]);
    }
    for (const match of text.matchAll(/\b[a-f0-9]{32}\b/gi)) {
      if (text.slice(Math.max(0, match.index - 7), match.index).toLowerCase() !== "bearer ")
        tokens.add(match[0]);
    }
  }
  return [...tokens];
}

export async function readChromeTokenCandidates(assetsPath: string, signal?: AbortSignal): Promise<string[]> {
  signal?.throwIfAborted();
  let Level: typeof ClassicLevel;
  try {
    // Load the self-contained JS/native assets, not node_modules from a developer checkout.
    const entry = join(assetsPath, "native-level", "index.cjs");
    Level = (createRequire(entry)(entry) as { ClassicLevel: typeof ClassicLevel }).ClassicLevel;
  } catch {
    throw new Error("无法加载 Chrome 登录读取组件，请重新安装或构建扩展；也可在设置中填写 Token。");
  }
  const tokens = new Set<string>();
  let readableProfiles = 0;
  for (const root of CHROME_ROOTS) {
    signal?.throwIfAborted();
    let names: string[];
    try {
      names = await profiles(root);
    } catch {
      continue;
    }
    for (const name of names) {
      signal?.throwIfAborted();
      const temp = await mkdtemp(join(tmpdir(), "yunxiao-chrome-leveldb-"));
      let db: ClassicLevel<string, Buffer> | undefined;
      try {
        await chmod(temp, 0o700);
        const copy = join(temp, "leveldb");
        await cp(join(root, name, "Local Storage", "leveldb"), copy, { recursive: true, dereference: true });
        signal?.throwIfAborted();
        db = new Level<string, Buffer>(copy, { valueEncoding: "buffer", createIfMissing: false });
        await db.open();
        readableProfiles++;
        // Fetch only the exact YunXiao origin/key, not arbitrary browser credentials.
        for (const key of TOKEN_KEYS) {
          const value = await db.get(key);
          if (value) for (const token of extractTokens(value)) tokens.add(token);
        }
      } catch {
        if (signal?.aborted) signal.throwIfAborted();
        // A rotated, locked or unreadable snapshot must not block another profile.
      } finally {
        try {
          if (db) await db.close().catch(() => undefined);
        } finally {
          await rm(temp, { recursive: true, force: true }).catch(() => {
            throw new Error("无法清理浏览器登录的临时副本，已停止自动登录；请检查临时目录权限。");
          });
        }
      }
    }
  }
  signal?.throwIfAborted();
  if (!tokens.size) {
    throw new Error(
      readableProfiles
        ? "Chrome/Chromium 中没有云效登录信息，请先登录 one.in.zhihu.com 后刷新，或在设置中填写 Token。"
        : "无法读取 Chrome/Chromium 登录信息，请确认浏览器已登录云效且 Raycast 有读取权限，或手动填写 Token。",
    );
  }
  return [...tokens];
}
