const test = require("node:test");
const assert = require("node:assert");
const EventModel = require("../models/Event");
const { formatValidationError } = require("../utils/formatError");

const good = { title: "Hack Night", date: "2026-11-05", capacity: 30 };
const errs = (o) => new EventModel({ ...good, ...o }).validateSync()?.errors || {};

test("a valid event passes; defaults: category tech, fee 0, createdAt a Date", () => {
  const doc = new EventModel(good);
  assert.strictEqual(doc.validateSync(), undefined);
  assert.strictEqual(doc.category, "tech");
  assert.strictEqual(doc.fee, 0);
  assert.ok(doc.createdAt instanceof Date);
});

test("title is required, trimmed and at most 80 characters", () => {
  assert.ok(errs({ title: undefined }).title);
  assert.strictEqual(new EventModel({ ...good, title: "  Quiz  " }).title, "Quiz");
  assert.ok(errs({ title: "x".repeat(81) }).title);
  assert.ok(!errs({ title: "x".repeat(80) }).title);
});

test("date must be a real date", () => {
  assert.ok(errs({ date: "banana" }).date);
  assert.ok(errs({ date: undefined }).date);
});

test("capacity must be a whole number from 1 to 500", () => {
  for (const capacity of [0, 501, 2.5]) assert.ok(errs({ capacity }).capacity, `capacity ${capacity}`);
  for (const capacity of [1, 500]) assert.ok(!errs({ capacity }).capacity, `capacity ${capacity}`);
});

test("fee cannot be negative; 0 is allowed", () => {
  assert.ok(errs({ fee: -1 }).fee);
  assert.ok(!errs({ fee: 0 }).fee);
});

test("category must be tech, cultural or sports", () => {
  assert.ok(errs({ category: "party" }).category);
  assert.ok(!errs({ category: "sports" }).category);
});

test("a cultural event cannot have capacity above 200 (other categories may)", () => {
  assert.ok(errs({ category: "cultural", capacity: 201 }).capacity);
  assert.ok(!errs({ category: "cultural", capacity: 200 }).capacity);
  assert.ok(!errs({ category: "tech", capacity: 300 }).capacity);
});

test("createdAt is set per document, not once at startup", async () => {
  const a = new EventModel(good);
  await new Promise((r) => setTimeout(r, 15));
  const b = new EventModel(good);
  assert.ok(b.createdAt.getTime() > a.createdAt.getTime());
});

test("formatValidationError returns a clean, plain object", () => {
  const err = new EventModel({ title: "", date: "banana", capacity: 0, fee: -1 }).validateSync();
  const out = formatValidationError(err);
  assert.strictEqual(out.error, "Validation failed");
  assert.ok(Array.isArray(out.details) && out.details.length === 4);
  assert.ok(out.details.every((d) => d.field && d.message));
  assert.ok(!(out instanceof Error) && !("errors" in out));
});
