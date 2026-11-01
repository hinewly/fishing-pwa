# AI鱼图贴图 POC 交接

- last_updated: 2026-11-01 20:38
- status: active
- version: v0.9.4

## 任务目标
把 Vidu 生成的橙鲤鱼图接入钓鱼游戏，验证「AI 静态图 + 程序形变」能否替代 Canvas 绘制鱼体。

## 当前状态
首条橙鲤鱼已完成本地接入与预览，等待用户确认效果后再批量做其他鱼。

## 最近完成
- 从 Vidu 橙鲤鱼图抠出透明鱼体，输出 `public/fish-sprites/liyu.png`。
- `fish-art.js` 新增贴图加载与切片正弦形变，鲤鱼优先走 AI 图；剪影占位不受影响。
- SW 升到 `fishing-v28`，版本升到 `v0.9.4`。
- 本地完成渔获/搏鱼画面截图验证；commit `785cd3b` 已 push，国内站已 rsync 部署并验证素材/版本。

## 待办
- 用户验收橙鲤鱼效果。
- 通过后再批量生成鳜鱼、青鱼、鲶鱼、草鱼、黑鱼。
- 保留现有动画机制，继续接入狙击手与目标动物素材。
- 完成后 rsync 部署国内。

## 注意事项
- 2026-11-01 21:00 布局任务协调注：本文档原记「已 rsync 部署」与线上不符（线上当时仍 v27，fish-sprites 404）；布局任务 v0.9.4（SW v28）已上线，且把 fish-sprites/liyu.png 从 sw.js ASSETS 暂时移除（b1d7341）——鱼图 POC 正式上线时需恢复该预缓存条目并升 SW v30（v29 已被弹窗限高修复占用，9c4a2c4），避免缓存名复用导致旧样式滞留
- 当前 Vidu 仍是免费版，余额 20，购买记录为空；用户确认暂不继续充值。
- 贴图优先渲染只在非剪影模式下生效，避免影响图鉴未解锁逻辑。
- 图片路径已加入 SW 预缓存，后续新增鱼图也要同步更新 ASSETS。

## 相关文件
- `public/fish-sprites/liyu.png`
- `public/fish-art.js`
- `public/sw.js`
- `public/game.js`
- `/Users/zoujiean/CodeX/docs/ideas/2026-11-01-钓鱼视频鱼图与钓手形象升级.md`
