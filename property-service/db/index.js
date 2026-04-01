import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { properties, residents } from "./schema.js";

let db;
let pool;

// Funkcija za retry povezave z MySQL
export async function initDb(retries = 10, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });

      // Preizkus povezave
      await pool.query("SELECT 1");

      // Inicializiraj Drizzle
      db = drizzle(pool);

      // Ustvari tabele, če še ne obstajajo (še vedno lahko uporabimo raw SQL za DDL)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS properties (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description VARCHAR(1000),
          address VARCHAR(255) NOT NULL,
          price DECIMAL(12,2) NOT NULL,
          bedrooms INT,
          bathrooms INT,
          area DECIMAL(10,2),
          registeredCount INT DEFAULT 0,
          ownerUserId INT
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS residents (
          id INT AUTO_INCREMENT PRIMARY KEY,
          firstName VARCHAR(255) NOT NULL,
          lastName VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          phone VARCHAR(20),
          propertyId INT NOT NULL,
          FOREIGN KEY (propertyId) REFERENCES properties(id) ON DELETE CASCADE
        )
      `);

      console.log("Database connected with Drizzle ORM and tables ready.");
      return;
    } catch (err) {
      console.log(
        `MySQL connection failed, retrying in ${delay / 1000}s... (${
          i + 1
        }/${retries})`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Failed to connect to MySQL after multiple retries.");
}

export function getDb() {
  if (!db) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  return db;
}

export function getPool() {
  if (!pool) {
    throw new Error("Database pool not initialized. Call initDb() first.");
  }
  return pool;
}
