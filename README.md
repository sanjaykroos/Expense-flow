# ExpenseFlow

A full-stack personal expense tracker built with React, Vite, Express, Prisma, and SQLite.


## Features
- Register and sign in with hashed passwords and JWT authentication
- Create, list, update, and delete income/expense transactions
- Dashboard totals for income, expenses, and balance
- Filter transactions by type and search description/category
- Responsive UI with a monthly summary chart
- API validation and basic automated tests
- SQLite database stored locally; Docker is not required

## Requirements
- Node.js 20+ (an active LTS release is recommended)
- Git

## Project structure
```text
expenseflow/
  client/       React frontend
  server/       Express API, Prisma schema, tests
  .gitignore
```

## 1. Configure the API
In PowerShell, open a terminal at the project root and run:
```powershell
cd server
Copy-Item .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

The API runs at `http://localhost:4000`. Prisma creates the SQLite database file from the `DATABASE_URL` in `server/.env`; the example uses `file:./dev.db` relative to `server/prisma/schema.prisma`.

Before using the app, replace the example `JWT_SECRET` in `server/.env` with a unique random secret of at least 32 characters.

## 2. Start the frontend
Open a second VS Code terminal at the project root:
```powershell
cd client
npm install
npm run dev
```
Open the local URL printed by Vite (usually `http://localhost:5173`).

## 3. First use
Register an account from the app. Add income and expense transactions. Transactions are scoped to the signed-in user.

## API endpoints
- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/transactions`
- `POST /api/transactions`
- `PATCH /api/transactions/:id`
- `DELETE /api/transactions/:id`
- `GET /api/summary`

Transaction endpoints require `Authorization: Bearer <token>`.

## Testing
From `server/`:
```powershell
npm test
```

## Security notes
This is a learning/portfolio starter, not a fully audited production service. Before public deployment, set strong unique secrets, use HTTPS, configure production CORS, add rate limiting, review token storage, and run dependency/security checks. Never commit `.env` files or a database containing personal data.

## GitHub
From the project root:
```powershell
git init
git add .
git commit -m "Initial ExpenseFlow full-stack app"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/expenseflow.git
git push -u origin main
```
Create an empty repository on GitHub first, and replace `YOUR-USERNAME`.
