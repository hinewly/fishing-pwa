# AI鱼图贴图 POC 交接

- last_updated: 2026-11-02 00:45
- status: active
- version: v0.9.4（本地未发布）
- repo: /Users/zoujiean/CodeX/fishing-pwa

## 新任务开场动作
1. 先通读本文档，不要只看标题。
2. `git -C /Users/zoujiean/CodeX/fishing-pwa status --short`，确认当前有未提交改动。
3. `git diff -- public/fish-art.js public/game.js public/index.html` 看清本次 POC 的实际改动，别按文档想象。
4. 本地预览用 `python3 -m http.server 8798 --directory /Users/zoujiean/CodeX/fishing-pwa/public`。
5. 浏览器自动化：Playwright MCP 可能断连；可用本机 Chrome CDP `http://127.0.0.1:9333`，脚本在 `/Users/zoujiean/CodeX/_temp-screenshots/2026-11/tools/vidu-cdp/`。
6. 最新预览截图：`/Users/zoujiean/CodeX/_temp-screenshots/2026-11/钓鱼游戏-搏鱼画面橙鲤鱼效果-20261101.png`。

## 任务目标
用 Vidu 已生成的橙鲤鱼图，验证钓鱼游戏里的「AI 鱼图 + 程序形变 + 搏鱼动画」效果，效果确认后再批量做其他鱼种和钓鱼者形象。

## 当前状态
- 2026-11-02 00:45：v1.0.0 上线（SW v35）。用户反馈 5 项一次修完：①浅滩无口=隐藏小鱼后 diff1 过滤把钓池清空、rollFish 崩溃冻结主循环（连重抛按钮都死）——加空池兜底回退全部可见鱼种，浅滩文案改"练手池"；②湖面岸边换 AI 斗笠人（镜像+整体旋转模拟抛竿三段动作，竿稍公式同步，起飞点用新几何）；③搏鱼画面人改按高度定尺寸+脚踩近岸（不再裁头）；④鱼增加纵深下潜（体力足下潜、钻底到底、力竭浮面）；⑤等口按钮文案改"提竿 / 收竿"明确重抛入口。本地全流程验证通过后部署。
- 2026-11-02 00:15：v0.9.9 上线（SW v34）。两个线上 bug 修复并验证：① WebP 迁移时 angler 路径漏改 .png + SW 缓存版本未随 fish-art.js 内容同步升级（教训：改任何预缓存文件内容必须升 CACHE 版本号），v0.9.7/v32 起搏鱼画面 AI 钓鱼人线上验证通过；② 底部"登录/注册"自 v0.9.1 起就是死链接（从未绑定事件），已绑定 DaoBox.loginUrl() 跳转统一登录页，线上点击验证通过。湖面岸边钓鱼人仍为卡通剪影（未换，替换会丢抛竿动画，待用户决定）。
- 2026-11-01 23:55：用户截图反馈搏鱼画面回退卡通——根因：SW 缓存按完整 URL 匹配，旧缓存 fish-art.js 引用 PNG?v=v0.9.5 与预缓存 key 不一致，PNG 删除后 404 回退；已把 PNG 放回服务器作兜底（commit 0321772，ASSETS 仍只预缓存 webp），用户强刷后走 v31/webp。注意：湖面岸边（drawShoreAngler）的卡通钓鱼人未替换，用户可能要求换，替换会丢抛竿动画，待确认。
- 2026-11-01 23:45：用户反馈加载慢（根因：5 张 PNG 共 2.4MB 贴图 + ECS 小带宽），已全部转 WebP 压到 256KB（-90%），SW v31 / APP_VERSION v0.9.6，commit 5d7c0a4 已 push + rsync，线上 200 验证通过；PNG 原图已归档 _temp-screenshots/vidu-fish-gen（liyu 原图在 git 历史）。
- 2026-11-01 22:45：v0.9.5 已发布上线（用户验收同意）：SW v30、恢复 liyu 并新增 guiyu/heiyu/caoyu/angler 预缓存、APP_VERSION v0.9.5；commit 1a4343c 已 push，rsync 部署完成，线上资源全部 200 验证通过。
- Vidu 已充值：余额 820（标准版），本次 4 张图全部第 1 次生成即合格，共耗约 24 积分，剩余约 796。
- 用户确认方案 B：隐藏未做 AI 贴图的 7 种鱼（鲫鱼/罗非鱼/黄颡鱼/鲢鱼/鳙鱼/翘嘴鲌/青鱼），只保留 5 种 AI 贴图鱼（鲤鱼/鳜鱼/鲶鱼/黑鱼/草鱼），避免贴图鱼与 Canvas 卡通鱼同屏画风割裂。以后图齐了再逐个放出，总量最多 7~8 种。
- 隐藏已实现：FISH_SPECIES 加 hidden:1 标记（保留数据防老存档报错），rollFish 钓池和图鉴 rows 过滤 hidden，"最大鱼"名称查询加了兜底。
- 橙鲤鱼已接入游戏，本地可预览。
- 最新效果已达到用户说的「65 分左右」，方向被认可，但还没到上线标准。
- 用户没有同意发布/部署，**未获得明确同意前不要 rsync、不要 push 发布、不要升 SW 上线**。
- 本地分支 `main`，最新提交为 `75039c8`；当前有未提交改动：`public/fish-art.js`、`public/game.js`、`public/index.html`、`public/fish-sprites/liyu.png`。
- 线上不是最新效果；此前 POC 曾误部署过，已回滚。新任务继续时先重新核对线上版本和素材状态。

