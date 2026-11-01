# 钓鱼湖畔手机端布局适配 交接

- last_updated: 2026-11-01 20:40
- status: done
- version: v0.9.3

## 任务目标

修复 iPhone 15（393px）等小屏设备上顶栏挤压成竖排、按钮互相重叠、提示条遮挡、底部按钮与页脚打架的问题（用户手机实测反馈截图）。

## 当前状态

已完成并部署国内站（rsync public/ → root@47.108.83.209:/opt/fishing-pwa/），iPad 回归验证无影响。

## 最近完成

- 方案 B（用户确认后实施），改动全部收在小屏断点内，iPad/桌面默认样式不动：
  1. `index.html`：viewport 加 `viewport-fit=cover`；header 内加 `#db-account-slot`（portal.js fishing 账号胶囊第一锚点，胶囊由悬浮改为内嵌，位置视觉不变）
  2. `style.css` 追加 `@media (max-width:480px)`：顶栏两行（第一行 标题+账号胶囊、第二行 功能按钮）、按钮紧凑化、隐藏版本号、提示条下移到按钮下方允许换行、底部按钮 `bottom:calc(44px+env(safe-area-inset-bottom))` 避让页脚、放大镜同步上移、页脚字号缩小
  3. `sw.js` CACHE v26→v27（强制换缓存）、`game.js` APP_VERSION v0.9.2→v0.9.3
- Playwright 双尺寸验证：393×660（iPhone 15）顶栏两行正常/无重叠；1024×768（iPad）单行顶栏无回归；截图已归档 `_temp-screenshots/2026-11/`（钓鱼湖畔-iPhone15适配 / iPad回归验证 三张）
- 账号胶囊内嵌顺带修复：此前胶囊悬浮右上会盖住顶栏控件，现内嵌进 header

## 待办

- 用户 iPhone 15 真机复查（Safari 普通模式 + 添加到主屏幕 PWA 模式各看一眼；PWA 模式 safe-area 才生效）
- 搏鱼画面小屏效果未逐一验证（同一套断点已覆盖 bottom-bar，理论无问题）

## 重要决策

- 只用 CSS 媒体查询 + 少量中性 HTML，不动游戏逻辑；小屏断点 480px（iPhone/iPad 分界）
- 账号胶囊利用 portal.js 现成的 `#db-account-slot` 锚点机制内嵌，不改 portal.js

## 注意事项

- `#db-account-slot` 默认 `display:contents`，小屏才改 `display:block;margin-left:auto`；portal 胶囊自带的 `margin-left:auto` 内联样式在小屏用 `!important` 覆盖
- 服务器为静态服务（8801），rsync 后无需重启；SW 已升 v27，老用户刷新即更新
- console 有一条未登录 401（/api/me），属正常现象，与布局无关

## 相关文件

- `public/index.html`、`public/style.css`、`public/sw.js`、`public/game.js`（仅版本号）
