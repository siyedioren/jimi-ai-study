#!/usr/bin/env python3
"""
从 oj_problems_CPP2025184/*.md 解析全部 161 道题目，
生成 public/data/problems.json
"""
import os
import json
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

MD_DIR = "oj_problems_CPP2025184"
OUT_PATH = "public/data/problems.json"

# 从现有 json 加载补充数据（timeLimit / memoryLimit / difficulty / tags）
existing = {}
if os.path.exists(OUT_PATH):
    try:
        old = json.load(open(OUT_PATH, encoding='utf-8'))
        for p in old:
            existing[p["id"]] = p
    except Exception as e:
        print("Warning: failed to load existing json:", e)


def infer_tags(title: str) -> list:
    """根据标题前缀推断分类标签"""
    if title.startswith("选择"):
        return ["选择结构"]
    if title.startswith("循环"):
        return ["循环结构"]
    if title.startswith("函数"):
        return ["函数"]
    if title.startswith("数组指针"):
        return ["数组指针"]
    if title.startswith("类与对象"):
        return ["类与对象"]
    if title.startswith("继承") or title.startswith("多态") or "继承" in title[:10]:
        return ["继承多态"]
    if title.startswith("顺序"):
        return ["顺序结构"]
    return ["综合"]


def infer_difficulty(pid: int) -> str:
    """简单启发式：id < 1100 为 easy，< 1150 为 medium，其余 hard"""
    if pid < 1100:
        return "easy"
    if pid < 1150:
        return "medium"
    return "hard"


def parse_md(filepath: str) -> dict:
    text = open(filepath, encoding='utf-8').read()

    # 1. 提取 id 和 title
    m = re.search(r'^#\s*(\d+):\s*(.+)', text, re.MULTILINE)
    if not m:
        return None
    pid = m.group(1)
    title = m.group(2).strip()

    # 2. 提取题目描述
    content = ""
    cm = re.search(r'##\s*题目描述\s*\n+(.*?)(?=\n##\s*样例输入)', text, re.DOTALL)
    if cm:
        content = cm.group(1).strip()
    else:
        cm2 = re.search(r'^#\s*\d+:.+\n+(.*?)(?=\n##)', text, re.DOTALL | re.MULTILINE)
        if cm2:
            content = cm2.group(1).strip()

    # 3. 提取样例输入
    sample_input = ""
    sim = re.search(r'##\s*样例输入.*?\n+\s*Copy\s*\n+(.*?)(?=\n##\s*样例输出)', text, re.DOTALL)
    if sim:
        sample_input = sim.group(1).strip()

    # 4. 提取样例输出
    sample_output = ""
    som = re.search(r'##\s*样例输出.*?\n+\s*Copy\s*\n+(.*?)(?=\n##|\Z)', text, re.DOTALL)
    if som:
        sample_output = som.group(1).strip()

    # 5. 合并/补充数据
    old = existing.get(pid, {})
    tags = old.get("tags") or infer_tags(title)
    difficulty = old.get("difficulty") or infer_difficulty(int(pid))
    time_limit = old.get("timeLimit") or "1.000"
    memory_limit = old.get("memoryLimit") or "128"

    return {
        "id": pid,
        "title": title,
        "difficulty": difficulty,
        "mode": old.get("mode") or "cpp_basic",
        "content": content,
        "sampleInput": sample_input,
        "sampleOutput": sample_output,
        "timeLimit": time_limit,
        "memoryLimit": memory_limit,
        "tags": tags,
    }


def main():
    files = sorted([f for f in os.listdir(MD_DIR) if f.endswith(".md")])
    problems = []
    for f in files:
        p = parse_md(os.path.join(MD_DIR, f))
        if p:
            problems.append(p)
        else:
            print(f"  [SKIP] 无法解析: {f}")

    problems.sort(key=lambda x: int(x["id"]))
    with open(OUT_PATH, "w", encoding="utf-8") as out:
        json.dump(problems, out, ensure_ascii=False, indent=2)

    print(f"生成完成: {len(problems)} 题 -> {OUT_PATH}")


if __name__ == "__main__":
    main()
