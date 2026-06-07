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


def find_section(lines: list, section_name: str) -> tuple:
    """找到指定 section 的起始和结束索引 (start_idx, end_idx)"""
    start_idx = None
    for i, line in enumerate(lines):
        if re.search(rf'##\s*{re.escape(section_name)}', line):
            start_idx = i
            break
    if start_idx is None:
        return None, None
    end_idx = len(lines)
    for i in range(start_idx + 1, len(lines)):
        if lines[i].strip().startswith('## '):
            end_idx = i
            break
    return start_idx, end_idx


def extract_section_content(lines: list, start_idx: int, end_idx: int) -> str:
    """提取 section 内容，去掉开头/尾部的空行和 Copy 标记"""
    content_lines = lines[start_idx + 1:end_idx]
    while content_lines and (not content_lines[0].strip() or content_lines[0].strip() == 'Copy'):
        content_lines = content_lines[1:]
    while content_lines and (not content_lines[-1].strip() or content_lines[-1].strip() == 'Copy'):
        content_lines = content_lines[:-1]
    return '\n'.join(content_lines).strip()


def parse_md(filepath: str) -> dict:
    text = open(filepath, encoding='utf-8').read()
    lines = text.split('\n')

    # 1. 提取 id 和 title
    first_line = lines[0].strip()
    if not first_line.startswith('# '):
        return None
    m = re.match(r'# (\d+):\s*(.+)', first_line)
    if not m:
        return None
    pid = m.group(1)
    title = m.group(2).strip()

    # 2. 提取题目描述
    desc_start, desc_end = find_section(lines, '题目描述')
    if desc_start is not None:
        content = extract_section_content(lines, desc_start, desc_end)
    else:
        # fallback: 标题后到第一个 ## 之前（去掉题目链接行）
        first_section_idx = None
        for i, line in enumerate(lines[1:], start=1):
            if line.strip().startswith('## '):
                first_section_idx = i
                break
        if first_section_idx is not None:
            content_lines = lines[1:first_section_idx]
            content_lines = [
                l for l in content_lines
                if l.strip() and not l.strip().startswith('题目链接:')
            ]
            content = '\n'.join(content_lines).strip()
        else:
            content = ''

    # 如果 content 仍为空，用 title 作为 fallback
    if not content:
        content = title

    # 3. 提取样例输入（优先用"样例输入"，fallback 到"输入"）
    sample_input = ""
    sin_start, sin_end = find_section(lines, '样例输入')
    if sin_start is not None:
        sample_input = extract_section_content(lines, sin_start, sin_end)
    else:
        # fallback: 尝试 "输入" section
        in_start, in_end = find_section(lines, '输入')
        if in_start is not None:
            sample_input = extract_section_content(lines, in_start, in_end)

    # 4. 提取样例输出（优先用"样例输出"，fallback 到"输出"）
    sample_output = ""
    sout_start, sout_end = find_section(lines, '样例输出')
    if sout_start is not None:
        sample_output = extract_section_content(lines, sout_start, sout_end)
    else:
        # fallback: 尝试 "输出" section
        out_start, out_end = find_section(lines, '输出')
        if out_start is not None:
            sample_output = extract_section_content(lines, out_start, out_end)

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

    # 统计
    empty_content = [p["id"] for p in problems if not p["content"].strip()]
    empty_sample_in = [p["id"] for p in problems if not p["sampleInput"].strip()]
    empty_sample_out = [p["id"] for p in problems if not p["sampleOutput"].strip()]
    print(f"生成完成: {len(problems)} 题 -> {OUT_PATH}")
    if empty_content:
        print(f"  [WARN] content 为空 ({len(empty_content)} 题): {empty_content[:10]}...")
    if empty_sample_in:
        print(f"  [WARN] sampleInput 为空 ({len(empty_sample_in)} 题): {empty_sample_in}")
    if empty_sample_out:
        print(f"  [WARN] sampleOutput 为空 ({len(empty_sample_out)} 题): {empty_sample_out}")


if __name__ == "__main__":
    main()
