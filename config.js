/*
  尚捷雯精听 · JSONBin 版本

  第一次使用云同步：
  1. 部署 worker/worker.js 到 Cloudflare Workers。
  2. 在 Worker Variables/Secrets 中设置 JSONBIN_MASTER_KEY。
  3. Worker 会把 JSONBin Master Key 保存在服务器端，不放进 GitHub Pages。
  4. 把 Worker URL 填到下面 SYNC_WORKER_URL。
  5. 可选：设置一个 SYNC_TOKEN，并在这里填写同样的值。

  如果 SYNC_WORKER_URL 留空，网站仍然可以完整使用本地模式。
*/
window.SJW_CONFIG = {
  SYNC_WORKER_URL: "",
  SYNC_TOKEN: "",
  AUTO_SYNC: true
};

try {
  const saved = localStorage.getItem("sjw_jsonbin_config");
  if (saved) {
    const x = JSON.parse(saved);
    window.SJW_CONFIG = {...window.SJW_CONFIG, ...x};
  }
} catch (_) {}
