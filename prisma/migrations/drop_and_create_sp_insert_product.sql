-- =====================================================
-- DROP Y RECREACIÓN del Stored Procedure
-- =====================================================

-- Eliminar el procedimiento existente
DROP PROCEDURE IF EXISTS spu_minddash_app_insert_product(
  uuid, character varying, character varying, character varying, 
  character varying, jsonb, character varying, character varying, 
  character varying, integer, boolean, boolean, boolean, uuid
);

-- =====================================================
-- Stored Procedure: spu_minddash_app_insert_product
-- Descripción: Inserta un nuevo producto/chatbot en la tabla products
-- =====================================================

CREATE OR REPLACE PROCEDURE spu_minddash_app_insert_product(
  p_product_id UUID,
  p_name VARCHAR(200),
  p_description VARCHAR(200),
  p_language VARCHAR(50),
  p_tipo VARCHAR(20),
  p_config JSONB,
  p_welcome_message VARCHAR(100),
  p_label VARCHAR(50),
  p_label_color VARCHAR(20),
  p_max_users INTEGER,
  p_is_active_rag BOOLEAN,
  p_is_active_alerts BOOLEAN,
  p_is_active_insight BOOLEAN,
  INOUT io_product_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Generar nuevo UUID si no se proporciona
  IF io_product_id IS NULL THEN
    io_product_id := uuid_generate_v4();
  END IF;

  -- Insertar el nuevo producto
  INSERT INTO products (
    id,
    project_id,
    name,
    description,
    language,
    tipo,
    config,
    welcome_message,
    label,
    label_color,
    max_users,
    is_active_rag,
    is_active_alerts,
    is_active_insight,
    is_active,
    mensajes_mes,
    created_at,
    updated_at
  ) VALUES (
    io_product_id,
    p_product_id,
    p_name,
    p_description,
    COALESCE(p_language, 'es'),
    COALESCE(p_tipo, 'chatbot'),
    COALESCE(p_config, '{}'::jsonb),
    p_welcome_message,
    p_label,
    p_label_color,
    COALESCE(p_max_users, 100),
    COALESCE(p_is_active_rag, false),
    COALESCE(p_is_active_alerts, false),
    COALESCE(p_is_active_insight, false),
    true,
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

  RAISE NOTICE 'Producto creado exitosamente con ID: %', io_product_id;
  
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Ya existe un producto con este ID: %', io_product_id;
  WHEN foreign_key_violation THEN
    RAISE EXCEPTION 'El proyecto especificado no existe: %', p_product_id;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error al insertar producto: %', SQLERRM;
END;
$$;

-- Comentario descriptivo
COMMENT ON PROCEDURE spu_minddash_app_insert_product IS 
'Procedimiento almacenado para insertar un nuevo producto/chatbot en el sistema MindDash.';
