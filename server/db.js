import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// За замовчуванням pg віддає DATE як JS Date (з зсувом часових поясів), а BIGINT/NUMERIC як рядки.
pg.types.setTypeParser(1082, (v) => v); // DATE    -> 'YYYY-MM-DD'
pg.types.setTypeParser(1700, (v) => parseFloat(v)); // NUMERIC -> number
pg.types.setTypeParser(20, (v) => parseInt(v, 10)); // BIGINT  -> number (COUNT, id)

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Виконує fn(client) в одній транзакції: COMMIT при успіху, ROLLBACK при будь-якій помилці
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export default pool;
