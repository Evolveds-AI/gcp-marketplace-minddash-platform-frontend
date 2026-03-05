-- Migración segura para añadir claves foráneas faltantes
-- Esta migración NO elimina datos, solo añade relaciones

-- 1. Añadir columna client_id a Product si no existe
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "client_id" TEXT;

-- 2. Añadir columna product_id a ProductUser si no existe  
ALTER TABLE "ProductUser" ADD COLUMN IF NOT EXISTS "product_id" TEXT;

-- 3. Añadir columna user_id a Roles si no existe
ALTER TABLE "Roles" ADD COLUMN IF NOT EXISTS "user_id" TEXT;

-- 4. Actualizar datos existentes con valores por defecto seguros
-- Asignar el primer cliente disponible a productos sin client_id
UPDATE "Product" 
SET "client_id" = (SELECT "id" FROM "clients" LIMIT 1)
WHERE "client_id" IS NULL OR "client_id" = '';

-- Asignar el primer producto disponible a ProductUser sin product_id
UPDATE "ProductUser" 
SET "product_id" = (SELECT "id" FROM "Product" LIMIT 1)
WHERE "product_id" IS NULL OR "product_id" = '';

-- Asignar el primer usuario disponible a Roles sin user_id
UPDATE "Roles" 
SET "user_id" = (SELECT "id" FROM "usuarios" LIMIT 1)
WHERE "user_id" IS NULL OR "user_id" = '';

-- 5. Crear las claves foráneas
-- FK: Product.client_id -> clients.id
ALTER TABLE "Product" 
DROP CONSTRAINT IF EXISTS "Product_client_id_fkey";

ALTER TABLE "Product" 
ADD CONSTRAINT "Product_client_id_fkey" 
FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- FK: ProductUser.product_id -> Product.id
ALTER TABLE "ProductUser" 
DROP CONSTRAINT IF EXISTS "ProductUser_product_id_fkey";

ALTER TABLE "ProductUser" 
ADD CONSTRAINT "ProductUser_product_id_fkey" 
FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- FK: Roles.user_id -> usuarios.id
ALTER TABLE "Roles" 
DROP CONSTRAINT IF EXISTS "Roles_user_id_fkey";

ALTER TABLE "Roles" 
ADD CONSTRAINT "Roles_user_id_fkey" 
FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS "idx_Product_client_id" ON "Product"("client_id");
CREATE INDEX IF NOT EXISTS "idx_ProductUser_product_id" ON "ProductUser"("product_id");
CREATE INDEX IF NOT EXISTS "idx_Roles_user_id" ON "Roles"("user_id");