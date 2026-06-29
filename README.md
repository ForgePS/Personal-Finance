# Money Command

A fully functional personal finance app inspired by Monarch Money. Track accounts, transactions, budgets, goals, and cash flow — all in one beautiful dashboard.

![Money Command](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Prisma](https://img.shields.io/badge/Prisma-7-teal)

## Features

- **Dashboard** — Net worth overview, income vs expenses, spending by category, recent transactions, and goals at a glance
- **Accounts** — Manage checking, savings, credit cards, investments, loans, and cash accounts with real-time balances
- **Bank Linking** — Connect real bank accounts via Plaid to auto-import balances and transactions
- **Transactions** — Add, search, and filter income and expenses across all accounts
- **Budgets** — Set monthly category budgets with visual progress bars and over-budget alerts
- **Goals** — Create savings goals with progress tracking and target dates
- **Cash Flow** — 6-month income/expense trends with savings rate analysis

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** SQLite with Prisma ORM 7
- **Styling:** Tailwind CSS 4
- **Charts:** Recharts
- **Icons:** Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Install dependencies
npm install

# Set up database (migrate + seed with sample data)
npm run db:setup

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Connect Your Bank Accounts

Money Command uses [Plaid](https://plaid.com) to securely link bank accounts (same technology used by Monarch, Venmo, and thousands of finance apps).

1. Sign up for free sandbox keys at [dashboard.plaid.com](https://dashboard.plaid.com/signup)
2. Copy `.env.example` to `.env` and add your keys:

```bash
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_sandbox_secret
PLAID_ENV=sandbox
```

3. Restart the dev server (`npm run dev`)
4. Go to **Accounts** → click **Connect Bank**
5. In sandbox mode, use test credentials: `user_good` / `pass_good`

For production with real banks, apply for Plaid production access and set `PLAID_ENV=production`.

### Deploy to Firebase (uses your existing project)

Your Firebase project **money-command-3ee1b** already has the APIs — see **[FIREBASE_EXISTING.md](./FIREBASE_EXISTING.md)**.

Uses **Firestore** (your Firebase database) + **App Hosting** + your existing **Plaid secrets**.

### Deploy to Google Cloud (alternative)

Deploy on **Cloud Run + Cloud SQL** — all within your Google Cloud project. See **[GCP_DEPLOY.md](./GCP_DEPLOY.md)**.

```bash
gcloud auth login
gcloud config set project money-command-3ee1b
./scripts/deploy-gcp.sh
```

### Deploy to Firebase App Hosting (alternative)

See **[FIREBASE_DEPLOY.md](./FIREBASE_DEPLOY.md)** if you prefer Firebase's GitHub auto-deploy.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:setup` | Migrate + seed in one step |

## Project Structure

```
src/
├── app/                  # Next.js App Router pages & API routes
│   ├── api/              # REST API endpoints
│   ├── accounts/         # Account management pages
│   ├── transactions/     # Transaction list page
│   ├── budgets/          # Budget tracking page
│   ├── goals/            # Savings goals page
│   └── cash-flow/        # Cash flow analysis page
├── components/           # React components
│   ├── ui/               # Reusable UI primitives
│   └── modals/           # Add account/transaction/goal modals
└── lib/                  # Database, services, utilities
prisma/
├── schema.prisma         # Database schema
└── seed.ts               # Sample data seeder
```

## Sample Data

The seed script creates realistic demo data including:
- 5 accounts (checking, savings, credit card, brokerage, mortgage)
- 14 categories (income and expense)
- 19 transactions across multiple months
- Monthly budgets for 8 spending categories
- 3 savings goals

## License

MIT
