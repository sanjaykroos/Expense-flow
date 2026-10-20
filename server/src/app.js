import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import { prisma } from "./db.js";
import { createToken, requireAuth } from "./auth.js";
import { loginSchema, registerSchema, transactionSchema } from "./validation.js";

export const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "20kb" }));

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "expenseflow-api" }));

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Check your name, email, and password (minimum 8 characters)." });

    const email = parsed.data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "An account with this email already exists." });

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await prisma.user.create({
      data: { name: parsed.data.name, email, passwordHash },
      select: { id: true, name: true, email: true }
    });
    return res.status(201).json({ token: createToken(user), user });
  } catch (error) { next(error); }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Enter a valid email and password." });

    const userRecord = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    const valid = userRecord && await bcrypt.compare(parsed.data.password, userRecord.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid email or password." });

    const user = { id: userRecord.id, name: userRecord.name, email: userRecord.email };
    return res.json({ token: createToken(user), user });
  } catch (error) { next(error); }
});

app.get("/api/transactions", requireAuth, async (req, res, next) => {
  try {
    const where = { userId: req.userId };
    if (["income", "expense"].includes(req.query.type)) where.type = req.query.type;
    const transactions = await prisma.transaction.findMany({
      where, orderBy: [{ date: "desc" }, { createdAt: "desc" }]
    });
    res.json(transactions.map(serializeTransaction));
  } catch (error) { next(error); }
});

app.post("/api/transactions", requireAuth, async (req, res, next) => {
  try {
    const parsed = transactionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid transaction. Check the amount, title, category, and date." });
    const transaction = await prisma.transaction.create({
    data: { ...parsed.data, userId: req.userId }
    });
    res.status(201).json(serializeTransaction(transaction));
  } catch (error) { next(error); }
});

app.patch("/api/transactions/:id", requireAuth, async (req, res, next) => {
  try {
    const parsed = transactionSchema.partial().safeParse(req.body);
    if (!parsed.success || Object.keys(req.body ?? {}).length === 0) {
      return res.status(400).json({ error: "Provide valid transaction fields to update." });
    }
    const existing = await prisma.transaction.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: "Transaction not found." });
    const data = { ...parsed.data };
    // SQLite stores this field as a number.
    const updated = await prisma.transaction.update({ where: { id: existing.id }, data });
    res.json(serializeTransaction(updated));
  } catch (error) { next(error); }
});

app.delete("/api/transactions/:id", requireAuth, async (req, res, next) => {
  try {
    const existing = await prisma.transaction.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!existing) return res.status(404).json({ error: "Transaction not found." });
    await prisma.transaction.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (error) { next(error); }
});

app.get("/api/summary", requireAuth, async (req, res, next) => {
  try {
    const rows = await prisma.transaction.findMany({ where: { userId: req.userId } });
    const income = rows.filter(t => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0);
    const expenses = rows.filter(t => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0);
    const byCategory = {};
    for (const row of rows.filter(t => t.type === "expense")) {
      byCategory[row.category] = (byCategory[row.category] || 0) + Number(row.amount);
    }
    res.json({
      income: round(income),
      expenses: round(expenses),
      balance: round(income - expenses),
      transactionCount: rows.length,
      byCategory: Object.entries(byCategory).map(([category, amount]) => ({ category, amount: round(amount) }))
        .sort((a, b) => b.amount - a.amount)
    });
  } catch (error) { next(error); }
});

function serializeTransaction(row) {
  return { ...row, amount: Number(row.amount) };
}
function round(value) { return Math.round((value + Number.EPSILON) * 100) / 100; }

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong. Check the server terminal for details." });
});
