# 尚捷雯精听 · JSONBin 云同步版

这是一个可以直接放到 GitHub Pages 的独立英语听力学习记录 PWA。

## 已包含

- 开始 / 结束学习计时
- 时间戳计时：离开网页、切换到其他网站或 App 后，回来仍按真实经过时间计算
- 精听 / 听写 / 跟读 / 泛听 / 复习
- 学习次数、累计时间、连续学习天数
- 理解程度、单词、笔记的数据结构
- 1 / 2 / 4 / 7 / 15 / 30 天间隔复习
- JSON 导出 / 导入
- iPhone / iPad / PC 响应式界面
- PWA / Service Worker
- LocalStorage 本地保存
- JSONBin 云端同步
- Cloudflare Worker 保护 JSONBin Master Key

## 最重要：先不用云同步也能直接运行

把整个项目上传 GitHub Pages 后，打开网站就可以学习。

如果 `config.js` 中 `SYNC_WORKER_URL` 是空的，网站就是“本机模式”。

---

# 一、准备 JSONBin

打开 JSONBin.io，注册免费账号。

创建一个 Bin。

建议创建 Private Bin。

把 Bin ID 记下来。

注意：JSONBin API 的 Bin 是 JSON 数据记录，官方 API 支持创建、读取和更新。不要把 Master Key 直接写进 GitHub Pages 的 JavaScript。

---

# 二、部署 Cloudflare Worker

1. 登录 Cloudflare。
2. 打开 Workers & Pages。
3. 创建一个 Worker。
4. 把 `worker/worker.js` 的全部内容复制进去。
5. Deploy。

然后到 Worker 的 Settings / Variables and Secrets。

增加：

`JSONBIN_MASTER_KEY`

值填写你的 JSONBin Master Key。

建议再增加：

`JSONBIN_BIN_ID`

值填写你的 JSONBin Bin ID。

建议再增加：

`SYNC_TOKEN`

自己生成一串很长的随机字符串，例如 32～64 个字符。

保存并重新部署。

Worker URL 类似：

`https://你的worker名字.你的子域.workers.dev`

---

# 三、配置网站

打开根目录：

`config.js`

把：

`SYNC_WORKER_URL: ""`

改成：

`SYNC_WORKER_URL: "https://你的worker地址.workers.dev"`

如果你设置了 SYNC_TOKEN：

`SYNC_TOKEN: "你设置的随机字符串"`

保存。

然后把整个项目上传 GitHub Pages。

---

# 四、如果你已经有旧版 GitHub Pages

最简单：

1. 先备份旧项目。
2. 用本项目中的这些文件覆盖旧文件：
   - index.html
   - style.css
   - app.js
   - config.js
   - manifest.webmanifest
   - sw.js
   - icon.svg
3. 上传到 GitHub。
4. 等 GitHub Pages 更新。

旧的 Supabase 文件不再需要。

---

# 五、关于计时器

这个版本不是：

`每秒 +1`

而是：

`当前时间 - 开始时间`

例如：

14:00 开始精听。

14:25 离开网站去其他 App。

15:10 回来。

网站会显示大约：

`01:10:00`

所以 Safari/Chrome 后台暂停 JavaScript，不会导致学习时间少算。

但是请注意：如果你点击“结束并保存”，计时才正式生成一条学习记录。

---

# 六、云同步逻辑

正常情况下：

iPhone / iPad / PC
        ↓
GitHub Pages 网站
        ↓
Cloudflare Worker
        ↓
JSONBin

JSONBin Master Key 只放在 Cloudflare Worker。

GitHub Pages 不保存 Master Key。

网站仍然会把数据保存到 LocalStorage，所以即使暂时没有网络，也可以继续使用。

---

# 七、数据大小

这个项目只保存你的学习记录，正常使用很难达到 JSONBin 单个 JSON 记录的大小限制。

如果以后积累了很多年数据，建议使用“导出 JSON”备份，并考虑把数据拆分成多个 Bin 或换数据库。

---

# 八、重要说明

这个版本是“个人学习工具”，不是多人 SaaS。

如果以后你想做成：

- 多用户账号
- 手机验证码
- 多人共享
- 更复杂的统计
- 精确的数据冲突合并
- 多张数据库表

那么 Supabase / Firebase / Cloudflare D1 会更合适。

对于你现在的“尚捷雯精听”个人记录场景，JSONBin + Worker 足够简单。

