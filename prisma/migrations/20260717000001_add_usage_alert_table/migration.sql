-- CreateTable
CREATE TABLE "usage_alert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL,
    "sentAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "billingMonth" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usage_alert_userId_billingMonth_threshold_key" ON "usage_alert"("userId", "billingMonth", "threshold");

-- AddForeignKey
ALTER TABLE "usage_alert" ADD CONSTRAINT "usage_alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;
