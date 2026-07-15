-- AlterTable
ALTER TABLE "pull_request" ADD COLUMN "complexityScore" INTEGER;

-- CreateTable
CREATE TABLE "security_finding" (
    "id" TEXT NOT NULL,
    "pullRequestId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "line" INTEGER,
    "severity" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "suggestion" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_finding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_test" (
    "id" TEXT NOT NULL,
    "pullRequestId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "testFilePath" TEXT NOT NULL,
    "framework" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_test_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "repoFullName" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_message" (
    "id" TEXT NOT NULL,
    "chatSessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "citedChunks" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "code_health_snapshot" (
    "id" TEXT NOT NULL,
    "repoFullName" TEXT NOT NULL,
    "complexityAvg" DOUBLE PRECISION NOT NULL,
    "hotspotCount" INTEGER NOT NULL,
    "hotspots" JSONB,
    "securityDebt" INTEGER NOT NULL,
    "testCoverageEst" DOUBLE PRECISION,
    "filesAnalyzed" INTEGER NOT NULL DEFAULT 0,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "code_health_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "security_finding_pullRequestId_idx" ON "security_finding"("pullRequestId");

-- CreateIndex
CREATE INDEX "generated_test_pullRequestId_idx" ON "generated_test"("pullRequestId");

-- CreateIndex
CREATE INDEX "chat_session_userId_repoFullName_idx" ON "chat_session"("userId", "repoFullName");

-- CreateIndex
CREATE INDEX "chat_message_chatSessionId_idx" ON "chat_message"("chatSessionId");

-- CreateIndex
CREATE INDEX "code_health_snapshot_repoFullName_computedAt_idx" ON "code_health_snapshot"("repoFullName", "computedAt");

-- AddForeignKey
ALTER TABLE "security_finding" ADD CONSTRAINT "security_finding_pullRequestId_fkey" FOREIGN KEY ("pullRequestId") REFERENCES "pull_request"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_test" ADD CONSTRAINT "generated_test_pullRequestId_fkey" FOREIGN KEY ("pullRequestId") REFERENCES "pull_request"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_session" ADD CONSTRAINT "chat_session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_chatSessionId_fkey" FOREIGN KEY ("chatSessionId") REFERENCES "chat_session"("id") ON DELETE CASCADE;
