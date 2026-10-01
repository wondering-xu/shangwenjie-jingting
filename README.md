# 尚捷雯精听 V2

这是 GitHub Pages 可直接部署的静态 PWA 版本。

## 功能
- 今日学习 Dashboard
- 精听计时
- 学习方式：精听 / 听写 / 跟读 / 泛听 / 复习
- 理解度、单词数、笔记
- 1 / 2 / 4 / 7 / 15 / 30 天间隔复习
- 连续学习天数
- 14 天学习时长图
- JSON 导入/导出备份
- iPhone / iPad Safari 适配
- PWA / Service Worker

## 当前数据方式
V2 默认使用浏览器 localStorage。也就是说：
- GitHub Pages 可以直接上线；
- 数据保存在当前浏览器；
- 不与“每日英语听力”同步；
- 下一阶段可以接 Supabase 做登录和跨设备云同步。

## GitHub Pages
仓库：wondering-xu/shangjiewen-jingting

GitHub → Settings → Pages → Build and deployment → Source:
Deploy from a branch
Branch: main
Folder: /(root)
Save

部署完成后通常使用：
https://wondering-xu.github.io/shangjiewen-jingting/

请以 GitHub Pages 页面显示的实际地址为准。
