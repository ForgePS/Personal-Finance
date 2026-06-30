-- AlterTable
ALTER TABLE "ScheduledExpense" ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 50;

-- CreateTable
CREATE TABLE "ScheduleDateAdjustment" (
    "id" TEXT NOT NULL PRIMARY KEY,
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

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleDateAdjustment_occurrenceKey_key" ON "ScheduleDateAdjustment"("occurrenceKey");
