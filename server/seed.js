import bcrypt from 'bcrypt';
import pool from './db.js';

export async function seedUsers() {
  const { rows } = await pool.query('SELECT COUNT(*) FROM users');
  if (parseInt(rows[0].count, 10) > 0) {
    console.log('Seed: users вже існують, пропускаю');
    return;
  }

  const hash = (plain) => bcrypt.hash(plain, 10);

  await pool.query(
    `INSERT INTO users (login, password_hash, role)
     VALUES ($1, $2, 'admin')`,
    ['admin', await hash('admin123')]
  );

  const { rows: masterRows } = await pool.query(
    'SELECT master_id FROM masters ORDER BY master_id LIMIT 1'
  );
  if (masterRows[0]) {
    await pool.query(
      `INSERT INTO users (login, password_hash, role, master_id)
       VALUES ($1, $2, 'master', $3)`,
      ['master1', await hash('master123'), masterRows[0].master_id]
    );
  } else {
    console.warn('Seed: немає жодного запису в masters, master1 не створено');
  }

  const { rows: clientRows } = await pool.query(
    'SELECT client_id FROM clients ORDER BY client_id LIMIT 1'
  );
  if (clientRows[0]) {
    await pool.query(
      `INSERT INTO users (login, password_hash, role, client_id)
       VALUES ($1, $2, 'client', $3)`,
      ['client1', await hash('client123'), clientRows[0].client_id]
    );
  } else {
    console.warn('Seed: немає жодного запису в clients, client1 не створено');
  }

  console.log('Seed: тестові акаунти створено (admin/admin123, master1/master123, client1/client123)');
}
