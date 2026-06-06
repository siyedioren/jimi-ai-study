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
