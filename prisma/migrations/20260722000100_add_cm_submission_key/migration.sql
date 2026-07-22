ALTER TABLE "CmWork" ADD COLUMN "submissionKey" TEXT;

CREATE UNIQUE INDEX "CmWork_submissionKey_key" ON "CmWork"("submissionKey");
