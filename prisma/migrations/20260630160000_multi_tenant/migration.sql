-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TenantMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OWNER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TenantMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Default tenant for existing data
INSERT INTO "Tenant" ("id", "name", "slug", "createdAt", "updatedAt")
VALUES ('legacy-tenant', 'Legacy Workspace', 'legacy', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Redefine tables with tenantId (SQLite requires table recreation for NOT NULL columns)

CREATE TABLE "new_Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL DEFAULT 'legacy-tenant',
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "institution" TEXT,
    "balance" REAL NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "icon" TEXT NOT NULL DEFAULT 'wallet',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isLinked" BOOLEAN NOT NULL DEFAULT false,
    "plaidAccountId" TEXT,
    "plaidItemId" TEXT,
    "mask" TEXT,
    "lastSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Account_plaidItemId_fkey" FOREIGN KEY ("plaidItemId") REFERENCES "PlaidItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Account" ("id", "tenantId", "name", "type", "institution", "balance", "color", "icon", "isArchived", "isLinked", "plaidAccountId", "plaidItemId", "mask", "lastSyncedAt", "createdAt", "updatedAt")
SELECT "id", 'legacy-tenant', "name", "type", "institution", "balance", "color", "icon", "isArchived", "isLinked", "plaidAccountId", "plaidItemId", "mask", "lastSyncedAt", "createdAt", "updatedAt" FROM "Account";
DROP TABLE "Account";
ALTER TABLE "new_Account" RENAME TO "Account";
CREATE UNIQUE INDEX "Account_tenantId_plaidAccountId_key" ON "Account"("tenantId", "plaidAccountId");
CREATE INDEX "Account_tenantId_idx" ON "Account"("tenantId");

CREATE TABLE "new_PlaidItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL DEFAULT 'legacy-tenant',
    "itemId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "institutionId" TEXT,
    "institutionName" TEXT,
    "transactionsCursor" TEXT,
    "lastSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_PlaidItem" ("id", "tenantId", "itemId", "accessToken", "institutionId", "institutionName", "transactionsCursor", "lastSyncedAt", "createdAt", "updatedAt")
SELECT "id", 'legacy-tenant', "itemId", "accessToken", "institutionId", "institutionName", "transactionsCursor", "lastSyncedAt", "createdAt", "updatedAt" FROM "PlaidItem";
DROP TABLE "PlaidItem";
ALTER TABLE "new_PlaidItem" RENAME TO "PlaidItem";
CREATE UNIQUE INDEX "PlaidItem_tenantId_itemId_key" ON "PlaidItem"("tenantId", "itemId");
CREATE INDEX "PlaidItem_tenantId_idx" ON "PlaidItem"("tenantId");

CREATE TABLE "new_Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL DEFAULT 'legacy-tenant',
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'tag',
    "color" TEXT NOT NULL DEFAULT '#8b5cf6',
    "parentId" TEXT,
    "budgetable" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Category" ("id", "tenantId", "name", "type", "icon", "color", "parentId", "budgetable")
SELECT "id", 'legacy-tenant', "name", "type", "icon", "color", "parentId", "budgetable" FROM "Category";
DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";
CREATE INDEX "Category_tenantId_idx" ON "Category"("tenantId");

CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL DEFAULT 'legacy-tenant',
    "accountId" TEXT NOT NULL,
    "transferAccountId" TEXT,
    "debtAccountId" TEXT,
    "categoryId" TEXT,
    "date" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "description" TEXT NOT NULL,
    "merchant" TEXT,
    "notes" TEXT,
    "isTransfer" BOOLEAN NOT NULL DEFAULT false,
    "scheduleOccurrenceKey" TEXT,
    "plaidTransactionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_transferAccountId_fkey" FOREIGN KEY ("transferAccountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_debtAccountId_fkey" FOREIGN KEY ("debtAccountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("id", "tenantId", "accountId", "transferAccountId", "debtAccountId", "categoryId", "date", "amount", "description", "merchant", "notes", "isTransfer", "scheduleOccurrenceKey", "plaidTransactionId", "createdAt")
SELECT "id", 'legacy-tenant', "accountId", "transferAccountId", "debtAccountId", "categoryId", "date", "amount", "description", "merchant", "notes", "isTransfer", "scheduleOccurrenceKey", "plaidTransactionId", "createdAt" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE UNIQUE INDEX "Transaction_tenantId_plaidTransactionId_key" ON "Transaction"("tenantId", "plaidTransactionId");
CREATE INDEX "Transaction_tenantId_idx" ON "Transaction"("tenantId");

CREATE TABLE "new_Budget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL DEFAULT 'legacy-tenant',
    "categoryId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "month" DATETIME NOT NULL,
    CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Budget" ("id", "tenantId", "categoryId", "amount", "month")
SELECT "id", 'legacy-tenant', "categoryId", "amount", "month" FROM "Budget";
DROP TABLE "Budget";
ALTER TABLE "new_Budget" RENAME TO "Budget";
CREATE UNIQUE INDEX "Budget_tenantId_categoryId_month_key" ON "Budget"("tenantId", "categoryId", "month");
CREATE INDEX "Budget_tenantId_idx" ON "Budget"("tenantId");

CREATE TABLE "new_Goal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL DEFAULT 'legacy-tenant',
    "name" TEXT NOT NULL,
    "targetAmount" REAL NOT NULL,
    "currentAmount" REAL NOT NULL DEFAULT 0,
    "targetDate" DATETIME,
    "icon" TEXT NOT NULL DEFAULT 'target',
    "color" TEXT NOT NULL DEFAULT '#10b981',
    "accountId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Goal_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Goal" ("id", "tenantId", "name", "targetAmount", "currentAmount", "targetDate", "icon", "color", "accountId", "createdAt")
SELECT "id", 'legacy-tenant', "name", "targetAmount", "currentAmount", "targetDate", "icon", "color", "accountId", "createdAt" FROM "Goal";
DROP TABLE "Goal";
ALTER TABLE "new_Goal" RENAME TO "Goal";
CREATE INDEX "Goal_tenantId_idx" ON "Goal"("tenantId");

CREATE TABLE "new_EnvelopePool" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL DEFAULT 'legacy-tenant',
    "month" DATETIME NOT NULL,
    "totalFunds" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_EnvelopePool" ("id", "tenantId", "month", "totalFunds", "createdAt", "updatedAt")
SELECT "id", 'legacy-tenant', "month", "totalFunds", "createdAt", "updatedAt" FROM "EnvelopePool";
DROP TABLE "EnvelopePool";
ALTER TABLE "new_EnvelopePool" RENAME TO "EnvelopePool";
CREATE UNIQUE INDEX "EnvelopePool_tenantId_month_key" ON "EnvelopePool"("tenantId", "month");
CREATE INDEX "EnvelopePool_tenantId_idx" ON "EnvelopePool"("tenantId");

CREATE TABLE "new_Envelope" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL DEFAULT 'legacy-tenant',
    "categoryId" TEXT NOT NULL,
    "month" DATETIME NOT NULL,
    "allocated" REAL NOT NULL DEFAULT 0,
    "budgetAmount" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Envelope_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Envelope" ("id", "tenantId", "categoryId", "month", "allocated", "budgetAmount", "isActive", "createdAt", "updatedAt")
SELECT "id", 'legacy-tenant', "categoryId", "month", "allocated", "budgetAmount", "isActive", "createdAt", "updatedAt" FROM "Envelope";
DROP TABLE "Envelope";
ALTER TABLE "new_Envelope" RENAME TO "Envelope";
CREATE UNIQUE INDEX "Envelope_tenantId_categoryId_month_key" ON "Envelope"("tenantId", "categoryId", "month");
CREATE INDEX "Envelope_tenantId_idx" ON "Envelope"("tenantId");

CREATE TABLE "new_EnvelopePoolFunding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL DEFAULT 'legacy-tenant',
    "month" DATETIME NOT NULL,
    "accountId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EnvelopePoolFunding_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EnvelopePoolFunding" ("id", "tenantId", "month", "accountId", "amount", "note", "createdAt")
SELECT "id", 'legacy-tenant', "month", "accountId", "amount", "note", "createdAt" FROM "EnvelopePoolFunding";
DROP TABLE "EnvelopePoolFunding";
ALTER TABLE "new_EnvelopePoolFunding" RENAME TO "EnvelopePoolFunding";
CREATE INDEX "EnvelopePoolFunding_tenantId_idx" ON "EnvelopePoolFunding"("tenantId");

CREATE TABLE "new_EnvelopeTransfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL DEFAULT 'legacy-tenant',
    "month" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "note" TEXT,
    "fromCategoryId" TEXT,
    "toCategoryId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_EnvelopeTransfer" ("id", "tenantId", "month", "amount", "note", "fromCategoryId", "toCategoryId", "createdAt")
SELECT "id", 'legacy-tenant', "month", "amount", "note", "fromCategoryId", "toCategoryId", "createdAt" FROM "EnvelopeTransfer";
DROP TABLE "EnvelopeTransfer";
ALTER TABLE "new_EnvelopeTransfer" RENAME TO "EnvelopeTransfer";
CREATE INDEX "EnvelopeTransfer_tenantId_idx" ON "EnvelopeTransfer"("tenantId");

CREATE TABLE "new_PaySchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL DEFAULT 'legacy-tenant',
    "name" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "frequency" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "secondDayOfMonth" INTEGER,
    "customIntervalDays" INTEGER,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "categoryId" TEXT,
    "accountId" TEXT,
    "color" TEXT NOT NULL DEFAULT '#22c55e',
    "icon" TEXT NOT NULL DEFAULT 'briefcase',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaySchedule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PaySchedule_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PaySchedule" ("id", "tenantId", "name", "amount", "frequency", "dayOfWeek", "dayOfMonth", "secondDayOfMonth", "customIntervalDays", "startDate", "endDate", "categoryId", "accountId", "color", "icon", "notes", "isActive", "createdAt", "updatedAt")
SELECT "id", 'legacy-tenant', "name", "amount", "frequency", "dayOfWeek", "dayOfMonth", "secondDayOfMonth", "customIntervalDays", "startDate", "endDate", "categoryId", "accountId", "color", "icon", "notes", "isActive", "createdAt", "updatedAt" FROM "PaySchedule";
DROP TABLE "PaySchedule";
ALTER TABLE "new_PaySchedule" RENAME TO "PaySchedule";
CREATE INDEX "PaySchedule_tenantId_idx" ON "PaySchedule"("tenantId");

CREATE TABLE "new_ScheduledExpense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL DEFAULT 'legacy-tenant',
    "name" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "frequency" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "secondDayOfMonth" INTEGER,
    "customIntervalDays" INTEGER,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "categoryId" TEXT,
    "accountId" TEXT,
    "color" TEXT NOT NULL DEFAULT '#f97316',
    "icon" TEXT NOT NULL DEFAULT 'calendar',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ScheduledExpense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ScheduledExpense_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ScheduledExpense" ("id", "tenantId", "name", "amount", "frequency", "dayOfWeek", "dayOfMonth", "secondDayOfMonth", "customIntervalDays", "startDate", "endDate", "categoryId", "accountId", "color", "icon", "notes", "isActive", "priority", "createdAt", "updatedAt")
SELECT "id", 'legacy-tenant', "name", "amount", "frequency", "dayOfWeek", "dayOfMonth", "secondDayOfMonth", "customIntervalDays", "startDate", "endDate", "categoryId", "accountId", "color", "icon", "notes", "isActive", "priority", "createdAt", "updatedAt" FROM "ScheduledExpense";
DROP TABLE "ScheduledExpense";
ALTER TABLE "new_ScheduledExpense" RENAME TO "ScheduledExpense";
CREATE INDEX "ScheduledExpense_tenantId_idx" ON "ScheduledExpense"("tenantId");

CREATE TABLE "new_ScheduleDateAdjustment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL DEFAULT 'legacy-tenant',
    "sourceType" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "occurrenceKey" TEXT NOT NULL,
    "originalDate" DATETIME NOT NULL,
    "adjustedDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ScheduleDateAdjustment" ("id", "tenantId", "sourceType", "scheduleId", "occurrenceKey", "originalDate", "adjustedDate", "status", "notes", "createdAt", "updatedAt")
SELECT "id", 'legacy-tenant', "sourceType", "scheduleId", "occurrenceKey", "originalDate", "adjustedDate", "status", "notes", "createdAt", "updatedAt" FROM "ScheduleDateAdjustment";
DROP TABLE "ScheduleDateAdjustment";
ALTER TABLE "new_ScheduleDateAdjustment" RENAME TO "ScheduleDateAdjustment";
CREATE UNIQUE INDEX "ScheduleDateAdjustment_tenantId_occurrenceKey_key" ON "ScheduleDateAdjustment"("tenantId", "occurrenceKey");
CREATE INDEX "ScheduleDateAdjustment_tenantId_idx" ON "ScheduleDateAdjustment"("tenantId");

CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE UNIQUE INDEX "TenantMember_userId_key" ON "TenantMember"("userId");
CREATE INDEX "TenantMember_tenantId_idx" ON "TenantMember"("tenantId");
