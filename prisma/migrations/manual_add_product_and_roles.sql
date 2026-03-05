-- Migración manual para añadir las nuevas tablas Product, ProductUser, RolesAcDatos y Roles
-- Sin afectar las tablas existentes

-- Crear tabla Product
CREATE TABLE IF NOT EXISTS "Product" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- Crear tabla ProductUser
CREATE TABLE IF NOT EXISTS "ProductUser" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductUser_pkey" PRIMARY KEY ("id")
);

-- Crear tabla RolesAcDatos
CREATE TABLE IF NOT EXISTS "RolesAcDatos" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tabla" TEXT NOT NULL,
    "campo" TEXT NOT NULL,
    "valor" TEXT NOT NULL,

    CONSTRAINT "RolesAcDatos_pkey" PRIMARY KEY ("id")
);

-- Crear tabla Roles
CREATE TABLE IF NOT EXISTS "Roles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "nivel" TEXT NOT NULL,
    "scope" TEXT NOT NULL,

    CONSTRAINT "Roles_pkey" PRIMARY KEY ("id")
);

-- Añadir foreign keys
ALTER TABLE "Product" ADD CONSTRAINT "Product_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductUser" ADD CONSTRAINT "ProductUser_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductUser" ADD CONSTRAINT "ProductUser_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RolesAcDatos" ADD CONSTRAINT "RolesAcDatos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;