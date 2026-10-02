# 尚捷雯精听 · 第一次配置清单

## A. JSONBin

需要：
- JSONBin 账号
- Private Bin
- Master Key
- Bin ID

不要把 Master Key 填进：
- index.html
- app.js
- config.js
- GitHub Pages

## B. Cloudflare Worker

需要：
- Worker URL
- JSONBIN_MASTER_KEY
- JSONBIN_BIN_ID
- 可选 SYNC_TOKEN

## C. GitHub Pages

config.js：

window.SJW_CONFIG = {
  SYNC_WORKER_URL: "https://你的-worker.workers.dev",
  SYNC_TOKEN: "你的随机同步Token",
  AUTO_SYNC: true
};

## D. 测试

1. 打开网站。
2. 设置里填写 Worker URL。
3. 点击“立即同步”。
4. 开始一次 1 分钟学习。
5. 结束并保存。
6. 再点“立即同步”。
7. 打开另一个设备。
8. 使用同一个网站。
9. 点击“立即同步”。
10. 检查学习记录是否出现。

## E. 如果不想现在配置云同步

什么都不用填。

网站仍然可以正常使用。

数据会保存在当前浏览器。
