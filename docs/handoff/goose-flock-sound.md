# 大雁群飞行 + 叫声 交接

- last_updated: 2026-11-14 09:36
- status: active
- version: v1.0.13

## 任务目标

钓鱼湖畔天空加随机出场的大雁群（Canvas 画，免费）+ 大雁叫声（免费 Public Domain 音频）。

## 当前状态

功能代码已实现，本地渲染验证通过。还差你确认游戏内效果后我再部署线上。

## 最近完成

- v1.0.11：换用 Greylag Goose CC BY-SA 共鸣雁叫、高度限制修复、雁叫节奏改为每群 2~3 声。
- v1.0.12：飞行方向改为左→右，雁头朝向与飞行方向一致，整群飞出右边界。

- 移除原来的 3 只简陋小鸟，改成 7 只大雁群（不对称 V 形、约 3 个体长间距）
- 横穿屏幕约 14.5~17.5 秒
- 每群结束后随机 16~26 秒再出下一群
- 新增两段 Public Domain 雁叫音频，随机播放、音量随机微调
- 雁叫跟随背景音乐开关；音乐关闭时只飞不叫
- SW 缓存升到 v46，版本号 v1.0.10

## 待办

- 你确认效果后我再 commit + push + rsync 部署国内站。

## 注意事项

- 音频来源：Wikimedia Commons《Anser anser - Greylag Goose XC436358.mp3》，CC BY-SA 4.0，作者 Joost van Bruggen（已剪 2 段共鸣感雁叫）。
- 雁群高度限制：下臂下降被 maxDown 截住，始终保持在 H*0.19 之上，不进山/水面。
- 飞行方向：从左往右（领队在前、雁头朝右），领队从左边界入场，整群飞出右边界后结束。
- 每群雁叫 2~3 声（间隔 2.5~4.5s），群结束后随机 16~26s 出下一群。
- v1.0.13：雁叫与背景音乐开关解耦，独立发声（与其他音效一致）。浏览器自动播放限制：需用户先点一下屏幕激活 AudioContext。
- 树/芦苇升级本轮明确不做。
- 音频文件在 `public/audio/goose-honk-1.mp3`、`goose-honk-2.mp3`。

## 相关文件

- `public/game.js`
- `public/sw.js`
- `public/audio/goose-honk-1.mp3`
- `public/audio/goose-honk-2.mp3`
