import pg from 'pg';
const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

console.log('Connected to DB');

await client.query(`
  CREATE OR REPLACE VIEW view_list_data_connections AS
  SELECT dc.id AS connection_id, dc.name AS connection_name, dc.type AS connection_type,
    dc.configuration AS connection_configuration, dc.organization_id,
    o.name AS organization_name, o.company_name AS organization_company_name, o.country AS organization_country
  FROM data_connections dc LEFT JOIN organizations o ON dc.organization_id = o.id
`);
console.log('view_list_data_connections: OK');

await client.query(`
  CREATE TABLE IF NOT EXISTS product_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES data_connections(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(product_id, connection_id)
  )
`);
await client.query(`CREATE INDEX IF NOT EXISTS idx_product_connections_product_id ON product_connections(product_id)`);
await client.query(`CREATE INDEX IF NOT EXISTS idx_product_connections_connection_id ON product_connections(connection_id)`);
console.log('product_connections table: OK');

await client.query(`
  CREATE OR REPLACE VIEW view_list_data_connections_by_product AS
  SELECT pc.product_id, dc.id AS connection_id, dc.name AS connection_name, dc.type AS connection_type,
    dc.configuration AS connection_configuration, dc.organization_id,
    o.name AS organization_name, o.company_name AS organization_company_name, o.country AS organization_country
  FROM product_connections pc
  INNER JOIN data_connections dc ON pc.connection_id = dc.id
  LEFT JOIN organizations o ON dc.organization_id = o.id
`);
console.log('view_list_data_connections_by_product: OK');

// Seed base roles (idempotent)
for (const [name, type_role, desc] of [
  ['admin', 'admin', 'Administrator with full access'],
  ['user', 'user', 'Standard user role'],
  ['viewer', 'viewer', 'Read-only viewer role'],
]) {
  await client.query(
    `INSERT INTO roles (id, name, type_role, description, created_at)
     SELECT uuid_generate_v4(), $1::varchar, $2::varchar, $3, NOW()
     WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = $1::varchar)`,
    [name, type_role, desc]
  );
}
console.log('roles seed: OK');

await client.end();
console.log('All manual SQL applied successfully');
