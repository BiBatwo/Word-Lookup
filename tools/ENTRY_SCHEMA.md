# 深度词条数据格式（detail-NNN.js）

每个批次文件对应 `batches/batch-NNN.json`（20 个单词），输出到 `data/detail/detail-NNN.js`：

```js
window.KY_CHUNKS = window.KY_CHUNKS || {};
window.KY_CHUNKS[NNN] = {
  "season": {
    "origin": "拉丁语 satio → 古法语 seison，最早意思：合适的时节、时机。",
    "chain": ["引申①：一年里合适的时段 → 季节", "引申②：食物适合调味的时机 → 动词「调味」"],
    "mnemonic": "古代人认为：调味要把握时机，在烹饪合适的时候加入香料，所以用 season（把握时机）来表示给食物调味。",
    "senses": [
      {"pos":"n.","cn":"季节：一年划分出来的时段","examples":[{"en":"the rainy season","zh":"雨季"}]},
      {"pos":"v.","cn":"调味：在恰当时候放佐料","examples":[{"en":"Season the soup.","zh":"给汤调味。"}]}
    ],
    "derived": [{"en":"seasoning","zh":"n. 调料、调味品（就是从动词来的）"}],
    "analogy": "season = “时机”\n大自然的时机 → 季节\n做菜的时机 → 调味",
    "sentences": [
      {"en":"Hotel bookings tend to peak during the holiday season.","zh":"假日期间酒店预订往往会达到高峰。"}
    ]
  }
};
```

## 字段说明

| 字段 | 类型 | 说明 |
|---|---|---|
| origin | string | 词源流变路径 |
| chain | string[] | 引申链条，以「引申①」开头 |
| mnemonic | string | 词源背后的逻辑（可空字符串） |
| senses | object[] | 每个词性一项：`{pos, cn, examples:[{en,zh}]}` |
| derived | object[] | 衍生词 `{en, zh}` |
| analogy | string | 易记类比，可含 `\n` |
| sentences | object[] | 考研风格完整例句 `{en, zh}`，3 条 |

## 校验

`tools/validate.py` 会检查：文件是否存在、可被 JSON 解析、词条数与批次一致、各字段类型正确、例句带中文。
