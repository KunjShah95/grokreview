-- CreateTable
CREATE TABLE "ai_action_usage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_action_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_action_usage_userId_createdAt_idx" ON "ai_action_usage"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "ai_action_usage" ADD CONSTRAINT "ai_action_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;
