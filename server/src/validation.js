import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(72)
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(72)
});

export const transactionSchema = z.object({
  title: z.string().trim().min(1).max(100),
  amount: z.coerce.number().positive().finite().max(999999999),
  type: z.enum(["income", "expense"]),
  category: z.string().trim().min(1).max(40),
  date: z.coerce.date(),
  note: z.string().trim().max(500).optional().nullable()
});
