import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!');

    const result = await client.query('SELECT NOW()');
    console.log('Current database time:', result.rows[0].now);

    const tableResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('\nAvailable tables:');
    tableResult.rows.forEach(row => {
      console.log('-', row.table_name);
    });

  } catch (error) {
    console.error('Error connecting to database:', error);
  } finally {
    await client.end();
  }
}

testConnection(); 