#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
爬取 C++ OJ 用户通过的题目
"""

import urllib.request
import re
import os
import time

COOKIE = "PHPSESSID=jv2f7sd9hq9dvqs2i3cf41pn1s"
BASE_URL = "http://59.73.87.16"
HEADERS = {
    "Cookie": COOKIE,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
}

def fetch(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        content = resp.read()
        # This OJ uses GBK encoding
        for enc in ("gbk", "gb2312", "utf-8"):
            try:
                return content.decode(enc)
            except UnicodeDecodeError:
                continue
        return content.decode("utf-8", errors="ignore")

def html_to_text(html):
    """Convert simple HTML to plain text"""
    # Replace <br> with newlines
    text = re.sub(r"<br\s*/?>", "\n", html, flags=re.IGNORECASE)
    # Replace <p> tags with newlines
    text = re.sub(r"</p>\s*<p[^>]*>", "\n\n", text, flags=re.IGNORECASE)
    # Remove remaining HTML tags
    text = re.sub(r"<[^>]+>", "", text)
    # Unescape HTML entities
    text = text.replace("&nbsp;", " ")
    text = text.replace("&lt;", "<")
    text = text.replace("&gt;", ">")
    text = text.replace("&amp;", "&")
    text = text.replace("&quot;", "'")
    text = text.replace("&#39;", "'")
    return text.strip()

def get_solved_problems():
    """从 problemset.php 获取用户通过的题目列表"""
    html = fetch(f"{BASE_URL}/problemset.php")
    
    rows = re.findall(r"<tr class='(?:even|odd)row'>(.*?)</tr>", html, re.DOTALL)
    
    solved = []
    for row in rows:
        if "label-success" in row and ">Y<" in row:
            id_match = re.search(r"problem\.php\?id=(\d+)", row)
            title_match = re.search(r"problem\.php\?id=\d+'>([^<]+)</a>", row)
            if id_match and title_match:
                pid = id_match.group(1)
                title = title_match.group(1).strip()
                solved.append({"id": pid, "title": title})
    
    return solved

def get_problem_detail(pid):
    """获取题目详情"""
    html = fetch(f"{BASE_URL}/problem.php?id={pid}")
    
    # Extract title from h3
    title_match = re.search(r"<h3>(.*?)</h3>", html, re.DOTALL)
    title = html_to_text(title_match.group(1)) if title_match else f"Problem {pid}"
    
    sections = {}
    
    # Find all panel sections
    panels = re.findall(
        r"<div class='panel-heading'>\s*<h4>(.*?)</h4>.*?</div>\s*"
        r"<div class='panel-body(?: content)?'>(.*?)</div>",
        html, re.DOTALL
    )
    
    for heading, content in panels:
        heading = html_to_text(heading)
        content = html_to_text(content)
        if heading and content:
            sections[heading] = content
    
    return {
        "id": pid,
        "title": title,
        "sections": sections,
    }

def save_problem(problem, output_dir="oj_problems"):
    """保存题目到文件"""
    os.makedirs(output_dir, exist_ok=True)
    
    pid = problem["id"]
    title = problem["title"]
    
    # Clean title for filename
    safe_title = re.sub(r'[^\w\u4e00-\u9fff]+', '_', title).strip('_')
    filename = os.path.join(output_dir, f"{pid}_{safe_title}.md")
    
    with open(filename, "w", encoding="utf-8") as f:
        f.write(f"# {title}\n\n")
        f.write(f"题目链接: {BASE_URL}/problem.php?id={pid}\n\n")
        
        for heading, content in problem["sections"].items():
            f.write(f"## {heading}\n\n")
            f.write(content)
            f.write("\n\n")
    
    return filename

def main():
    print("正在获取通过的题目列表...")
    solved = get_solved_problems()
    print(f"找到 {len(solved)} 道已通过的题目")
    
    output_dir = "oj_problems"
    
    for i, prob in enumerate(solved, 1):
        print(f"[{i}/{len(solved)}] 正在爬取题目 {prob['id']} - {prob['title']}...")
        try:
            detail = get_problem_detail(prob["id"])
            filepath = save_problem(detail, output_dir)
            print(f"  [OK] 已保存: {os.path.basename(filepath)}")
        except Exception as e:
            print(f"  [ERR] 失败: {e}")
        time.sleep(0.3)
    
    print(f"\n完成！共爬取 {len(solved)} 道题目，保存在 ./{output_dir}/ 目录")

if __name__ == "__main__":
    main()
