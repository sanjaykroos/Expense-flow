import test from "node:test";
import assert from "node:assert/strict";
import { registerSchema, transactionSchema } from "../src/validation.js";

test("registration rejects a short password", () => {
  const result = registerSchema.safeParse({ name: "Kim", email: "kim@example.com", password: "short" });
  assert.equal(result.success, false);
});

test("registration accepts valid fields", () => {
  const result = registerSchema.safeParse({ name: "Kim", email: "kim@example.com", password: "safe-password-123" });
  assert.equal(result.success, true);
});

test("transaction rejects zero or negative amount", () => {
  const result = transactionSchema.safeParse({
    title: "Lunch", amount: 0, type: "expense", category: "Food", date: "2026-10-20"
  });
  assert.equal(result.success, false);
});

test("transaction accepts a valid expense", () => {
  const result = transactionSchema.safeParse({
    title: "Lunch", amount: 120, type: "expense", category: "Food", date: "2026-10-20"
  });
  assert.equal(result.success, true);
});
