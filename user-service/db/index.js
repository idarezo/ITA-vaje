import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

let db;
let pool;

export async function initDb(retries = 10, delay = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT ?? 3306),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
      });

      await pool.query("SELECT 1");
      db = drizzle(pool);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          first_name VARCHAR(255) NOT NULL,
          last_name VARCHAR(255) NOT NULL,
          birth_year INT NOT NULL,
          role ENUM('tenant','landlord') NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log("User-service database ready");
      return;
    } catch (error) {
      console.log(
        `User-service DB connection failed (${attempt}/${retries}). Retrying in ${delay / 1000}s...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Unable to initialize database after multiple attempts.");
}

export function getDb() {
  if (!db) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  return db;
}

export function getPool() {
  if (!pool) {
    throw new Error("Connection pool not initialized. Call initDb() first.");
  }
  return pool;
}
