# 考研 · 托福单词查阅网站

离线可用的考研 + 托福词汇查阅工具，每个词条包含 **词源 → 引申链条 → 分开理解（分义项 + 搭配）→ 衍生词 → 易记类比 → 例句**。

## 打开方式

双击 **`打开网站.bat`**，或直接双击 `index.html`（用 Chrome / Edge 打开即可，无需联网、无需服务器）。

## 功能

- **搜索**：输入英文单词即时匹配（前缀优先），输入中文可反查释义
- **字母索引**：左侧 A–Z 筛选，`#` 为非字母开头词条
- **词性筛选**：n. / v. / adj. / adv. / prep. / conj. / pron. / num. / int.
- **收藏 / 已掌握**：点击词条卡片右上按钮标记，数据存在浏览器本地（localStorage），可「只看收藏」「隐藏已掌握」
- **排序**：按字母 / 按词长
- **朗读**：词条详情右上角 🔊 使用浏览器语音朗读单词
- 快捷键：`/` 聚焦搜索框，`Esc` 关闭详情

## 目录结构

```
kaoyan-site/
├─ index.html            页面
├─ 打开网站.bat          双击打开
├─ css/style.css         样式
├─ js/app.js             前端逻辑（搜索/筛选/收藏/详情渲染）
├─ data/
│  ├─ words.js           11409 个词条基础数据（考研 5111 + 托福新增 6298）
│  ├─ progress.js        已生成深度内容的批次列表
│  └─ detail/
│     └─ detail-NNN.js   深度内容分片，每片 20 词，点击词条时按需加载
├─ batches/
│  ├─ batch-NNN.json     每批 20 词的输入（单词 + 原始释义）
│  └─ _summary.json      总量统计
└─ tools/
   ├─ parse_base.py      解析 kaoyan.txt → data/words.js + batches
   ├─ validate.py        校验 detail-NNN.js 与批次是否一致
   ├─ make_progress.py   扫描 data/detail 生成 data/progress.js
   └─ ENTRY_SCHEMA.md    深度词条数据格式说明
```

## 数据格式

每个 `data/detail/detail-NNN.js`：

```js
window.KY_CHUNKS = window.KY_CHUNKS || {};
window.KY_CHUNKS[NNN] = {
  "season": {
    "origin": "拉丁语 satio → 古法语 seison，最早意思：合适的时节、时机。",
    "chain": ["引申①：一年里合适的时段 → 季节", "引申②：食物适合调味的时机 → 动词「调味」"],
    "mnemonic": "古代人认为：调味要把握时机……",
    "senses": [
      {"pos":"n.","cn":"季节：一年划分出来的时段","examples":[{"en":"the rainy season","zh":"雨季"}]},
      {"pos":"v.","cn":"调味：在恰当时候放佐料","examples":[{"en":"Season the soup.","zh":"给汤调味。"}]}
    ],
    "derived": [{"en":"seasoning","zh":"n. 调料、调味品"}],
    "analogy": "season = “时机”\n大自然的时机 → 季节\n做菜的时机 → 调味",
    "sentences": [{"en":"...","zh":"..."}]
  }
};
```

## 维护命令

```powershell
# 校验所有已生成的 detail 分片
python tools\validate.py

# 刷新网站的进度条数据
python tools\make_progress.py
```

新增词条深度内容后，运行 `make_progress.py` 并刷新网页即可看到进度变化。
