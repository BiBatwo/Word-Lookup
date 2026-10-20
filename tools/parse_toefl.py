# -*- coding: utf-8 -*-
"""解析 toefl.txt -> 与现有考研词表合并（追加新增词），更新 words.js / batches / _summary.json。"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "toefl.txt")
DATA = os.path.join(ROOT, "data")
BATCHDIR = os.path.join(ROOT, "batches")
BATCH_SIZE = 20


def norm_word(w):
    w = w.replace("\u2011", "-").replace("\u2010", "-").replace("\u2013", "-")
    w = w.replace("\u00a0", " ")
    return w.strip()


def parse_txt(path):
    entries = {}
    order = []
    raw = open(path, encoding="utf-8-sig").read().splitlines()
    for line in raw:
        if not line.strip():
            continue
        if "\t" in line:
            w, t = line.split("\t", 1)
        else:
            parts = re.split(r"\s{2,}", line.strip(), maxsplit=1)
            if len(parts) == 2:
                w, t = parts
            else:
                w, t = line, ""
        w = norm_word(w)
        t = t.replace("\u00a0", " ").strip()
        t = re.sub(r"\s+", " ", t)
        if not w:
            continue
        if w not in entries:
            entries[w] = []
            order.append(w)
        if t and t not in entries[w]:
            entries[w].append(t)
    return order, entries


def load_words_js():
    s = open(os.path.join(DATA, "words.js"), encoding="utf-8").read().strip()
    i = s.find("=")
    obj = s[i + 1:].strip()
    if obj.endswith(";"):
        obj = obj[:-1].strip()
    # 去掉可能追加的 KY_KAOYAN_COUNT 语句（若已存在）
    obj = re.split(r";\s*window\.KY_KAOYAN_COUNT\s*=", obj)[0].strip()
    return json.loads(obj)


def main():
    order, entries = parse_txt(SRC)
    kaoyan = load_words_js()
    ks = set(x["w"] for x in kaoyan)

    overlap = [w for w in order if w in ks]
    new = [w for w in order if w not in ks]
    new.sort(key=lambda x: (x.lower(), x))

    print("== 统计 ==")
    print("托福去重后词数:", len(order))
    print("与考研重叠词数:", len(overlap))
    print("托福新增词数:", len(new))
    print("合并后总词数:", len(kaoyan) + len(new))

    # 合并：保留原考研词顺序，末尾追加新增词
    merged = kaoyan + [{"w": w, "t": entries[w]} for w in new]
    kaoyan_count = len(kaoyan)

    # 写 words.js
    with open(os.path.join(DATA, "words.js"), "w", encoding="utf-8") as f:
        f.write("window.KY_WORDS = ")
        json.dump(merged, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
        f.write("window.KY_KAOYAN_COUNT = %d;\n" % kaoyan_count)
    print("已写 words.js, 考研词边界=%d, 总词数=%d" % (kaoyan_count, len(merged)))

    # 生成新增词批次（从 257 开始）
    start_batch = len(kaoyan) // BATCH_SIZE + 1  # 257
    # 注意：考研最后一批可能不满，所以新增词起始批次 = 考研批次总数 + 1
    start_batch = ((len(kaoyan) + BATCH_SIZE - 1) // BATCH_SIZE) + 1
    offset = 0
    while offset < len(new):
        chunk = new[offset:offset + BATCH_SIZE]
        bid = start_batch + offset // BATCH_SIZE
        payload = {"id": bid, "words": [{"w": w, "t": entries[w]} for w in chunk]}
        with open(os.path.join(BATCHDIR, "batch-%03d.json" % bid), "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=1)
        offset += BATCH_SIZE
    new_batches = (len(new) + BATCH_SIZE - 1) // BATCH_SIZE
    print("新增词起始批次=%d, 新增批次数=%d, 批次范围=%d..%d" % (
        start_batch, new_batches, start_batch, start_batch + new_batches - 1))

    # 更新 _summary.json
    total_words = len(merged)
    total_batches = (total_words + BATCH_SIZE - 1) // BATCH_SIZE
    summary = {
        "total_words": total_words,
        "total_raw_lines": order.__len__() if False else 0,
        "batches": total_batches,
        "batch_size": BATCH_SIZE,
        "kaoyan_count": kaoyan_count,
        "toefl_new_count": len(new),
    }
    with open(os.path.join(BATCHDIR, "_summary.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print("已更新 _summary.json:", summary)

    # 记录新增词清单，方便后续分批生成
    with open(os.path.join(ROOT, "toefl_new_words.txt"), "w", encoding="utf-8") as f:
        for w in new:
            f.write(w + "\t" + " / ".join(entries[w]) + "\n")
    print("新增词清单已写 toefl_new_words.txt, 共 %d 词" % len(new))


if __name__ == "__main__":
    main()