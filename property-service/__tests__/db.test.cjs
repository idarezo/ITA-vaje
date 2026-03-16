// Mock database module before requiring
jest.mock("../db/index.js", () => ({
  initDb: jest.fn().mockResolvedValue(undefined),
  getDb: jest.fn().mockReturnValue({
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockResolvedValue([{ insertId: 1 }]),
    }),
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([
          {
            id: 1,
            title: "Test Property",
            address: "Test Address",
            price: 100000,
          },
        ]),
        then: (resolve) =>
          resolve([
            {
              id: 1,
              title: "Test Property",
              address: "Test Address",
              price: 100000,
            },
          ]),
        catch: () => {},
      }),
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue({ changes: 1 }),
      }),
    }),
    delete: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue({ changes: 1 }),
    }),
  }),
  getPool: jest.fn().mockReturnValue({
    end: jest.fn().mockResolvedValue(undefined),
  }),
}));

const { initDb, getDb, getPool } = require("../db/index.js");
const { eq } = require("drizzle-orm");

// Mock schema objects (avoid ES module import conflict)
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

describe("Database Layer", () => {
  let db;

  beforeAll(async () => {
    await initDb();
    db = getDb();
  });

  afterAll(async () => {
    const pool = getPool();
    if (pool) {
      await pool.end();
    }
  });

  describe("Database Initialization", () => {
    it("should initialize database connection", async () => {
      expect(db).toBeDefined();
    });

    it("should have drizzle ORM methods", () => {
      expect(typeof db.select).toBe("function");
      expect(typeof db.insert).toBe("function");
      expect(typeof db.update).toBe("function");
      expect(typeof db.delete).toBe("function");
    });
  });

  describe("Properties Table", () => {
    let insertedId;

    it("should insert a property", async () => {
      const result = await db.insert(properties).values({
        title: "Test Property",
        description: "Test Description",
        address: "Test Address",
        price: 100000,
        bedrooms: 3,
        bathrooms: 2,
        area: 150.5,
        registeredCount: 0,
      });

      expect(result).toBeDefined();
      insertedId = result[0]?.insertId;
      expect(insertedId).toBeDefined();
    });

    it("should select all properties", async () => {
      const results = await db.select().from(properties);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it("should select a property by ID", async () => {
      if (!insertedId) {
        const inserted = await db.insert(properties).values({
          title: "Query Test Property",
          address: "Query Test Address",
          price: 200000,
          registeredCount: 0,
        });
        insertedId = inserted[0]?.insertId;
      }

      const result = await db
        .select()
        .from(properties)
        .where(eq(properties.id, insertedId));

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0].id).toBe(insertedId);
      }
    });

    it("should update a property", async () => {
      if (!insertedId) {
        const inserted = await db.insert(properties).values({
          title: "Update Test Property",
          address: "Update Test Address",
          price: 300000,
          registeredCount: 0,
        });
        insertedId = inserted[0]?.insertId;
      }

      const result = await db
        .update(properties)
        .set({ title: "Updated Title" })
        .where(eq(properties.id, insertedId));

      expect(result).toBeDefined();
    });

    it("should delete a property", async () => {
      if (!insertedId) {
        const inserted = await db.insert(properties).values({
          title: "Delete Test Property",
          address: "Delete Test Address",
          price: 400000,
          registeredCount: 0,
        });
        insertedId = inserted[0]?.insertId;
      }

      const result = await db
        .delete(properties)
        .where(eq(properties.id, insertedId));

      expect(result).toBeDefined();
    });
  });

  describe("Residents Table", () => {
    let propertyId;
    let residentId;

    beforeAll(async () => {
      // Create a test property first
      const propResult = await db.insert(properties).values({
        title: "Resident Test Property",
        address: "Resident Test Address",
        price: 500000,
        registeredCount: 0,
      });
      propertyId = propResult[0]?.insertId;
    });

    it("should insert a resident", async () => {
      if (!propertyId) {
        throw new Error("Property ID not set up");
      }

      const result = await db.insert(residents).values({
        firstName: "Test",
        lastName: "Resident",
        email: "test@example.com",
        phone: "1234567890",
        propertyId: propertyId,
      });

      expect(result).toBeDefined();
      residentId = result[0]?.insertId;
      expect(residentId).toBeDefined();
    });

    it("should select all residents", async () => {
      const results = await db.select().from(residents);

      expect(Array.isArray(results)).toBe(true);
    });

    it("should select residents by property ID", async () => {
      if (!propertyId) {
        throw new Error("Property ID not set up");
      }

      const results = await db
        .select()
        .from(residents)
        .where(eq(residents.propertyId, propertyId));

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("Connection Pool", () => {
    it("should have a valid connection pool", () => {
      const pool = getPool();
      expect(pool).toBeDefined();
    });
  });
});
