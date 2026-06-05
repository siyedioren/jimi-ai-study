# 在 WSL2 中使用 Kimi Code CLI 完整指南

> 适用场景：Windows 上 Kimi Code CLI 的 `--print` 模式存在兼容性问题，通过 WSL2 运行 Linux 版本可解决。

---

## 背景

Kimi Code CLI 在 Windows 上的 `--print`（非交互/自动化）模式存在兼容性问题：
- 报错：`Unsupported OS: Windows`
- 进程卡在 `StepBegin(n=1)` 无响应

**解决方案**：在 WSL2 Ubuntu 中安装 Linux 原生版本的 kimi-cli，通过 Windows 侧工具调用。

---

## 前置条件

| 项目 | 要求 |
|---|---|
| Windows | Windows 10/11，已启用 WSL2 |
| WSL2 发行版 | Ubuntu（或其他 Debian 系） |
| 网络 | 能访问 PyPI 或国内镜像源 |

检查 WSL2 状态：
```powershell
wsl -l -v
```
应显示 `Ubuntu Running 2`。

---

## 安装步骤

### Step 1: 在 WSL2 中安装 pip

Ubuntu 默认可能缺少 pip，用官方脚本安装：

```bash
wsl -e bash -c "python3 -c \"import urllib.request; urllib.request.urlretrieve('https://bootstrap.pypa.io/get-pip.py', '/tmp/get-pip.py')\""
wsl -e bash -c "python3 /tmp/get-pip.py --user"
```

验证：
```bash
wsl -e bash -c "export PATH=\$HOME/.local/bin:\$PATH && pip3 --version"
```

---

### Step 2: 配置国内镜像源（可选，加速下载）

```bash
wsl -e bash -c "mkdir -p ~/.config/pip && cat > ~/.config/pip/pip.conf << 'EOF'
[global]
index-url = https://pypi.tuna.tsinghua.edu.cn/simple
trusted-host = pypi.tuna.tsinghua.edu.cn
EOF"
```

---

### Step 3: 安装 kimi-cli

```bash
wsl -e bash -c "export PATH=\$HOME/.local/bin:\$PATH && pip3 install --user --break-system-packages kimi-cli"
```

> `--break-system-packages` 是必需的，因为 Ubuntu 的 Python 受 PEP 668 保护。

验证安装：
```bash
wsl -e bash -c "export PATH=\$HOME/.local/bin:\$PATH && kimi --version"
```

预期输出：`kimi, version 1.46.0`（或更高版本）

---

### Step 4: 复制认证信息

Kimi Code 需要登录凭证。如果你在 Windows 上已通过 VS Code 扩展登录，直接复制凭证文件：

```bash
wsl -e bash -c "mkdir -p ~/.kimi/credentials && cp /mnt/c/Users/$env:USERNAME/.kimi/credentials/kimi-code.json ~/.kimi/credentials/"
```

> 将 `$env:USERNAME` 替换为你的 Windows 用户名。

---

### Step 5: 验证功能

测试 `--print` 模式（这是 Windows 上失败的模式）：

```bash
wsl -e bash -c "export PATH=\$HOME/.local/bin:\$PATH && cd /mnt/d/111/jimi-ai-study-main && kimi --print --quiet --no-thinking --prompt 'Say hello in one word.'"
```

预期输出：`Hello`

---

## 桥接脚本（从 Windows 调用 WSL2 kimi）

创建 `kimi-bridge.js`，让 Node.js 脚本或 Kimi Work 能调用 WSL2 中的 kimi：

