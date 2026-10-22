# BRAINWAVE — 涂鸦风独立游戏标题界面

参照视频《Brainwave 独立游戏开发日志 #1》复刻的 16:9 游戏标题界面，配套一个短视频页面的外壳（创作者信息、关注、点赞 / 收藏 / 评论栏）。

纯静态站点，零依赖、零构建：HTML + CSS + 原生 JS，GitHub Pages 直接托管。

## 还原要点

| 元素 | 说明 |
| --- | --- |
| 斜切白色刷痕底板 | SVG 路径绘制的不规则斜切色带，上沿接近平直、下沿为 −14° 斜线，左下角几乎贴边 |
| 三套主题配色 | 电光蓝 `#0018B7`、苔原绿 `#003C11`、绯红 `#B5252D`，取自视频逐帧取色 |
| 角色线稿 | 纯 SVG 手绘，视线 / 发丝 / 耳部装置，随主题换色 |
| 涂鸦墨迹 | JS 程序化生成（固定随机种子）：墨块、飞溅液滴、甩笔、向下拖尾 |
| BRAINWAVE 标题 | 自托管 Anton 字体 + 斜切压缩，`::before` 偏移做 3D 投影 |
| 网点 / 扫描线 | CSS 叠层，还原视频的低分辨率网点印刷感 |

## 交互

- **THEME** —— 切换下一套配色（带墨迹弹跳 + 标题错位过渡）
- **RECORDS** —— 档案面板（战绩表）
- **SETTINGS** —— 主题色板、音乐 / 音效 / 震动 / 自动轮播 / 全屏开关
- **NEW GAME** —— 开机动画：logo 闪白 → 进度条 → 按任意键返回
- **全屏观看** —— 进入全屏
- 键盘 `↑ ↓` 移动焦点、`Enter` 确认、`Esc` 关闭面板
- 鼠标移动时角色线稿与标题有轻微视差

## 主题参数

支持 URL 参数锁定主题并关闭自动轮播，例如：

```
index.html?theme=green
index.html?theme=red
```

未指定时使用 `localStorage` 中保存的上次选择，默认 `blue`。首页开启"自动轮播主题"后，每 4.2 秒在蓝 → 绿 → 红之间循环，与视频中游戏的行为一致。

## 目录结构

```
brainwave/
├── index.html                 页面主体
├── assets/
│   ├── css/main.css           全部样式与主题变量
│   ├── js/main.js             交互逻辑
│   ├── js/splat.js            涂鸦墨迹生成器
│   ├── fonts/                 自托管 Anton / Barlow Condensed（latin 子集）
│   └── favicon.svg
└── .nojekyll
```

## 本地预览

```bash
python -m http.server 8123
# 打开 http://127.0.0.1:8123/index.html
```

## 关于字体

字体已下载到 `assets/fonts/` 本地托管，不依赖 Google Fonts CDN —— 国内网络可直接访问。
字体采用 Google Fonts 的 OFL 协议，版权归各自作者所有。
