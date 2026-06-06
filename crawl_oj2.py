#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
爬取 C++ OJ 题目（根据ID列表，使用 cookie）
"""

import urllib.request
import re
import os
import time

BASE_URL = "http://59.73.87.16"
HEADERS = {
    "Cookie": "PHPSESSID=jv2f7sd9hq9dvqs2i3cf41pn1s",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
}

# CPP2025184 通过的 161 道题
PROBLEM_IDS = [
    1000, 1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009,
    1010, 1011, 1012, 1013, 1014, 1015, 1016, 1017, 1018, 1019,
    1020, 1021, 1022, 1023, 1024, 1025, 1027, 1028, 1029, 1030,
    1031, 1032, 1033, 1034, 1035, 1036, 1037, 1038, 1039, 1040,
    1041, 1042, 1043, 1044, 1045, 1046, 1047, 1048, 1049, 1050,
    1051, 1052, 1053, 1054, 1055, 1056, 1057, 1058, 1059, 1060,
    1061, 1062, 1063, 1064, 1065, 1066, 1067, 1068, 1069, 1070,
    1071, 1072, 1073, 1074, 1075, 1077, 1078, 1079, 1080, 1081,
    1082, 1083, 1085, 1086, 1087, 1089, 1090, 1091, 1092, 1093,
    1094, 1095, 1096, 1097, 1098, 1099, 1100, 1101, 1102, 1103,
    1104, 1105, 1106, 1107, 1110, 1111, 1112, 1113, 1114, 1118,
    1119, 1120, 1121, 1122, 1123, 1124, 1125, 1126, 1127, 1128,
    1129, 1130, 1133, 1134, 1135, 1136, 1137, 1138, 1139, 1140,
    1141, 1142, 1143, 1144, 1145, 1146, 1147, 1149, 1174, 1175,
    1189, 1190, 1192, 1193, 1194, 1195, 1196, 1197, 1198, 1199,
    1200, 1201, 1202, 1203, 1204, 1205, 1206, 1207, 1208, 1209,
    1210,
]

def fetch(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        content = resp.read()
        for enc in ("gbk", "gb2312", "utf-8"):
            try:
                return content.decode(enc)
            except UnicodeDecodeError:
                continue
        return content.decode("utf-8", errors="ignore")

def html_to_text(html):
    text = re.sub(r"<br\s*/?>", "\n", html, flags=re.IGNORECASE)
    text = re.sub(r"</p>\s*<p[^>]*>", "\n\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = text.replace("&nbsp;", " ")
    text = text.replace("&lt;", "<")
    text = text.replace("&gt;", ">")
    text = text.replace("&amp;", "&")
    text = text.replace("&quot;", "'")
    text = text.replace("&#39;", "'")
    return text.strip()

def get_problem_detail(pid):
    html = fetch(f"{BASE_URL}/problem.php?id={pid}")
    
    # Try new template first (<h3> title + panel-body)
    title_match = re.search(r"<h3>(.*?)</h3>", html, re.DOTALL)
    if title_match:
        title = html_to_text(title_match.group(1))
        sections = {}
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
        return {"id": pid, "title": title, "sections": sections}
    
    # Fallback to old template (<h2> title + jumbotron/content)
    title_match = re.search(r"<center><h2>(\d+):\s*(.*?)</h2></center>", html, re.DOTALL)
    if not title_match:
        title_match = re.search(r"<title>(.*?)</title>", html, re.DOTALL)
        title = html_to_text(title_match.group(1)) if title_match else f"Problem {pid}"
    else:
        title = html_to_text(title_match.group(2))
    
    sections = {}
    # Old template: content is usually in a div with class 'content' or inside <p> tags after description heading
    desc_match = re.search(r"<h4>[^<]*题目描述[^<]*</h4>\s*<div[^>]*>(.*?)</div>", html, re.DOTALL)
    if desc_match:
        sections["题目描述"] = html_to_text(desc_match.group(1))
    
    # Try to find input/output/sample
    for label in ["输入", "输出", "样例输入", "样例输出"]:
        m = re.search(rf"<h4>[^<]*{label}[^<]*</h4>\s*<div[^>]*>(.*?)</div>", html, re.DOTALL)
        if m:
            sections[label] = html_to_text(m.group(1))
    
    return {"id": pid, "title": title, "sections": sections}

def save_problem(problem, output_dir="oj_problems_CPP2025184"):
    os.makedirs(output_dir, exist_ok=True)
    pid = problem["id"]
    title = problem["title"]
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
    output_dir = "oj_problems_CPP2025184"
    total = len(PROBLEM_IDS)
    
    for i, pid in enumerate(PROBLEM_IDS, 1):
        print(f"[{i}/{total}] 爬取题目 {pid}...")
        try:
            detail = get_problem_detail(pid)
            filepath = save_problem(detail, output_dir)
            print(f"  [OK] {os.path.basename(filepath)}")
        except Exception as e:
            print(f"  [ERR] {e}")
        time.sleep(0.2)
    
    print(f"\n完成！共 {total} 道题目保存在 ./{output_dir}/")

if __name__ == "__main__":
    main()
