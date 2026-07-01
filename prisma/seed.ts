import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { startOfMonth, subDays, subMonths } from "date-fns";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
});
const prisma = new PrismaClient({ adapter });

const TENANT_ID = process.env.DEV_TENANT_ID ?? "seed-tenant";

async function main() {
  await prisma.envelopeTransfer.deleteMany();
  await prisma.paySchedule.deleteMany();
  await prisma.scheduledExpense.deleteMany();
  await prisma.scheduleDateAdjustment.deleteMany();
  await prisma.envelopePoolFunding.deleteMany();
  await prisma.envelope.deleteMany();
  await prisma.envelopePool.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.category.deleteMany();
  await prisma.account.deleteMany();
  await prisma.plaidItem.deleteMany();
  await prisma.tenantMember.deleteMany();
  await prisma.tenant.deleteMany();

  await prisma.tenant.create({
    data: {
      id: TENANT_ID,
      name: "Demo Workspace",
      slug: "demo",
      members: {
        create: {
          userId: "dev-user",
          email: "dev@moneycommand.local",
          role: "OWNER",
        },
      },
    },
  });

  const tenantId = TENANT_ID;

  const checking = await prisma.account.create({
    data: { tenantId, 
      name: "Primary Checking",
      type: "CHECKING",
      institution: "Chase",
      balance: 8420.55,
      color: "#3b82f6",
      icon: "landmark",
    },
  });

  const savings = await prisma.account.create({
    data: { tenantId, 
      name: "Emergency Fund",
      type: "SAVINGS",
      institution: "Ally Bank",
      balance: 15200.0,
      color: "#22c55e",
      icon: "piggy-bank",
    },
  });

  const creditCard = await prisma.account.create({
    data: { tenantId, 
      name: "Sapphire Reserve",
      type: "CREDIT_CARD",
      institution: "Chase",
      balance: -1842.33,
      color: "#6366f1",
      icon: "credit-card",
    },
  });

  const investment = await prisma.account.create({
    data: { tenantId, 
      name: "Brokerage",
      type: "INVESTMENT",
      institution: "Fidelity",
      balance: 48750.25,
      color: "#8b5cf6",
      icon: "trending-up",
    },
  });

  const mortgage = await prisma.account.create({
    data: { tenantId, 
      name: "Mortgage",
      type: "LOAN",
      institution: "Wells Fargo",
      balance: -285000.0,
      color: "#f97316",
      icon: "home",
    },
  });

  const incomeCategories = await Promise.all([
    prisma.category.create({
      data: { tenantId,  name: "Salary", type: "INCOME", icon: "briefcase", color: "#22c55e" },
    }),
    prisma.category.create({
      data: { tenantId,  name: "Freelance", type: "INCOME", icon: "laptop", color: "#14b8a6" },
    }),
    prisma.category.create({
      data: { tenantId,  name: "Investments", type: "INCOME", icon: "trending-up", color: "#8b5cf6" },
    }),
    prisma.category.create({
      data: { tenantId,  name: "Other Income", type: "INCOME", icon: "plus-circle", color: "#06b6d4" },
    }),
  ]);

  const expenseCategories = await Promise.all([
    prisma.category.create({
      data: { tenantId,  name: "Groceries", type: "EXPENSE", icon: "shopping-cart", color: "#22c55e" },
    }),
    prisma.category.create({
      data: { tenantId,  name: "Dining Out", type: "EXPENSE", icon: "utensils", color: "#f97316" },
    }),
    prisma.category.create({
      data: { tenantId,  name: "Transportation", type: "EXPENSE", icon: "car", color: "#3b82f6" },
    }),
    prisma.category.create({
      data: { tenantId,  name: "Housing", type: "EXPENSE", icon: "home", color: "#6366f1" },
    }),
    prisma.category.create({
      data: { tenantId,  name: "Utilities", type: "EXPENSE", icon: "zap", color: "#eab308" },
    }),
    prisma.category.create({
      data: { tenantId,  name: "Entertainment", type: "EXPENSE", icon: "film", color: "#ec4899" },
    }),
    prisma.category.create({
      data: { tenantId,  name: "Shopping", type: "EXPENSE", icon: "shopping-bag", color: "#f43f5e" },
    }),
    prisma.category.create({
      data: { tenantId,  name: "Health", type: "EXPENSE", icon: "heart-pulse", color: "#ef4444" },
    }),
    prisma.category.create({
      data: { tenantId,  name: "Subscriptions", type: "EXPENSE", icon: "repeat", color: "#8b5cf6" },
    }),
    prisma.category.create({
      data: { tenantId,  name: "Travel", type: "EXPENSE", icon: "plane", color: "#06b6d4" },
    }),
  ]);

  const [salary, freelance] = incomeCategories;
  const [groceries, dining, transport, housing, utilities, entertainment, shopping, health, subscriptions, travel] =
    expenseCategories;

  const now = new Date();
  const currentMonth = startOfMonth(now);

  const transactions = [
    { accountId: checking.id, categoryId: salary.id, date: subDays(now, 2), amount: 5200, description: "Payroll Deposit", merchant: "Acme Corp" },
    { accountId: checking.id, categoryId: housing.id, date: subDays(now, 3), amount: -2200, description: "Rent Payment", merchant: "Property Mgmt" },
    { accountId: creditCard.id, categoryId: groceries.id, date: subDays(now, 1), amount: -127.45, description: "Whole Foods", merchant: "Whole Foods" },
    { accountId: creditCard.id, categoryId: dining.id, date: subDays(now, 1), amount: -68.5, description: "Dinner", merchant: "Nobu" },
    { accountId: creditCard.id, categoryId: transport.id, date: subDays(now, 4), amount: -45.0, description: "Uber rides", merchant: "Uber" },
    { accountId: creditCard.id, categoryId: entertainment.id, date: subDays(now, 5), amount: -15.99, description: "Netflix", merchant: "Netflix" },
    { accountId: creditCard.id, categoryId: subscriptions.id, date: subDays(now, 6), amount: -12.99, description: "Spotify", merchant: "Spotify" },
    { accountId: creditCard.id, categoryId: shopping.id, date: subDays(now, 7), amount: -234.99, description: "Amazon order", merchant: "Amazon" },
    { accountId: checking.id, categoryId: utilities.id, date: subDays(now, 8), amount: -156.32, description: "Electric bill", merchant: "PG&E" },
    { accountId: creditCard.id, categoryId: health.id, date: subDays(now, 9), amount: -89.0, description: "Gym membership", merchant: "Equinox" },
    { accountId: checking.id, categoryId: freelance.id, date: subDays(now, 10), amount: 850, description: "Freelance payment", merchant: "Client LLC" },
    { accountId: creditCard.id, categoryId: travel.id, date: subDays(now, 12), amount: -412.0, description: "Flight booking", merchant: "United Airlines" },
    { accountId: creditCard.id, categoryId: groceries.id, date: subDays(now, 14), amount: -98.23, description: "Trader Joe's", merchant: "Trader Joe's" },
    { accountId: creditCard.id, categoryId: dining.id, date: subDays(now, 15), amount: -42.75, description: "Lunch", merchant: "Sweetgreen" },
    { accountId: checking.id, categoryId: salary.id, date: subMonths(now, 1), amount: 5200, description: "Payroll Deposit", merchant: "Acme Corp" },
    { accountId: checking.id, categoryId: housing.id, date: subMonths(now, 1), amount: -2200, description: "Rent Payment", merchant: "Property Mgmt" },
    { accountId: creditCard.id, categoryId: groceries.id, date: subMonths(now, 1), amount: -312.5, description: "Groceries", merchant: "Costco" },
    { accountId: creditCard.id, categoryId: entertainment.id, date: subMonths(now, 1), amount: -89.0, description: "Concert tickets", merchant: "Ticketmaster" },
    { accountId: savings.id, categoryId: salary.id, date: subDays(now, 2), amount: 500, description: "Auto-save transfer", merchant: "Internal Transfer", isTransfer: true },
  ];

  for (const tx of transactions) {
    await prisma.transaction.create({ data: { ...tx, tenantId } });
  }

  const budgetCategories = [groceries, dining, transport, entertainment, shopping, health, subscriptions, travel];
  const budgetAmounts = [600, 400, 300, 200, 350, 150, 100, 500];

  for (let i = 0; i < 3; i++) {
    const month = startOfMonth(subMonths(now, i));
    for (let j = 0; j < budgetCategories.length; j++) {
      await prisma.budget.create({
        data: { tenantId, 
          categoryId: budgetCategories[j].id,
          amount: budgetAmounts[j],
          month,
        },
      });
    }
  }

  await prisma.goal.create({
    data: { tenantId, 
      name: "Vacation Fund",
      targetAmount: 5000,
      currentAmount: 2800,
      targetDate: new Date(now.getFullYear(), 11, 1),
      icon: "plane",
      color: "#06b6d4",
      accountId: savings.id,
    },
  });

  await prisma.goal.create({
    data: { tenantId, 
      name: "New Car Down Payment",
      targetAmount: 15000,
      currentAmount: 6200,
      targetDate: new Date(now.getFullYear() + 1, 5, 1),
      icon: "car",
      color: "#3b82f6",
      accountId: savings.id,
    },
  });

  await prisma.goal.create({
    data: { tenantId, 
      name: "Home Renovation",
      targetAmount: 25000,
      currentAmount: 8500,
      targetDate: new Date(now.getFullYear() + 1, 8, 1),
      icon: "home",
      color: "#f97316",
    },
  });

  const monthlyIncome = 6050;

  await prisma.envelopePool.create({
    data: { tenantId,  month: currentMonth, totalFunds: monthlyIncome },
  });

  const envelopeCategories = [
    groceries, dining, transport, housing, utilities, entertainment, shopping, health, subscriptions, travel,
  ];
  const envelopeAllocations = [500, 350, 250, 2200, 150, 150, 300, 100, 50, 400];

  for (let i = 0; i < envelopeCategories.length; i++) {
    await prisma.envelope.create({
      data: { tenantId, 
        categoryId: envelopeCategories[i].id,
        month: currentMonth,
        allocated: envelopeAllocations[i],
      },
    });
  }

  await prisma.envelopeTransfer.create({
    data: { tenantId, 
      month: currentMonth,
      amount: 500,
      fromCategoryId: null,
      toCategoryId: groceries.id,
      note: "Initial grocery funding",
    },
  });

  await prisma.paySchedule.create({
    data: { tenantId, 
      name: "Bi-weekly Paycheck",
      amount: 2600,
      frequency: "BIWEEKLY",
      dayOfWeek: 5,
      startDate: subMonths(now, 2),
      categoryId: salary.id,
      accountId: checking.id,
      color: "#22c55e",
      notes: "Primary salary from Acme Corp",
    },
  });

  await prisma.paySchedule.create({
    data: { tenantId, 
      name: "Freelance Retainer",
      amount: 850,
      frequency: "MONTHLY",
      dayOfMonth: 15,
      startDate: subMonths(now, 1),
      categoryId: freelance.id,
      accountId: checking.id,
      color: "#14b8a6",
    },
  });

  await prisma.scheduledExpense.create({
    data: { tenantId, 
      name: "Rent",
      amount: 2200,
      frequency: "MONTHLY",
      dayOfMonth: 1,
      startDate: subMonths(now, 6),
      categoryId: housing.id,
      accountId: checking.id,
      color: "#6366f1",
    },
  });

  await prisma.scheduledExpense.create({
    data: { tenantId, 
      name: "Electric Bill",
      amount: 156,
      frequency: "MONTHLY",
      dayOfMonth: 12,
      startDate: subMonths(now, 6),
      categoryId: utilities.id,
      color: "#eab308",
    },
  });

  await prisma.scheduledExpense.create({
    data: { tenantId, 
      name: "Netflix",
      amount: 15.99,
      frequency: "MONTHLY",
      dayOfMonth: 5,
      startDate: subMonths(now, 3),
      categoryId: subscriptions.id,
      color: "#ec4899",
    },
  });

  await prisma.scheduledExpense.create({
    data: { tenantId, 
      name: "Car Insurance",
      amount: 142,
      frequency: "SEMIMONTHLY",
      dayOfMonth: 1,
      secondDayOfMonth: 15,
      startDate: subMonths(now, 4),
      categoryId: transport.id,
      color: "#3b82f6",
    },
  });

  console.log("Seed completed successfully!");
  console.log(`Created ${5} accounts, ${incomeCategories.length + expenseCategories.length} categories, ${transactions.length} transactions, ${envelopeCategories.length} envelopes, 2 pay schedules, 4 scheduled expenses`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
