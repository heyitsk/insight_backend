// schemaBuilder.js
async function buildSchemaInfo(pool) {
  const query = `
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `;

  const res = await pool.query(query);

  // Group columns by table
  const schemaMap = {};

  for (const row of res.rows) {
    const { table_name, column_name } = row;

    if (!schemaMap[table_name]) {
      schemaMap[table_name] = [];
    }

    schemaMap[table_name].push(column_name);
  }

  // Format the schema string
  const schemaInfoLines = ["Tables:"];
  for (const [table, columns] of Object.entries(schemaMap)) {
    schemaInfoLines.push(`- ${table}(${columns.join(", ")})`);
  }

  return schemaInfoLines.join("\n");
}

module.exports = { buildSchemaInfo };
