const request = require("supertest");
const express = require("express");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

// Create shared mock database instance
const createMockDb = () => {
  const mockData = [
    {
      id: 1,
      title: "Test Property",
      address: "Test Address",
      price: 100000,
    },
  ];

  return {
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockResolvedValue([{ insertId: 1 }]),
    }),
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(mockData),
        then: (resolve) => resolve(mockData),
        catch: () => {},
      }),
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ changes: 1 }]),
      }),
    }),
    delete: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue([{ changes: 1 }]),
    }),
  };
};

let globalMockDb = createMockDb();

// Mock modules
jest.mock("../db/index.js", () => ({
  initDb: jest.fn(),
  getDb: jest.fn(() => globalMockDb),
  getPool: jest.fn(),
}));

jest.mock("../logger.js", () => ({
  initLogger: jest.fn(),
  closeLogger: jest.fn(),
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock("amqplib");

// Get mock functions
const { getDb } = require("../db/index.js");
const { logger } = require("../logger.js");
const { eq } = require("drizzle-orm");

// Mock schema objects for testing
const properties = {
  id: "id",
  title: "title",
  description: "description",
  address: "address",
  price: "price",
  bedrooms: "bedrooms",
  bathrooms: "bathrooms",
  area: "area",
  registeredCount: "registeredCount",
};

const residents = {
  id: "id",
  firstName: "firstName",
  lastName: "lastName",
  email: "email",
  phone: "phone",
  propertyId: "propertyId",
};

// Create test app
function createTestApp() {
  const app = express();
  const PORT = 3002;

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
    apis: [],
  };

  const swaggerSpec = swaggerJsdoc(swaggerOptions);

  // Middleware
  app.use(express.json());
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Test endpoints
  // POST /properties
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

      const propertyId = result[0]?.insertId || result.insertId || 1;

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

  // GET /properties
  app.get("/properties", async (req, res) => {
    try {
      const allProperties = await getDb().select().from(properties);

      logger.info("Pridobljene vse nepremičnine", {
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

  // GET /properties/:id
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

  // PUT /properties/:id
  app.put("/properties/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const existingResult = await getDb()
        .select()
        .from(properties)
        .where(eq(properties.id, parseInt(id)));

      if (!existingResult[0]) {
        logger.warn("Poskus posodobitve neobstoječe property-ja", {
          propertyId: id,
        });
        return res.status(404).json({ error: "Property ni najdena" });
      }

      await getDb()
        .update(properties)
        .set(updates)
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

  // DELETE /properties/:id
  app.delete("/properties/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const existingResult = await getDb()
        .select()
        .from(properties)
        .where(eq(properties.id, parseInt(id)));

      if (!existingResult[0]) {
        logger.warn("Poskus brisanja neobstoječe property-ja", {
          propertyId: id,
        });
        return res.status(404).json({ error: "Property ni najdena" });
      }

      await getDb()
        .delete(properties)
        .where(eq(properties.id, parseInt(id)));

      logger.info("Property izbrisan", {
        propertyId: id,
        title: existingResult[0].title,
      });
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

  // Health check
  app.get("/health", (req, res) => {
    logger.info("Health check");
    res.json({ status: "Property service je aktiven" });
  });

  return app;
}

describe("Property Service API", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    // Recreate the mock database for each test
    globalMockDb = createMockDb();
    app = createTestApp();
  });

  describe("POST /properties", () => {
    it("should create a new property with valid data", async () => {
      const newProperty = {
        title: "Moderna hiša v Ljubljani",
        description: "Lepa hiša s pogledom",
        address: "Prešernova 10, Ljubljana",
        price: 350000,
        bedrooms: 4,
        bathrooms: 2,
        area: 150.5,
      };

      const response = await request(app)
        .post("/properties")
        .send(newProperty)
        .expect(201);

      expect(response.body).toHaveProperty("message");
      expect(response.body).toHaveProperty("id");
      expect(response.body.message).toBe("Property uspešno dodan");
      expect(logger.info).toHaveBeenCalled();
    });

    it("should return 400 if required fields are missing", async () => {
      const invalidProperty = {
        title: "Moderna hiša v Ljubljani",
        // Missing address and price
      };

      const response = await request(app)
        .post("/properties")
        .send(invalidProperty)
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(logger.warn).toHaveBeenCalled();
    });

    it("should return 400 if price is missing", async () => {
      const invalidProperty = {
        title: "Moderna hiša v Ljubljani",
        address: "Prešernova 10, Ljubljana",
        // Missing price
      };

      const response = await request(app)
        .post("/properties")
        .send(invalidProperty)
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /properties", () => {
    it("should return all properties", async () => {
      const response = await request(app).get("/properties").expect(200);

      expect(response.body).toHaveProperty("count");
      expect(response.body).toHaveProperty("data");
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe("GET /properties/:id", () => {
    it("should return a single property by ID", async () => {
      const response = await request(app).get("/properties/1").expect(200);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("title");
      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe("PUT /properties/:id", () => {
    it("should update a property", async () => {
      const updates = {
        title: "Updated Property",
        price: 400000,
      };

      const response = await request(app)
        .put("/properties/1")
        .send(updates)
        .expect(200);

      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toBe("Property uspešno posodobljen");
      expect(logger.info).toHaveBeenCalled();
    });

    it("should return 404 if property does not exist", async () => {
      const mockDb = getDb();
      mockDb.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      const updates = {
        title: "Updated Property",
      };

      const response = await request(app)
        .put("/properties/999")
        .send(updates)
        .expect(404);

      expect(response.body).toHaveProperty("error");
    });
  });

  describe("DELETE /properties/:id", () => {
    it("should delete a property", async () => {
      const response = await request(app).delete("/properties/1").expect(200);

      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toBe("Property uspešno izbrisan");
      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe("GET /health", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.body).toHaveProperty("status");
      expect(response.body.status).toBe("Property service je aktiven");
    });
  });
});
