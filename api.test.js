const test = require("node:test");
const assert = require("node:assert");
const app = require("../app");

let server, base;
test.before(async () => {
  await new Promise((r) => (server = app.listen(0, r)));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => { server.closeAllConnections?.(); server.close(); });

const call = (path, opts = {}) => fetch(base + path, { signal: AbortSignal.timeout(1500), ...opts });
const post = (body) => call("/api/v1/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

test("GET /api/v1/events returns 200 and an array", async () => {
  const res = await call("/api/v1/events");
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(await res.json()));
});

test("GET /api/v1/events?maxFee=150 returns only events with fee <= 150", async () => {
  const res = await call("/api/v1/events?maxFee=150");
  assert.strictEqual(res.status, 200);
  const list = await res.json();
  assert.ok(list.length > 0 && list.every((e) => e.fee <= 150));
  assert.ok(!list.some((e) => e.fee === 250));
});

test("GET /api/v1/events/1 returns that event; unknown id returns 404 JSON", async () => {
  const ok = await call("/api/v1/events/1");
  assert.strictEqual(ok.status, 200);
  assert.strictEqual((await ok.json()).id, 1);
  const missing = await call("/api/v1/events/9999");
  assert.strictEqual(missing.status, 404);
  assert.ok((await missing.json()).error);
});

test("POST a valid event returns 201; fee defaults to 0", async () => {
  const res = await post({ title: "Chess Meet", capacity: 40 });
  assert.strictEqual(res.status, 201);
  const body = await res.json();
  assert.strictEqual(body.title, "Chess Meet");
  assert.strictEqual(body.capacity, 40);
  assert.strictEqual(body.fee, 0);
});

test("POST with a missing or blank title returns 400 JSON", async () => {
  for (const title of [undefined, "", "   "]) {
    const res = await post({ title, capacity: 10 });
    assert.strictEqual(res.status, 400, `title ${JSON.stringify(title)}`);
    assert.ok((await res.json()).error);
  }
});

test("POST with capacity outside 1-500 or not whole returns 400", async () => {
  for (const capacity of [0, 501, 2.5, -5, "10"]) {
    assert.strictEqual((await post({ title: "X", capacity })).status, 400, `capacity ${capacity}`);
  }
});

test("POST with a negative fee returns 400", async () => {
  assert.strictEqual((await post({ title: "X", capacity: 10, fee: -1 })).status, 400);
});

test("DELETE existing returns 200; unknown returns 404 JSON", async () => {
  const created = await (await post({ title: "Temp", capacity: 5 })).json();
  assert.strictEqual((await call(`/api/v1/events/${created.id}`, { method: "DELETE" })).status, 200);
  const res = await call("/api/v1/events/9999", { method: "DELETE" });
  assert.strictEqual(res.status, 404);
  assert.ok((await res.json()).error);
});

test("Unhandled error returns JSON 500 without a stack trace", async () => {
  const res = await call("/api/v1/boom");
  assert.strictEqual(res.status, 500);
  assert.match(res.headers.get("content-type"), /json/);
  assert.ok(!JSON.stringify(await res.json()).includes(" at "), "stack trace leaked");
});
