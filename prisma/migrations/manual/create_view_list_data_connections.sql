-- Vista para listar conexiones de datos con información de organización
-- Esta vista es requerida por el backend Python para el endpoint /connections/getDataConnections

CREATE OR REPLACE VIEW view_list_data_connections AS
SELECT 
    dc.id AS connection_id,
    dc.name AS connection_name,
    dc.type AS connection_type,
    dc.configuration AS connection_configuration,
    dc.organization_id,
    o.name AS organization_name,
    o.company_name AS organization_company_name,
    o.country AS organization_country
FROM data_connections dc
LEFT JOIN organizations o ON dc.organization_id = o.id;
