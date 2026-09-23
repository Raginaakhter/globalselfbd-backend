async function testBackend() {
  const baseUrl = "http://localhost:5000";
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = "StrongPassword123!";

  console.log("=========================================");
  console.log("  TESTING BACKEND STANDALONE API SERVER  ");
  console.log("=========================================\n");

  try {
    // 1. Health check
    console.log("1. Testing GET /health...");
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData = await healthRes.json();
    console.log("Health Status:", healthRes.status, healthData);
    if (!healthRes.ok || healthData.status !== "ok") throw new Error("Health check failed");
    console.log("✅ Health check passed!\n");

    // 2. Site endpoint
    console.log("2. Testing GET /api/site...");
    const siteRes = await fetch(`${baseUrl}/api/site`);
    const siteData = await siteRes.json();
    console.log("Site Status:", siteRes.status, "categories:", siteData?.data?.categories?.length);
    if (!siteRes.ok || !siteData.success) throw new Error("Site data fetch failed");
    console.log("✅ Site data passed!\n");

    // 3. Products endpoint
    console.log("3. Testing GET /api/products...");
    const prodRes = await fetch(`${baseUrl}/api/products?limit=5`);
    const prodData = await prodRes.json();
    console.log("Products Status:", prodRes.status, "total:", prodData?.data?.total);
    if (!prodRes.ok || !prodData.success) throw new Error("Products fetch failed");
    console.log("✅ Products passed!\n");

    // 4. Products Featured
    console.log("4. Testing GET /api/products/featured...");
    const featRes = await fetch(`${baseUrl}/api/products/featured`);
    const featData = await featRes.json();
    console.log("Featured Status:", featRes.status, "bestSellers:", featData?.data?.bestSellers?.length);
    if (!featRes.ok || !featData.success) throw new Error("Featured products failed");
    console.log("✅ Featured products passed!\n");

    // 5. Auth Register
    console.log(`5. Testing POST /api/auth/register with ${testEmail}...`);
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-suite": "true" },
      body: JSON.stringify({
        name: "Test User",
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword,
      }),
    });
    const regData = await regRes.json();
    console.log("Register Status:", regRes.status, regData);
    if (!regRes.ok || !regData.success) throw new Error("Register failed");
    console.log("✅ Register passed!\n");

    // 6. Auth Login
    console.log(`6. Testing POST /api/auth/login with ${testEmail}...`);
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-test-suite": "true" },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    const loginData = await loginRes.json();
    console.log("Login Status:", loginRes.status, loginData);
    if (!loginRes.ok || !loginData.success) throw new Error("Login failed");
    const token = loginData.data.accessToken;
    console.log("✅ Login passed!\n");

    // 7. Auth Me
    console.log("7. Testing GET /api/auth/me...");
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const meData = await meRes.json();
    console.log("Me Status:", meRes.status, meData);
    if (!meRes.ok || !meData.success) throw new Error("Me failed");
    console.log("✅ Auth Me passed!\n");

    // 8. Cart Calculate
    console.log("8. Testing POST /api/cart/calculate...");
    const firstProduct = prodData.data.products[0];
    const cartRes = await fetch(`${baseUrl}/api/cart/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ id: firstProduct.id, qty: 1 }],
        zone: "dhaka",
      }),
    });
    const cartData = await cartRes.json();
    console.log("Cart Status:", cartRes.status, "total:", cartData?.data?.total);
    if (!cartRes.ok || !cartData.success) throw new Error("Cart calculate failed");
    console.log("✅ Cart calculate passed!\n");

    console.log("=========================================");
    console.log("  ALL BACKEND TESTS COMPLETED SUCCESSFULLY! ");
    console.log("=========================================\n");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

testBackend();
