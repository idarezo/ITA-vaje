import express from "express";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import swaggerUi from "swagger-ui-express";
import { initDb, getDb } from "./db/index.js";
import { users, userRoles } from "./db/schema.js";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3005;
const JWT_SECRET = process.env.JWT_SECRET || "development-secret";
const DEFAULT_LANDLORD_EMAIL =
  process.env.SEED_LANDLORD_EMAIL || "landlord@example.com";
const DEFAULT_LANDLORD_PASSWORD =
  process.env.SEED_LANDLORD_PASSWORD || "Password123!";

const swaggerDocument = {
  openapi: "3.0.3",
  info: {
    title: "User Service API",
    version: "1.0.0",
    description: "Authentication endpoints for the renter platform",
  },
  servers: [{ url: "/" }],
  tags: [{ name: "Auth" }, { name: "Health" }],
  components: {
    schemas: {
      RegisterRequest: {
        type: "object",
        required: [
          "firstName",
          "lastName",
          "birthYear",
          "role",
          "email",
          "password",
        ],
        properties: {
          firstName: { type: "string", example: "Jane" },
          lastName: { type: "string", example: "Doe" },
          birthYear: { type: "integer", example: 1995 },
          role: {
            type: "string",
            enum: userRoles,
            example: "tenant",
          },
          email: {
            type: "string",
            format: "email",
            example: "jane@example.com",
          },
          password: { type: "string", format: "password" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "jane@example.com",
          },
          password: { type: "string", format: "password" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "integer", example: 1 },
          firstName: { type: "string", example: "Jane" },
          lastName: { type: "string", example: "Doe" },
          birthYear: { type: "integer", example: 1995 },
          role: { type: "string", enum: userRoles },
          email: { type: "string", format: "email" },
        },
      },
      LoginResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          token: { type: "string" },
          user: { $ref: "#/components/schemas/User" },
        },
      },
    },
  },
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Registration successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    user: { $ref: "#/components/schemas/User" },
                  },
                },
              },
            },
          },
          400: { description: "Missing or invalid fields" },
          409: { description: "Email already registered" },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login and receive JWT",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Login successful",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginResponse" },
              },
            },
          },
          400: { description: "Missing credentials" },
          401: { description: "Invalid credentials" },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout (client discards token)",
        responses: {
          200: {
            description: "Logout acknowledged",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { message: { type: "string" } },
                },
              },
            },
          },
        },
      },
    },
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Service health check",
        responses: {
          200: {
            description: "Service is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { status: { type: "string" } },
                },
              },
            },
          },
        },
      },
    },
  },
};

// Serve interactive docs at /docs so endpoints are easy to exercise during development.
app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, { explorer: true }),
);

function buildTokenPayload(user) {
  return {
    id: user.id,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

app.post("/auth/register", async (req, res) => {
  try {
    const { firstName, lastName, birthYear, role, email, password } = req.body;

    if (!firstName || !lastName || !birthYear || !role || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!userRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const db = getDb();
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length) {
      return res.status(409).json({ message: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await db
      .insert(users)
      .values({ firstName, lastName, birthYear, role, email, passwordHash })
      .execute();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return res.status(201).json({
      message: "Registration successful",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        birthYear: user.birthYear,
      },
    });
  } catch (error) {
    console.error("Registration failed", error);
    return res.status(500).json({ message: "Registration failed" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const db = getDb();
    const found = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!found.length) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = found[0];
    const validPassword = await bcrypt.compare(password, user.passwordHash);

    if (!validPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(buildTokenPayload(user), JWT_SECRET, {
      expiresIn: "1h",
    });

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    console.error("Login failed", error);
    return res.status(500).json({ message: "Login failed" });
  }
});

app.post("/auth/logout", (req, res) => {
  return res.json({
    message: "Logout successful. Please discard the token on the client.",
  });
});

app.get("/users/:userId", async (req, res) => {
  const id = Number(req.params.userId);
  if (!id || Number.isNaN(id)) return res.status(400).json({ message: "Invalid userId" });
  const [user] = await getDb().select({
    id: users.id,
    firstName: users.firstName,
    lastName: users.lastName,
    role: users.role,
  }).from(users).where(eq(users.id, id)).limit(1);
  if (!user) return res.status(404).json({ message: "User not found" });
  return res.json(user);
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

async function ensureDefaultLandlord() {
  const db = getDb();

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, DEFAULT_LANDLORD_EMAIL))
    .limit(1);

  if (existing.length) {
    console.log(
      `Default landlord already present (${existing[0].email}, id=${existing[0].id}).`,
    );
    return existing[0];
  }

  const passwordHash = await bcrypt.hash(DEFAULT_LANDLORD_PASSWORD, 10);

  await db
    .insert(users)
    .values({
      firstName: process.env.SEED_LANDLORD_FIRST_NAME || "Lara",
      lastName: process.env.SEED_LANDLORD_LAST_NAME || "Landlord",
      birthYear: Number(process.env.SEED_LANDLORD_BIRTH_YEAR || 1988),
      role: "landlord",
      email: DEFAULT_LANDLORD_EMAIL,
      passwordHash,
    })
    .execute();

  const [created] = await db
    .select()
    .from(users)
    .where(eq(users.email, DEFAULT_LANDLORD_EMAIL))
    .limit(1);

  console.log(
    `Seeded default landlord ${created.email} (id=${created.id}). Password: ${DEFAULT_LANDLORD_PASSWORD}`,
  );
  return created;
}

async function ensureDefaultTenant() {
  const db = getDb();
  const TENANT_EMAIL = "tenant@example.com";

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, TENANT_EMAIL))
    .limit(1);

  if (existing.length) {
    console.log(
      `Default tenant already present (${existing[0].email}, id=${existing[0].id}).`,
    );
    return existing[0];
  }

  const passwordHash = await bcrypt.hash("Tenant123!", 10);

  await db
    .insert(users)
    .values({
      firstName: "Ana",
      lastName: "Kovač",
      birthYear: 1995,
      role: "tenant",
      email: TENANT_EMAIL,
      passwordHash,
    })
    .execute();

  const [created] = await db
    .select()
    .from(users)
    .where(eq(users.email, TENANT_EMAIL))
    .limit(1);

  console.log(
    `Seeded default tenant ${created.email} (id=${created.id}). Password: Tenant123!`,
  );
  return created;
}

async function start() {
  try {
    await initDb();
    await ensureDefaultLandlord();
    await ensureDefaultTenant();
    app.listen(PORT, () => {
      console.log(`User service running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start user service", error);
    process.exit(1);
  }
}

start();
