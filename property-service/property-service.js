import dotenv from "dotenv";
import express from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { initDb, getDb } from "./db/index.js";
import { properties, residents } from "./db/schema.js";
import { and, eq } from "drizzle-orm";
import { initLogger, logger, closeLogger } from "./logger.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;
const DEFAULT_LANDLORD_ID = Number(process.env.SEED_LANDLORD_ID || 1);

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Property Service API",
      version: "1.0.0",
      description: "API za upravljanje nepremičnin - CRUD operacije",
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Development server",
      },
    ],
  },
  apis: ["./property-service.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Middleware
app.use(express.json());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Initialize database and logger
initLogger();
let server;

function defaultListings(ownerUserId) {
  return [
    {
      title: "Riverside Loft",
      description: "Modern loft with panoramic river view and coworking nook.",
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
}

/**
 * @swagger
 * /properties:
 *   post:
 *     summary: Dodaj novo nepremičnino
 *     description: Ustvari novo nepremičnino v bazi podatkov
 *     tags:
 *       - Properties
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - address
 *               - price
 *               - ownerUserId
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Moderna hiša v Ljubljani"
 *               description:
 *                 type: string
 *                 example: "Lepa hiša s pogledom na mesto"
 *               address:
 *                 type: string
 *                 example: "Prešernova 10, Ljubljana"
 *               price:
 *                 type: number
 *                 example: 350000
 *               bedrooms:
 *                 type: integer
 *                 example: 4
 *               bathrooms:
 *                 type: integer
 *                 example: 2
 *               area:
 *                 type: number
 *                 example: 150.5
 *               ownerUserId:
 *                 type: integer
 *                 example: 1
 *                 description: ID landlord uporabnika iz user-service
 *     responses:
 *       201:
 *         description: Property uspešno dodan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 id:
 *                   type: integer
 *       400:
 *         description: Manjkajo obvezni parametri
 *       500:
 *         description: Napaka na strežniku
 */
// 1. DODAJANJE PROPERTY-JA (POST)
app.post("/properties", async (req, res) => {
  try {
    const {
      title,
      description,
      address,
      price,
      bedrooms,
      bathrooms,
      area,
      ownerUserId,
    } = req.body;

    if (!title || !address || price === undefined) {
      logger.warn("Dodajanje property-ja: Manjkajo obvezni parametri", {
        title,
        address,
        price,
      });
      return res.status(400).json({
        error: "Title, address in price so obvezni",
      });
    }

    const normalizedOwnerId = Number(ownerUserId);
    if (
      !ownerUserId ||
      Number.isNaN(normalizedOwnerId) ||
      normalizedOwnerId <= 0
    ) {
      logger.warn("Dodajanje property-ja: Manjka ownerUserId", {
        ownerUserId,
      });
      return res.status(400).json({
        error: "ownerUserId (landlord ID) mora biti podan",
      });
    }

    const result = await getDb().insert(properties).values({
      title,
      description,
      address,
      price,
      bedrooms,
      bathrooms,
      area,
      registeredCount: 0,
      ownerUserId: normalizedOwnerId,
    });

    const propertyId = result.insertId || result[0].insertId;
    logger.info("Property uspešno dodan", {
      propertyId,
      title,
      address,
      price,
      ownerUserId: normalizedOwnerId,
    });

    res.status(201).json({
      message: "Property uspešno dodan",
      id: propertyId,
      ownerUserId: normalizedOwnerId,
    });
  } catch (error) {
    logger.error("Napaka pri dodajanju property-ja", {
      error: error.message,
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /properties:
 *   get:
 *     summary: Pridobi seznam vseh nepremičnin
 *     description: Vrne seznam vseh nepremičnin v bazi
 *     tags:
 *       - Properties
 *     responses:
 *       200:
 *         description: Uspešno pridobljen seznam nepremičnin
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 5
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       address:
 *                         type: string
 *                       price:
 *                         type: number
 *                       bedrooms:
 *                         type: integer
 *                       bathrooms:
 *                         type: integer
 *                       area:
 *                         type: number
 *       500:
 *         description: Napaka na strežniku
 */
// 2. PRIDOBIVANJE PROPERTY-JEV (GET)
// GET /properties - seznam vseh
// GET /properties/:id - posamezna nepremičnina
app.get("/properties", async (req, res) => {
  try {
    const allProperties = await getDb().select().from(properties);
    logger.info("Pridobljene vse nepremiččnine", {
      count: allProperties.length,
    });
    res.json({
      count: allProperties.length,
      data: allProperties,
    });
  } catch (error) {
    logger.error("Napaka pri pridobijanju property-jev", {
      error: error.message,
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /properties/owners/{ownerUserId}/{propertyId}:
 *   get:
 *     summary: Pridobi specifično nepremičnino za določenega landlord-a
 *     description: Vrne nepremičnino samo, če pripada podanemu ownerUserId.
 *     tags:
 *       - Properties
 *     parameters:
 *       - in: path
 *         name: ownerUserId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID landlord uporabnika
 *         example: 1
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID nepremičnine
 *         example: 10
 *     responses:
 *       200:
 *         description: Uspešno pridobljena nepremičnina
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 title:
 *                   type: string
 *                 description:
 *                   type: string
 *                 address:
 *                   type: string
 *                 price:
 *                   type: number
 *                 bedrooms:
 *                   type: integer
 *                 bathrooms:
 *                   type: integer
 *                 area:
 *                   type: number
 *       400:
 *         description: Neveljavni parametri
 *       404:
 *         description: Nepremičnina ni najdena za tega ownerja
 *       500:
 *         description: Napaka na strežniku
 */
app.get("/properties/owners/:ownerUserId/:propertyId", async (req, res) => {
  try {
    const { ownerUserId, propertyId } = req.params;
    const normalizedOwnerId = Number(ownerUserId);
    const normalizedPropertyId = Number(propertyId);

    if (
      Number.isNaN(normalizedOwnerId) ||
      normalizedOwnerId <= 0 ||
      Number.isNaN(normalizedPropertyId) ||
      normalizedPropertyId <= 0
    ) {
      logger.warn("Neveljavni parametri pri pridobivanju property-ja", {
        ownerUserId,
        propertyId,
      });
      return res.status(400).json({
        error: "ownerUserId in propertyId morata biti pozitivni številki",
      });
    }

    const result = await getDb()
      .select()
      .from(properties)
      .where(
        and(
          eq(properties.id, normalizedPropertyId),
          eq(properties.ownerUserId, normalizedOwnerId),
        ),
      );

    const property = result[0];
    if (!property) {
      logger.warn("Property ne obstaja ali ne pripada ownerju", {
        propertyId: normalizedPropertyId,
        ownerUserId: normalizedOwnerId,
      });
      return res
        .status(404)
        .json({ error: "Property ni najdena za tega ownerja" });
    }

    logger.info("Property pridobljen", {
      propertyId: normalizedPropertyId,
      ownerUserId: normalizedOwnerId,
      title: property.title,
    });
    res.json(property);
  } catch (error) {
    logger.error("Napaka pri pridobijanju property-ja", {
      propertyId: req.params.propertyId,
      ownerUserId: req.params.ownerUserId,
      error: error.message,
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /properties/owners/{ownerUserId}:
 *   get:
 *     summary: Pridobi nepremičnine za določenega landlord-a
 *     description: Filtrira nepremičnine po ownerUserId (user-service ID).
 *     tags:
 *       - Properties
 *     parameters:
 *       - in: path
 *         name: ownerUserId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID landlord uporabnika
 *         example: 1
 *     responses:
 *       200:
 *         description: Seznam nepremičnin za podanega lastnika
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       address:
 *                         type: string
 *                       price:
 *                         type: number
 *                       ownerUserId:
 *                         type: integer
 *       400:
 *         description: Neveljaven ownerUserId
 */
app.get("/properties/owners/:ownerUserId", async (req, res) => {
  try {
    const { ownerUserId } = req.params;
    const normalized = Number(ownerUserId);

    if (!ownerUserId || Number.isNaN(normalized) || normalized <= 0) {
      logger.warn("Neveljaven ownerUserId pri filtriranju", { ownerUserId });
      return res
        .status(400)
        .json({ error: "ownerUserId mora biti pozitivno število" });
    }

    const owned = await getDb()
      .select()
      .from(properties)
      .where(eq(properties.ownerUserId, normalized));

    res.json({ count: owned.length, data: owned });
  } catch (error) {
    logger.error("Napaka pri filtriranju property-jev po ownerUserId", {
      ownerUserId: req.params.ownerUserId,
      error: error.message,
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /properties/owners/{ownerUserId}/{propertyId}:
 *   put:
 *     summary: Posodobi nepremičnino določenega landlord-a
 *     description: Posodobi podatke o nepremičnini, ki pripada ownerUserId.
 *     tags:
 *       - Properties
 *     parameters:
 *       - in: path
 *         name: ownerUserId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID landlord uporabnika
 *         example: 1
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID nepremičnine
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               address:
 *                 type: string
 *               price:
 *                 type: number
 *               bedrooms:
 *                 type: integer
 *               bathrooms:
 *                 type: integer
 *               area:
 *                 type: number
 *     responses:
 *       200:
 *         description: Nepremičnina uspešno posodobljena
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 changes:
 *                   type: integer
 *       404:
 *         description: Nepremičnina ni najdena
 *       500:
 *         description: Napaka na strežniku
 */
// 3. SPREMINJANJE PROPERTY-JA (PUT)
app.put("/properties/owners/:ownerUserId/:propertyId", async (req, res) => {
  try {
    const { ownerUserId, propertyId } = req.params;
    const normalizedOwnerId = Number(ownerUserId);
    const normalizedPropertyId = Number(propertyId);

    if (
      Number.isNaN(normalizedOwnerId) ||
      normalizedOwnerId <= 0 ||
      Number.isNaN(normalizedPropertyId) ||
      normalizedPropertyId <= 0
    ) {
      logger.warn("Neveljavni parametri pri posodabljanju property-ja", {
        ownerUserId,
        propertyId,
      });
      return res.status(400).json({
        error: "ownerUserId in propertyId morata biti pozitivni številki",
      });
    }

    const updates = req.body;

    // Preveri ali obstaja
    const existingResult = await getDb()
      .select()
      .from(properties)
      .where(
        and(
          eq(properties.id, normalizedPropertyId),
          eq(properties.ownerUserId, normalizedOwnerId),
        ),
      );
    const existing = existingResult[0];
    if (!existing) {
      logger.warn("Poskus posodobitve neobstoječe property-ja", {
        propertyId: normalizedPropertyId,
        ownerUserId: normalizedOwnerId,
      });
      return res
        .status(404)
        .json({ error: "Property ni najdena za tega ownerja" });
    }

    // Posodobi lastnosti
    await getDb()
      .update(properties)
      .set({
        ...updates,
      })
      .where(eq(properties.id, normalizedPropertyId));

    logger.info("Property posodobljen", {
      propertyId: normalizedPropertyId,
      ownerUserId: normalizedOwnerId,
      updates,
    });
    res.json({
      message: "Property uspešno posodobljen",
    });
  } catch (error) {
    logger.error("Napaka pri posodabljanju property-ja", {
      propertyId: req.params.propertyId,
      ownerUserId: req.params.ownerUserId,
      error: error.message,
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /properties/{id}:
 *   delete:
 *     summary: Izbriši nepremičnino
 *     description: Izbriši specifično nepremičnino iz baze
 *     tags:
 *       - Properties
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID nepremičnine
 *         example: 1
 *     responses:
 *       200:
 *         description: Nepremičnina uspešno izbrisana
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 deleted:
 *                   type: integer
 *       404:
 *         description: Nepremičnina ni najdena
 *       500:
 *         description: Napaka na strežniku
 */
// 4. BRISANJE PROPERTY-JA (DELETE)
app.delete("/properties/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Preveri ali obstaja
    const existingResult = await getDb()
      .select()
      .from(properties)
      .where(eq(properties.id, parseInt(id)));
    const existing = existingResult[0];
    if (!existing) {
      logger.warn("Poskus brisanja neobstoječe property-ja", {
        propertyId: id,
      });
      return res.status(404).json({ error: "Property ni najdena" });
    }

    await getDb()
      .delete(properties)
      .where(eq(properties.id, parseInt(id)));

    logger.info("Property izbrisan", { propertyId: id, title: existing.title });
    res.json({
      message: "Property uspešno izbrisan",
    });
  } catch (error) {
    logger.error("Napaka pri brisanju property-ja", {
      propertyId: req.params.id,
      error: error.message,
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /properties/{propertyId}/tenants:
 *   get:
 *     summary: Pridobi property skupaj s tenant informacijami
 *     description: Vrne podatke o nepremičnini, za katero je tenant prijavljen (trenutno vrne samo property record).
 *     tags:
 *       - Properties
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID nepremičnine
 *         example: 7
 *     responses:
 *       200:
 *         description: Nepremičnina uspešno vrnjena
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 title:
 *                   type: string
 *                 address:
 *                   type: string
 *                 price:
 *                   type: number
 *                 ownerUserId:
 *                   type: integer
 *       400:
 *         description: Neveljaven propertyId
 *       404:
 *         description: Nepremičnina ni najdena
 */
app.get("/properties/{propertyId}/tenants", async (req, res) => {
  const { propertyId } = req.params;
  const normalizedPropertyId = Number(propertyId);

  if (Number.isNaN(normalizedPropertyId) || normalizedPropertyId <= 0) {
    logger.warn("Neveljavni parametri pri pridobivanju property-ja", {
      propertyId,
    });
    return res.status(400).json({
      error: "propertyId mora biti pozitivna številka",
    });
  }

  const result = await getDb()
    .select()
    .from(properties)
    .where(eq(properties.id, normalizedPropertyId));

  const property = result[0];
  if (!property) {
    logger.warn("Property ne obstaja ", {
      propertyId: normalizedPropertyId,
    });
    return res.status(404).json({ error: "Property ni najdena" });
  }

  logger.info("Property pridobljen", {
    propertyId: normalizedPropertyId,
    title: property.title,
  });
  res.json(property);
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Zdravstveni pregled
 *     description: Preveri ali je servis aktiven
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Servis je aktiven
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 */
// Health check
app.get("/health", (req, res) => {
  logger.info("Health check");
  res.json({ status: "Property service je aktiven" });
});

async function ensureDefaultProperties() {
  if (!Number.isInteger(DEFAULT_LANDLORD_ID) || DEFAULT_LANDLORD_ID <= 0) {
    logger.warn(
      "Skipping default property seed: invalid SEED_LANDLORD_ID value",
      {
        DEFAULT_LANDLORD_ID,
      },
    );
    return;
  }

  const db = getDb();
  const existing = await db
    .select()
    .from(properties)
    .where(eq(properties.ownerUserId, DEFAULT_LANDLORD_ID));

  if (existing.length > 0) {
    logger.info(
      `Landlord ${DEFAULT_LANDLORD_ID} already has ${existing.length} properties; skipping default seed.`,
    );
    return;
  }

  const listings = defaultListings(DEFAULT_LANDLORD_ID);
  await db.insert(properties).values(listings).execute();
  logger.info(
    `Seeded ${listings.length} default properties for landlord ${DEFAULT_LANDLORD_ID}`,
  );
}

async function start() {
  try {
    await initDb();
    await ensureDefaultProperties();
    server = app.listen(PORT, () => {
      console.log(`Property service je zagnan na portu ${PORT}`);
      console.log(
        `Swagger dokumentacija je dostopna na: http://localhost:${PORT}/api-docs`,
      );
      logger.info("Property service je zagnan", { port: PORT });
    });
  } catch (error) {
    logger.error("Failed to start property service", { error: error.message });
    process.exit(1);
  }
}

start();

// Zaustavi logger pri gašenju servisa
process.on("SIGTERM", async () => {
  console.log("SIGTERM signal received: closing HTTP server");
  if (server) {
    server.close(() => {
      console.log("HTTP server closed");
      closeLogger();
      process.exit(0);
    });
  } else {
    closeLogger();
    process.exit(0);
  }
});

process.on("SIGINT", async () => {
  console.log("SIGINT signal received: closing HTTP server");
  if (server) {
    server.close(() => {
      console.log("HTTP server closed");
      closeLogger();
      process.exit(0);
    });
  } else {
    closeLogger();
    process.exit(0);
  }
});
