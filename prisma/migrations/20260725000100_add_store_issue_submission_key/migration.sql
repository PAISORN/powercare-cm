ALTER TABLE "SparePartIssue" ADD COLUMN "submissionKey" TEXT;

CREATE UNIQUE INDEX "SparePartIssue_submissionKey_key"
ON "SparePartIssue"("submissionKey");
