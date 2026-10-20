# -*- coding: utf-8 -*-
"""根据 data/detail 下已存在的批次文件，生成 data/progress.js。"""
import glob
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DETAILDIR = os.path.join(ROOT, "data", "detail")
os.makedirs(DETAILDIR, exist_ok=True)

ids = []
for f in glob.glob(os.path.join(DETAILDIR, "detail-*.js")):
    m = re.search(r"detail-(\d+)\.js$", f)
    if m and os.path.getsize(f) > 200:
        ids.append(int(m.group(1)))
ids.sort()

with open(os.path.join(ROOT, "data", "progress.js"), "w", encoding="utf-8") as fh:
    fh.write("window.KY_DONE = " + json.dumps(ids) + ";\n")

summary = json.load(open(os.path.join(ROOT, "batches", "_summary.json"), encoding="utf-8"))
total = summary["total_words"]
covered = min(len(ids) * summary["batch_size"], total)
print("已生成批次 %d/%d, 覆盖词条 %d/%d (%.1f%%)" % (
    len(ids), summary["batches"], covered, total, covered * 100.0 / total))
missing = [i for i in range(1, summary["batches"] + 1) if i not in ids]
print("缺失批次:", missing[:40], "..." if len(missing) > 40 else "")
