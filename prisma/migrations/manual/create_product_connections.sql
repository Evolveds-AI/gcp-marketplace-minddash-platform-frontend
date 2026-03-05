-- Tabla para asociar conexiones de datos con productos específicos
-- Esto permite que cada chatbot/producto tenga sus propias conexiones asignadas

CREATE TABLE IF NOT EXISTS product_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES data_connections(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(product_id, connection_id)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_product_connections_product_id ON product_connections(product_id);
CREATE INDEX IF NOT EXISTS idx_product_connections_connection_id ON product_connections(connection_id);

-- Vista actualizada para listar conexiones por producto
CREATE OR REPLACE VIEW view_list_data_connections_by_product AS
SELECT 
    pc.product_id,
    dc.id AS connection_id,
    dc.name AS connection_name,
    dc.type AS connection_type,
    dc.configuration AS connection_configuration,
    dc.organization_id,
    o.name AS organization_name,
    o.company_name AS organization_company_name,
    o.country AS organization_country
FROM product_connections pc
INNER JOIN data_connections dc ON pc.connection_id = dc.id
LEFT JOIN organizations o ON dc.organization_id = o.id;
