ALTER TABLE public."SparePartIssue"
ADD COLUMN IF NOT EXISTS "submissionKey" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "SparePartIssue_submissionKey_key"
ON public."SparePartIssue"("submissionKey");
