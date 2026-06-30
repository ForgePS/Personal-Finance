-- Add optional spending start date so envelope tracking can ignore earlier transactions
ALTER TABLE "EnvelopePool" ADD COLUMN "spendingStartDate" DATETIME;