## 已确认的用户反馈
- 鱼图必须是「鱼肚朝下」，不能翻肚皮。
- 鱼钩必须挂鱼嘴，不能挂鱼身/鱼肚。
- 鱼要贴着水面挣扎，有时跃出水面，不能一直沉在水下。
- 鱼尾应左右摆动，不能只是整体上下漂。
- 张力/体力不要用难看的大横条，改成体温计式的小竖向仪表，带百分比。
- 钓鱼人剪影不能是纯黑色块，先临时做成更有层次的人形，后面用 AI 生成真实钓鱼者形象图替换。
- 鱼竿目前是弯曲的，看起来很 low（2026-11-01 21:50 用户反馈，此前未记录）；本次要一起修。
- 测试账号的云端渔获数据（portal_fishing 斤数/积分）暂不清理，正式跑通后再清，不影响程序。
- 用户强调：没有明确通知前，不要发布/部署，避免浪费时间。

## 最近完成（2026-11-01 晚批量任务）
- Vidu 生成 4 张素材（全部一次通过）：鳜鱼、黑鱼、草鱼（侧视/鱼肚朝下/白底/鱼头朝左）+ 斗笠中年钓鱼人持竿图。
- 白底转透明处理脚本 process_sprite.py（_temp-screenshots/2026-11/vidu-fish-gen/），比 GrabCut 更适合白底图；钓鱼人图用轻量形态学保留细竿。
- 新鱼图接入 _drawFishSprite()：guiyu/heiyu/caoyu 复用鲤鱼形变机制，新增 FISH_SPRITE_SCALE 体型系数（guiyu .82 / heiyu .92 / caoyu 1.12 / nianyu 1.08 / qingyu 1.35），搏鱼画面尺寸封顶放宽到 W*0.42/H*0.34。
- 搏鱼画面钓鱼人替换为 AI 贴图（FIGHT_ANGLER_IMG，fish-sprites/angler.png?v=v0.9.5）：自带细长直竿（此前代码画的弯竿已消失），整体随挣扎小幅摆动+张力下压，竿尖分数位置(0.018,0.019)旋转计算接鱼线；AI 图未加载时兜底回旧剪影。
- 本地 390x844 验证截图 3 张已归档 _temp-screenshots/2026-11/； Playwright 调试目录已清空。
- 历史完成：用 GrabCut 抠出橙鲤鱼透明 PNG，并修正为鱼肚朝下。
- `fish-art.js` 里新增 `_drawFishSprite()`，用切片形变模拟鱼尾左右摆动，鱼头基本稳定。
- `game.js` 搏鱼画面改成水面/天空分层，鱼可贴水面挣扎并周期性跃水。
- 鱼钩挂点改为鱼嘴：`mouthX/mouthY` 沿鱼体前方计算，鱼线连到嘴部。
- 张力/体力改成左上角两个小竖向仪表，带百分比，不再用大横条。
- 钓鱼人剪影临时改成有颜色层次的样子，不再是纯黑块。

## 下一步待办
1. 用户验收本地效果（http.server 8798）：3 条新鱼贴图、体型差异、AI 钓鱼人、直竿。
2. 用户认可后发布：SW 升 v30 + 恢复 liyu.png（及新增 guiyu/heiyu/caoyu/angler.png）预缓存 + push + rsync。
3. 下一批：鲶鱼、青鱼（巨物 1.35 系数已预留），生成后同样接入；青鱼需去掉 fish-data.js 里 hidden:1。
4. 测试账号云端渔获数据（portal_fishing）暂不清理，正式跑通后再清。
5. 让用户继续验收当前鲤鱼效果，重点是鱼尾摆动、跃水节奏、鱼嘴挂钩、仪表 UI。
3. 上线前要恢复 `fish-sprites/liyu.png` 到 `sw.js` 的 `ASSETS`，并升 SW 版本（当前已是 v29，上线建议 v30）。
4. 上线必须等用户明确说发布，再 push + rsync + 线上验证。
5. 后续批量鱼图要继续沿用当前 `_drawFishSprite()` 机制，保证统一动画。

## 技术要点
- 当前本地未提交改动里有跃水逻辑：`nextJump`、`jumpT`、`burstJump`。
- `_drawFishSprite()` 当前用横向位移 `dx` 做尾巴左右摆动，纵向 `dy` 只是很小的辅助摆动。
- 水面高度用 `WATER_Y = H * 0.28`，鱼可跨水面。
- 鱼图缓存版本在 `fish-art.js` 里用 `?v=v0.9.6` 控制；正式上线时记得同步 SW。
- `fish-sprites/liyu.png` 当前被部分 SW 策略暂时移出预缓存，正式上线时要恢复。
- 渔获弹窗、图鉴剪影逻辑不能被破坏：`drawFishArt()` 里剪影模式仍走 Canvas 画法。

## 注意事项
- Vidu 当前仍是免费版，余额 20，购买记录为空；用户确认暂不继续充值。
- 本地浏览器自动化的 CDP 端口可能不是长期稳定，若断开要重新起 Chrome 调试实例。
- 临时文件和截图放 `_temp-screenshots/2026-11/`，不要散落在根目录。
- 这个任务先只做钓鱼游戏，不要顺手改其他项目。

## 相关文件
- `public/fish-sprites/liyu.png`
- `public/fish-art.js`
- `public/game.js`
- `public/index.html`
- `public/style.css`
- `public/sw.js`
- `/Users/zoujiean/CodeX/docs/ideas/2026-11-01-钓鱼视频鱼图与钓手形象升级.md`
- `/Users/zoujiean/CodeX/_temp-screenshots/2026-11/钓鱼游戏-搏鱼画面橙鲤鱼效果-20261101.png`
