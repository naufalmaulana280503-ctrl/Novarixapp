const { pool, initDatabase } = require('./models/db');

(async () => {
  try {
    await initDatabase();
    const [rows] = await pool.query(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_name = 'users'
       ORDER BY ordinal_position`
    );
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
