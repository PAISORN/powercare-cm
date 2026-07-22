ALTER TABLE public."CmWork"
ADD COLUMN IF NOT EXISTS "submissionKey" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "CmWork_submissionKey_key"
ON public."CmWork"("submissionKey");
