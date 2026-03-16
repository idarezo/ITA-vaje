export default {
  schema: "./db/schema.js",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    host: process.env.ORDER_DB_HOST || "localhost",
    user: process.env.ORDER_DB_USER || "root",
    password: process.env.ORDER_DB_PASSWORD || "",
    database: process.env.ORDER_DB_NAME || "order_db",
  },
};
