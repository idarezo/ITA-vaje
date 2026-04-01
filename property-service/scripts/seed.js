import dotenv from "dotenv";
import { eq } from "drizzle-orm";
import { initDb, getDb } from "../db/index.js";
import { properties } from "../db/schema.js";

dotenv.config();

async function seedProperties() {
  try {
    await initDb();
    const db = getDb();
    const ownerUserId = Number(process.env.SEED_LANDLORD_ID ?? 1);

    if (!Number.isInteger(ownerUserId) || ownerUserId <= 0) {
      throw new Error("SEED_LANDLORD_ID must be a positive integer");
    }

    const listings = [
      {
        title: "Riverside Loft",
        description:
          "Modern loft with panoramic river view and coworking nook.",
        address: "123 River St, Maribor",
        price: "950.00",
        bedrooms: 2,
        bathrooms: 1,
        area: "78.50",
        registeredCount: 0,
        ownerUserId,
      },
      {
        title: "Old Town Studio",
        description:
          "Compact studio perfect for digital nomads, steps from cafes.",
        address: "7 Glavni Trg, Ljubljana",
        price: "720.00",
        bedrooms: 1,
        bathrooms: 1,
        area: "42.00",
        registeredCount: 0,
        ownerUserId,
      },
      {
        title: "Sunny Garden Duplex",
        description: "Duplex with private garden and EV-ready parking spot.",
        address: "55 Park Way, Celje",
        price: "1350.00",
        bedrooms: 3,
        bathrooms: 2,
        area: "128.00",
        registeredCount: 0,
        ownerUserId,
      },
    ];

    await db
      .delete(properties)
      .where(eq(properties.ownerUserId, ownerUserId))
      .execute();

    await db.insert(properties).values(listings).execute();

    console.log(
      `Inserted ${listings.length} properties for landlord user ${ownerUserId}.`,
    );
    process.exit(0);
  } catch (error) {
    console.error("Property seed failed", error);
    process.exit(1);
  }
}

seedProperties();
