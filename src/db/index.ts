import { Pool, PoolConfig } from "pg";
import { config } from '../config';

// Database configuration
const dbConfig: PoolConfig = {
  host: process.env.PGHOST || '127.0.0.1',
  port: parseInt(process.env.PGPORT || '5432'),
  database: process.env.PGDATABASE || 'coe_db',
  user: process.env.PGUSER || 'kany',
  password: process.env.PGPASSWORD || 'root',
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
};

// Create connection pool
const pool = new Pool(dbConfig);

// Handle pool errors
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

// Test database connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connected successfully:', result.rows[0].now);
    client.release();
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    throw err;
  }
};

// Initialize database connection
testConnection().catch((err) => {
  console.error('❌ Failed to initialize database:', err);
  process.exit(1);
});

export default {
  query: (text: string, params: any[]) => {
    return pool.query(text, params);
  },
  getClient: () => {
    return pool.connect();
  },
  end: () => {
    return pool.end();
  },
  pool,
};