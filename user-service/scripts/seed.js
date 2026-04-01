import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { initDb, getDb } from "../db/index.js";
import { users } from "../db/schema.js";

dotenv.config();

async function seedLandlord() {
  try {
    await initDb();
    const db = getDb();

    const email = process.env.SEED_LANDLORD_EMAIL || "landlord@example.com";
    const password = process.env.SEED_LANDLORD_PASSWORD || "Password123!";

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length) {
      console.log(
        `Landlord already exists: ${existing[0].email} (id=${existing[0].id}).`,
      );
      process.exit(0);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await db
      .insert(users)
      .values({
        firstName: process.env.SEED_LANDLORD_FIRST_NAME || "Lara",
        lastName: process.env.SEED_LANDLORD_LAST_NAME || "Landlord",
        birthYear: Number(process.env.SEED_LANDLORD_BIRTH_YEAR || 1988),
        role: "landlord",
        email,
        passwordHash,
      })
      .execute();

    const [created] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    console.log(
      `Seeded landlord ${created.email} with id ${created.id}. Default password: ${password}`,
    );
    process.exit(0);
  } catch (error) {
    console.error("User seed failed", error);
    process.exit(1);
  }
}

seedLandlord();
