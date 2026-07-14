-- Add optional maximum stock level for inventory planning.
ALTER TABLE "SparePart" ADD COLUMN IF NOT EXISTS "maxStock" DECIMAL(65,30);
