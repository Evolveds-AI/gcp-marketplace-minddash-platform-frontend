-- Migración para agregar campos adicionales al modelo Product
-- Campos necesarios para la gestión completa de productos

ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "descripcion" TEXT;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "tipo" VARCHAR(20) DEFAULT 'chatbot';
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "config" JSONB DEFAULT '{}';
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "usuarios_asignados" INTEGER DEFAULT 0;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "mensajes_mes" INTEGER DEFAULT 0;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "welcome_message" TEXT;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "max_users" INTEGER DEFAULT 100;
ALTER TABLE "product" ADD COLUMN IF NOT EXISTS "features" JSONB DEFAULT '[]';

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS "idx_product_tipo" ON "product"("tipo");
CREATE INDEX IF NOT EXISTS "idx_product_client_active" ON "product"("client_id", "is_active");

-- Comentarios para documentación
COMMENT ON COLUMN "product"."descripcion" IS 'Descripción del producto';
COMMENT ON COLUMN "product"."tipo" IS 'Tipo de producto: chatbot, api, web';
COMMENT ON COLUMN "product"."config" IS 'Configuración específica del producto en formato JSON';
COMMENT ON COLUMN "product"."usuarios_asignados" IS 'Número de usuarios asignados al producto';
COMMENT ON COLUMN "product"."mensajes_mes" IS 'Número de mensajes procesados por mes';
COMMENT ON COLUMN "product"."welcome_message" IS 'Mensaje de bienvenida para chatbots';
COMMENT ON COLUMN "product"."max_users" IS 'Máximo número de usuarios permitidos';
COMMENT ON COLUMN "product"."features" IS 'Lista de características habilitadas en formato JSON';