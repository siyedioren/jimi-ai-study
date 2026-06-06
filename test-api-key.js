/**
 * 测试 Moonshot API Key 是否有效
 * 用法: node test-api-key.js
 * 它会读取 .env.local 中的 OPENAI_API_KEY
 */
const fs = require("fs");
const path = require("path");

// 尝试读取 .env.local
const envPath = path.join(__dirname, ".env.local");
let apiKey = "";

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  const match = envContent.match(/OPENAI_API_KEY=(.+)/);
  if (match) {
    apiKey = match[1].trim();
    // 去掉可能的引号
    apiKey = apiKey.replace(/^["']|["']$/g, "");
  }
}

if (!apiKey) {
  console.error("❌ 未找到 OPENAI_API_KEY，请检查 .env.local 文件");
  process.exit(1);
}

console.log(`🔑 API Key 前 8 位: ${apiKey.slice(0, 8)}...`);
console.log(`🔑 API Key 长度: ${apiKey.length} 字符`);

async function testKey() {
  try {
    const res = await fetch("https://api.moonshot.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "moonshot-v1-8k",
        messages: [{ role: "user", content: "你好" }],
        max_tokens: 10,
      }),
    });

    const status = res.status;
    const body = await res.text();

    console.log(`\n📡 HTTP 状态码: ${status}`);

    if (status === 200) {
      console.log("✅ API Key 有效！可以正常调用 Moonshot API");
    } else if (status === 401) {
      console.log("❌ API Key 无效或已过期 (401 Unauthorized)");
      console.log("   请前往 https://platform.moonshot.cn/console/api-keys 重新获取");
    } else if (status === 429) {
      console.log("⚠️ 请求过于频繁 (429 Rate Limited)，请稍后再试");
    } else {
      console.log(`⚠️ 未知错误: ${status}`);
      try {
        const json = JSON.parse(body);
        console.log("   响应:", JSON.stringify(json, null, 2));
      } catch {
        console.log("   响应:", body.slice(0, 500));
      }
    }
  } catch (err) {
    console.error("❌ 网络请求失败:", err.message);
    console.error("   请检查网络连接或 API 地址是否正确");
  }
}

testKey();