```javascript
const { spawn } = require('child_process');

/**
 * 通过 WSL2 调用 kimi-cli
 * @param {string} prompt - 发送给 kimi 的提示词
 * @param {string} workDir - 工作目录（Windows 路径，自动转换）
 * @param {Object} options - 可选参数
 * @param {boolean} options.thinking - 是否启用思考模式
 * @param {boolean} options.yolo - 是否自动批准所有操作
 * @param {number} options.timeout - 超时时间（毫秒）
 * @returns {Promise<string>} - kimi 的回复文本
 */
function callKimi(prompt, workDir = process.cwd(), options = {}) {
  const {
    thinking = false,
    yolo = true,
    timeout = 300000
  } = options;

  // Windows 路径 → WSL 路径（如 D:\project → /mnt/d/project）
  const wslPath = workDir
    .replace(/^([A-Za-z]):/, '/mnt/$1')
    .replace(/\\/g, '/')
    .toLowerCase();

  const args = [
    '-e', 'bash', '-c',
    `export PATH=\$HOME/.local/bin:\$PATH && cd "${wslPath}" && kimi --print --quiet ${thinking ? '' : '--no-thinking'} ${yolo ? '--yolo' : ''} --prompt "${prompt.replace(/"/g, '\\"')}"`
  ];

  return new Promise((resolve, reject) => {
    const child = spawn('wsl.exe', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`kimi call timed out after ${timeout}ms`));
    }, timeout);

    child.on('close', (code) => {
      clearTimeout(timer);

      // 过滤掉 "To resume this session:" 和 wsl 提示
      const lines = stdout.split('\n').filter(line =>
        !line.includes('To resume this session:') &&
        !line.includes('wsl:')
      );

      const result = lines.join('\n').trim();

      if (code !== 0 && !result) {
        reject(new Error(`kimi exited with code ${code}: ${stderr}`));
      } else {
        resolve(result);
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

module.exports = { callKimi };
```

---

## 使用示例

### 示例 1：直接调用

```javascript
const { callKimi } = require('./kimi-bridge.js');

(async () => {
  const result = await callKimi(
    '请分析 app/page.tsx 的功能',
    'D:/111/jimi-ai-study-main'
  );
  console.log(result);
})();
```

### 示例 2：让 kimi 修改文件

```javascript
const result = await callKimi(
  '请在 README.md 中添加项目简介',
  'D:/111/jimi-ai-study-main'
);
```

### 示例 3：复杂任务（带思考模式）

```javascript
const result = await callKimi(
  '请重构这个项目的组件结构，给出具体方案',
  'D:/111/jimi-ai-study-main',
  { thinking: true, timeout: 600000 }
);
```

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|---|---|---|
| `pip3: command not found` | Python 未安装 pip | 使用 `get-pip.py` 安装（见 Step 1） |
| `externally-managed-environment` | PEP 668 保护 | 加 `--break-system-packages` 参数 |
| 下载速度极慢 | 网络问题 | 配置清华/阿里云 PyPI 镜像（见 Step 2） |
| `401 invalid_authentication` | 未登录或凭证过期 | 复制 Windows 的 `kimi-code.json`（见 Step 4） |
| 路径解析错误 | Windows 路径格式问题 | 确保使用 `wsl.exe -e bash -c` 方式调用 |

---

## 架构图

```
┌─────────────────────────────────────────┐
│           Windows 侧                     │
│  ┌─────────────┐    ┌──────────────┐   │
│  │ Kimi Work   │───→│ kimi-bridge  │   │
│  │ (Node.js)   │    │   .js        │   │
│  └─────────────┘    └──────┬───────┘   │
│                              │          │
│                         wsl.exe -e bash │
└──────────────────────────────┼────────┘
                               │
┌──────────────────────────────┼────────┐
│           WSL2 Ubuntu        │         │
│  ┌───────────────────────────┘        │
│  │ ~/.local/bin/kimi                  │
│  │   --print --prompt "..."           │
│  │         │                          │
│  │         ↓                          │
│  │   Moonshot AI API                  │
│  └────────────────────────────────────┘
```

---

## 总结

| 步骤 | 命令 | 目的 |
|---|---|---|
| 1 | 安装 pip | 获取 Python 包管理器 |
| 2 | 配置镜像 | 加速下载 |
| 3 | `pip3 install kimi-cli` | 安装 Linux 版 kimi |
| 4 | 复制凭证 | 复用 Windows 登录状态 |
| 5 | 验证 `--print` | 确认自动化模式可用 |
| 6 | 使用桥接脚本 | 从 Windows 侧调用 WSL2 kimi |

**核心优势**：WSL2 中的 Linux 版 kimi-cli 完全支持 `--print` 自动化模式，可以执行文件读写、代码分析、项目重构等任务，而 Windows 原生版本在此场景下不可用。
