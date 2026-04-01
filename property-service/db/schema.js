import { mysqlTable, int, varchar, decimal } from "drizzle-orm/mysql-core";

export const properties = mysqlTable("properties", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 255 }).notNull(),
  description: varchar("description", { length: 1000 }),
  address: varchar("address", { length: 255 }).notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  bedrooms: int("bedrooms"),
  bathrooms: int("bathrooms"),
  area: decimal("area", { precision: 10, scale: 2 }),
  registeredCount: int("registeredCount").default(0),
  ownerUserId: int("ownerUserId"),
});

export const residents = mysqlTable("residents", {
  id: int("id").primaryKey().autoincrement(),
  firstName: varchar("firstName", { length: 255 }).notNull(),
  lastName: varchar("lastName", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  propertyId: int("propertyId")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
});
