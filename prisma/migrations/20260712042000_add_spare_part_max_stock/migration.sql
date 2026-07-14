-- Add optional maximum stock level for inventory planning.
ALTER TABLE "SparePart" ADD COLUMN "maxStock" DECIMAL(65,30);
