-- =====================================================
-- Stored Procedure: spu_minddash_app_insert_project
-- Descripción: Inserta un nuevo proyecto en la tabla projects
-- Parámetros:
--   p_project_id: UUID de la organización (organization_id)
--   p_name: Nombre del proyecto
--   p_label: Etiqueta corta del proyecto
--   p_label_color: Código de color para la etiqueta
--   p_description: Descripción del proyecto
--   io_project_id: UUID del proyecto (INOUT - se genera si es NULL)
-- =====================================================

CREATE OR REPLACE PROCEDURE spu_minddash_app_insert_project(
  p_project_id UUID,
  p_name VARCHAR(50),
  p_label VARCHAR(50),
  p_label_color VARCHAR(20),
  p_description VARCHAR(200),
  INOUT io_project_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Generar nuevo UUID si no se proporciona
  IF io_project_id IS NULL THEN
    io_project_id := gen_random_uuid();
  END IF;
  
  -- Validar que organization_id existe
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_project_id) THEN
    RAISE EXCEPTION 'La organización con id % no existe', p_project_id;
  END IF;
  
  -- Insertar el proyecto
  INSERT INTO projects (
    id,
    organization_id,
    name,
    label,
    label_color,
    description,
    created_at,
    updated_at
  ) VALUES (
    io_project_id,
    p_project_id,  -- Este es el organization_id
    p_name,
    p_label,
    p_label_color,
    p_description,
    NOW(),
    NOW()
  );
  
  -- Log de éxito
  RAISE NOTICE 'Proyecto creado exitosamente con ID: %', io_project_id;
  
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Ya existe un proyecto con ese nombre en la organización';
  WHEN foreign_key_violation THEN
    RAISE EXCEPTION 'Error de referencia: la organización no existe';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error al crear proyecto: %', SQLERRM;
END;
$$;

-- Otorgar permisos de ejecución (ajusta el usuario según tu configuración)
-- GRANT EXECUTE ON PROCEDURE spu_minddash_app_insert_project TO your_app_user;

COMMENT ON PROCEDURE spu_minddash_app_insert_project IS 
'Stored procedure para insertar un nuevo proyecto asociado a una organización';
