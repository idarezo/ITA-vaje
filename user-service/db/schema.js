import {
  mysqlTable,
  int,
  varchar,
  mysqlEnum,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

export const userRoles = ["tenant", "landlord"];

export const users = mysqlTable(
  "users",
  {
    id: int("id").primaryKey().autoincrement(),
    firstName: varchar("first_name", { length: 255 }).notNull(),
    lastName: varchar("last_name", { length: 255 }).notNull(),
    birthYear: int("birth_year").notNull(),
    role: mysqlEnum("role", userRoles).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    emailIndex: uniqueIndex("idx_users_email").on(table.email),
  }),
);
