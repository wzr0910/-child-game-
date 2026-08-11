// Edge Function 逻辑冒烟 —— 用 Node 22+ 直接 import
// 由于函数 export default 接收 (context) 返回 Response，我们用 mock context 喂进去。

import onRequest from "../node-functions/api/gallery.js";

const env = {
  CLOUDBASE_ENV_ID: "child-game-d4gxbdz4zce7a5c3b",
  CLOUDBASE_PUBLISHABLE_KEY_1:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbm9uIiwiaWF0IjoxNzI0MDAwMDAwfQ",
  CLOUDBASE_PUBLISHABLE_KEY_2: ".FAKEFAKEFAKEFAKEFAKEFAKEFAKE",
};

// 模拟 global fetch 不被测；先看 ?debug=1 时无 key 应报 configured:false
const debugResp = await onRequest({
  env: {
    CLOUDBASE_ENV_ID: undefined,
    CLOUDBASE_PUBLISHABLE_KEY_1: undefined,
  },
  request: new Request("https://test/api/gallery?debug=1", { method: "GET" }),
});
console.log("===== no env, debug=1 =====");
console.log("status:", debugResp.status);
console.log("body:", await debugResp.text());

// 有 env 但没 key
const noKeyResp = await onRequest({
  env: {
    CLOUDBASE_ENV_ID: "child-game-d4gxbdz4zce7a5c3b",
  },
  request: new Request("https://test/api/gallery", { method: "GET" }),
});
console.log("===== env but no key, normal GET =====");
console.log("status:", noKeyResp.status);
console.log("body:", await noKeyResp.text());

// POST 无效 JSON
const badJsonResp = await onRequest({
  env,
  request: new Request("https://test/api/gallery", {
    method: "POST",
    body: "not json",
  }),
});
console.log("===== POST invalid JSON =====");
console.log("status:", badJsonResp.status);
console.log("body:", await badJsonResp.text());

// POST 空内容
const emptyDeclResp = await onRequest({
  env,
  request: new Request("https://test/api/gallery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ declaration_text: "" }),
  }),
});
console.log("===== POST empty declaration =====");
console.log("status:", emptyDeclResp.status);
console.log("body:", await emptyDeclResp.text());

console.log("\nDone. 真实请求会打 CloudBase，本测试只在无凭据分支走通即视为逻辑 OK。");
