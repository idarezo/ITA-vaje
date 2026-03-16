import dotenv from "dotenv";
import express from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { initDb, getDb } from "./db/index.js";
import { properties, residents } from "./db/schema.js";
import { eq } from "drizzle-orm";
import { initLogger, logger, closeLogger } from "./logger.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

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
initDb();
initLogger();

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
    const { title, description, address, price, bedrooms, bathrooms, area } =
      req.body;

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

    const result = await getDb().insert(properties).values({
      title,
      description,
      address,
      price,
      bedrooms,
      bathrooms,
      area,
      registeredCount: 0,
    });

    const propertyId = result.insertId || result[0].insertId;
    logger.info("Property uspešno dodan", {
      propertyId,
      title,
      address,
      price,
    });

    res.status(201).json({
      message: "Property uspešno dodan",
      id: propertyId,
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
 * /properties/{id}:
 *   get:
 *     summary: Pridobi specifično nepremičnino
 *     description: Vrne podatke o specifični nepremičnini po ID-ju
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
 *       404:
 *         description: Nepremičnina ni najdena
 *       500:
 *         description: Napaka na strežniku
 */
app.get("/properties/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getDb()
      .select()
      .from(properties)
      .where(eq(properties.id, parseInt(id)));

    const property = result[0];
    if (!property) {
      logger.warn("Property ne obstaja", { propertyId: id });
      return res.status(404).json({ error: "Property ni najdena" });
    }

    logger.info("Property pridobljen", {
      propertyId: id,
      title: property.title,
    });
    res.json(property);
  } catch (error) {
    logger.error("Napaka pri pridobijanju property-ja", {
      propertyId: req.params.id,
      error: error.message,
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /properties/{id}:
 *   put:
 *     summary: Posodobi nepremičnino
 *     description: Posodobi podatke o specifični nepremičnini
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
app.put("/properties/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Preveri ali obstaja
    const existingResult = await getDb()
      .select()
      .from(properties)
      .where(eq(properties.id, parseInt(id)));
    const existing = existingResult[0];
    if (!existing) {
      logger.warn("Poskus posodobitve neobstoječe property-ja", {
        propertyId: id,
      });
      return res.status(404).json({ error: "Property ni najdena" });
    }

    // Posodobi lastnosti
    await getDb()
      .update(properties)
      .set({
        ...updates,
      })
      .where(eq(properties.id, parseInt(id)));

    logger.info("Property posodobljen", { propertyId: id, updates });
    res.json({
      message: "Property uspešno posodobljen",
    });
  } catch (error) {
    logger.error("Napaka pri posodabljanju property-ja", {
      propertyId: req.params.id,
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

const server = app.listen(PORT, () => {
  console.log(`Property service je zagnan na portu ${PORT}`);
  console.log(
    `Swagger dokumentacija je dostopna na: http://localhost:${PORT}/api-docs`,
  );
  logger.info("Property service je zagnan", { port: PORT });
});

// Zaustavi logger pri gašenju servisa
process.on("SIGTERM", async () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    closeLogger();
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  console.log("SIGINT signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    closeLogger();
    process.exit(0);
  });
});
