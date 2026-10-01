ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "batchStartYear" INTEGER;
ALTER TABLE "User" ADD COLUMN "batchEndYear" INTEGER;
CREATE INDEX "User_batchStartYear_idx" ON "User"("batchStartYear");
