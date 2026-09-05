const { pool, initDatabase } = require('./models/db');

(async () => {
  try {
    await initDatabase();
    const [rows] = await pool.query(
      `SELECT id, username, display_name, email FROM users
       WHERE username ILIKE '%Lucas%' OR display_name ILIKE '%Lucas%'
          OR username ILIKE '%N.%' OR display_name ILIKE '%N.%'
       LIMIT 50`
    );
    console.log('Found users:');
    console.log(rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
