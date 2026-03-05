-- Migration: Add project model and relationship with products
-- Created: 2025-09-29
-- Description: Adds the project table and establishes the hierarchy Cliente > Proyectos > Chatbots

-- Create project table
CREATE TABLE IF NOT EXISTS "project" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "client_id" TEXT NOT NULL,
  "tag" VARCHAR(50),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Add project_id column to product table
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "project_id" TEXT;

-- Add foreign key constraint
ALTER TABLE "product" ADD CONSTRAINT "product_project_id_fkey" 
  FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_project_client" ON "project"("client_id");
CREATE INDEX IF NOT EXISTS "idx_project_active" ON "project"("is_active");
CREATE INDEX IF NOT EXISTS "idx_product_project" ON "product"("project_id");

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_project_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_updated_at_trigger
  BEFORE UPDATE ON "project"
  FOR EACH ROW
  EXECUTE FUNCTION update_project_updated_at();

-- Success message (will be shown in psql)
DO $$ 
BEGIN 
  RAISE NOTICE 'Migration completed successfully: project model added';
END $$;
