import { getPreferenceValues, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { fetchMergeRequests, GitLabPreferences } from "./lib/gitlab";

export default async function testConnection() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "正在测试 GitLab 连接…" });
  try {
    const preferences = getPreferenceValues<GitLabPreferences>();
    // Use the same endpoint as the list so success also confirms MR read access.
    await fetchMergeRequests(preferences, "all", "", 0);
    toast.style = Toast.Style.Success;
    toast.title = "GitLab 连接成功";
    toast.message = "当前 Token 可以读取你创建的 Merge Requests。";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "GitLab 连接测试失败";
    toast.message = error instanceof Error ? error.message : "请检查 GitLab 地址和 Token 配置。";
    toast.primaryAction = { title: "扩展设置", onAction: () => openExtensionPreferences() };
  }
}
