-- DropIndex
DROP INDEX "chat_session_userId_repoFullName_idx";

-- CreateIndex
CREATE UNIQUE INDEX "chat_session_userId_repoFullName_key" ON "chat_session"("userId", "repoFullName");
