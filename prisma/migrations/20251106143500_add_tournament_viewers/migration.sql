-- CreateTable
CREATE TABLE "tournament_viewers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_viewers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tournament_viewers_userId_tournamentId_key" ON "tournament_viewers"("userId", "tournamentId");

-- CreateIndex
CREATE INDEX "tournament_viewers_userId_idx" ON "tournament_viewers"("userId");

-- CreateIndex
CREATE INDEX "tournament_viewers_tournamentId_idx" ON "tournament_viewers"("tournamentId");

-- AddForeignKey
ALTER TABLE "tournament_viewers" ADD CONSTRAINT "tournament_viewers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_viewers" ADD CONSTRAINT "tournament_viewers_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

