# -*- coding: utf-8 -*-
"""校验 data/detail/detail-NNN.js 与 batches/batch-NNN.json 的一致性。"""
import json
import os
import re
import sys
import glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BATCHDIR = os.path.join(ROOT, "batches")
DETAILDIR = os.path.join(ROOT, "data", "detail")

REQ = ["origin", "chain", "mnemonic", "senses", "derived", "analogy", "sentences"]


def load_chunk(path):
    """把 detail-NNN.js 解析成 dict。"""
    s = open(path, encoding="utf-8").read().strip()
    i = s.find("=", s.find("window.KY_CHUNKS["))
    if i < 0:
        raise ValueError("找不到赋值语句")
    obj = s[i + 1:].strip()
    if obj.endswith(";"):
        obj = obj[:-1].strip()
    return json.loads(obj)


def check_one(idx):
    bp = os.path.join(BATCHDIR, "batch-%03d.json" % idx)
    dp = os.path.join(DETAILDIR, "detail-%03d.js" % idx)
    problems = []
    if not os.path.exists(dp):
        return None, ["文件缺失"]
    batch = json.load(open(bp, encoding="utf-8"))
    words = [x["w"] for x in batch["words"]]
    try:
        data = load_chunk(dp)
    except Exception as e:
        return None, ["JSON 解析失败: %s" % e]
    if not isinstance(data, dict):
        return None, ["顶层不是对象"]
    missing = [w for w in words if w not in data]
    extra = [w for w in data if w not in words]
    if missing:
        problems.append("缺词 %d: %s" % (len(missing), missing[:6]))
    if extra:
        problems.append("多词 %d: %s" % (len(extra), extra[:6]))
    for w in words:
        if w not in data:
            continue
        v = data[w]
        if not isinstance(v, dict):
            problems.append("%s: 不是对象" % w)
            continue
        for k in REQ:
            if k not in v:
                problems.append("%s: 缺字段 %s" % (w, k))
        if isinstance(v.get("sentences"), list):
            if len(v["sentences"]) < 2:
                problems.append("%s: 例句只有 %d 条" % (w, len(v["sentences"])))
            for s in v["sentences"]:
                if not isinstance(s, dict) or not s.get("en") or not s.get("zh"):
                    problems.append("%s: 例句缺 en/zh" % w)
                    break
                if not re.search(r"[\u4e00-\u9fa5]", s["zh"]):
                    problems.append("%s: 例句中文缺失" % w)
                    break
        if isinstance(v.get("senses"), list):
            if not v["senses"]:
                problems.append("%s: senses 为空" % w)
            for s in v["senses"]:
                if not isinstance(s, dict) or not s.get("pos") or not s.get("cn"):
                    problems.append("%s: sense 缺 pos/cn" % w)
                    break
        if isinstance(v.get("origin"), str) and len(v["origin"]) < 6:
            problems.append("%s: origin 过短" % w)
    return len(words), problems


def main():
    files = sorted(glob.glob(os.path.join(DETAILDIR, "detail-*.js")))
    total_problems = 0
    ok_batches = []
    for f in files:
        m = re.search(r"detail-(\d+)\.js$", f)
        idx = int(m.group(1))
        n, problems = check_one(idx)
        if problems:
            total_problems += len(problems)
            print("[batch %03d] %d 个问题" % (idx, len(problems)))
            for p in problems[:8]:
                print("   -", p)
        else:
            ok_batches.append(idx)
    print("---")
    print("已生成批次: %d, 全部合格批次: %d, 问题总数: %d" % (len(files), len(ok_batches), total_problems))
    print("合格批次ID:", ok_batches)


if __name__ == "__main__":
    main()
