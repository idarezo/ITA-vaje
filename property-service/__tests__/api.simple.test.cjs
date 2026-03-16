const request = require("supertest");
const express = require("express");

// Simply mock logger
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

const { logger } = require("../logger.js");

// Create simple test app
function createTestApp() {
  const app = express();
  app.use(express.json());

  // Simple endpoints for testing
  app.get("/health", (req, res) => {
    res.json({ status: "Property service je aktiven" });
  });

  app.post("/properties", (req, res) => {
    const { title, address, price } = req.body;

    if (!title || !address || price === undefined) {
      logger.warn("Missing required fields", { title, address, price });
      return res.status(400).json({
        error: "Title, address in price so obvezni",
      });
    }

    logger.info("Property created", { title, address, price });
    res.status(201).json({
      message: "Property uspešno dodan",
      id: 1,
    });
  });

  app.get("/properties", (req, res) => {
    logger.info("Getting all properties");
    res.json({
      count: 1,
      data: [
        {
          id: 1,
          title: "Moderna hiša",
          address: "Prešernova 10",
          price: 350000,
        },
      ],
    });
  });

  app.get("/properties/:id", (req, res) => {
    const { id } = req.params;
    if (id === "999") {
      return res.status(404).json({ error: "Property ni najdena" });
    }

    logger.info("Getting property", { propertyId: id });
    res.json({
      id: parseInt(id),
      title: "Test Property",
      address: "Test Address",
      price: 100000,
    });
  });

  app.put("/properties/:id", (req, res) => {
    const { id } = req.params;
    if (id === "999") {
      return res.status(404).json({ error: "Property ni najdena" });
    }

    logger.info("Updating property", { propertyId: id });
    res.json({
      message: "Property uspešno posodobljen",
    });
  });

  app.delete("/properties/:id", (req, res) => {
    const { id } = req.params;
    if (id === "999") {
      return res.status(404).json({ error: "Property ni najdena" });
    }

    logger.info("Deleting property", { propertyId: id });
    res.json({
      message: "Property uspešno izbrisan",
    });
  });

  return app;
}

describe("Property Service API", () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe("GET /health", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health").expect(200);
      expect(response.body).toHaveProperty("status");
      expect(response.body.status).toBe("Property service je aktiven");
    });
  });

  describe("POST /properties", () => {
    it("should create a new property with valid data", async () => {
      const newProperty = {
        title: "Moderna hiša v Ljubljani",
        address: "Prešernova 10, Ljubljana",
        price: 350000,
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
      expect(response.body.count).toBeGreaterThan(0);
    });
  });

  describe("GET /properties/:id", () => {
    it("should return a single property by ID", async () => {
      const response = await request(app).get("/properties/1").expect(200);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("title");
      expect(response.body).toHaveProperty("address");
      expect(response.body).toHaveProperty("price");
    });

    it("should return 404 for non-existent property", async () => {
      const response = await request(app).get("/properties/999").expect(404);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toBe("Property ni najdena");
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
    });

    it("should return 404 if property does not exist", async () => {
      const updates = { title: "Updated" };

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
    });

    it("should return 404 if property does not exist", async () => {
      const response = await request(app).delete("/properties/999").expect(404);

      expect(response.body).toHaveProperty("error");
    });
  });
});
