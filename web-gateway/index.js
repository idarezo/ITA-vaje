import express from "express";

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const PORT = process.env.PORT || 4000;
const USER_SERVICE_URL =
  process.env.USER_SERVICE_URL || "http://localhost:3005";
const PROPERTY_SERVICE_URL =
  process.env.PROPERTY_SERVICE_URL || "http://localhost:3002";
const RESIDENTS_SERVICE_URL =
  process.env.RESIDENTS_SERVICE_URL || "http://localhost:3003";
const PAYMENT_SERVICE_URL =
  process.env.PAYMENT_SERVICE_URL || "http://localhost:3004";

async function proxyJson(url, options = {}) {
  let response;
  try {
    response = await fetch(url, {
      headers: {
        "content-type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (err) {
    return {
      status: 503,
      body: { error: `Service unreachable: ${err.message}` },
    };
  }

  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text();

  return { status: response.status, body };
}

function sendProxyResponse(res, proxied) {
  if (proxied.body && typeof proxied.body === "object") {
    return res.status(proxied.status).json(proxied.body);
  }

  return res.status(proxied.status).send(proxied.body);
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "web-gateway" });
});

app.get("/users/:userId", async (req, res) => {
  const { userId } = req.params;
  const proxied = await proxyJson(`${USER_SERVICE_URL}/users/${userId}`);
  return sendProxyResponse(res, proxied);
});

app.post("/auth/register", async (req, res) => {
  const proxied = await proxyJson(`${USER_SERVICE_URL}/auth/register`, {
    method: "POST",
    body: JSON.stringify(req.body),
  });
  return sendProxyResponse(res, proxied);
});

app.post("/auth/login", async (req, res) => {
  const proxied = await proxyJson(`${USER_SERVICE_URL}/auth/login`, {
    method: "POST",
    body: JSON.stringify(req.body),
  });
  return sendProxyResponse(res, proxied);
});

app.post("/auth/logout", async (req, res) => {
  const proxied = await proxyJson(`${USER_SERVICE_URL}/auth/logout`, {
    method: "POST",
    body: JSON.stringify(req.body ?? {}),
  });
  return sendProxyResponse(res, proxied);
});

app.get("/owners/:ownerUserId/properties", async (req, res) => {
  const { ownerUserId } = req.params;
  const [proxied, residentsProxied] = await Promise.all([
    proxyJson(`${PROPERTY_SERVICE_URL}/properties/owners/${ownerUserId}`),
    proxyJson(`${RESIDENTS_SERVICE_URL}/residents?limit=1000`),
  ]);

  if (proxied.status !== 200 || !Array.isArray(proxied.body?.data)) {
    return sendProxyResponse(res, proxied);
  }

  // count residents per property_id
  const residents = residentsProxied.body?.residents ?? [];
  const countByProperty = {};
  for (const r of residents) {
    countByProperty[r.property_id] = (countByProperty[r.property_id] ?? 0) + 1;
  }

  const enriched = proxied.body.data.map((p) => ({
    ...p,
    registeredCount: countByProperty[p.id] ?? 0,
  }));

  return res.status(200).json({ ...proxied.body, data: enriched });
});

app.post("/owners/:ownerUserId/properties", async (req, res) => {
  const { ownerUserId } = req.params;
  const proxied = await proxyJson(`${PROPERTY_SERVICE_URL}/properties`, {
    method: "POST",
    body: JSON.stringify({ ...req.body, ownerUserId: Number(ownerUserId) }),
  });
  return sendProxyResponse(res, proxied);
});

app.get("/owners/:ownerUserId/properties/:propertyId", async (req, res) => {
  const { ownerUserId, propertyId } = req.params;
  const proxied = await proxyJson(
    `${PROPERTY_SERVICE_URL}/properties/owners/${ownerUserId}/${propertyId}`,
  );
  return sendProxyResponse(res, proxied);
});

app.put("/owners/:ownerUserId/properties/:propertyId", async (req, res) => {
  const { ownerUserId, propertyId } = req.params;
  const proxied = await proxyJson(
    `${PROPERTY_SERVICE_URL}/properties/owners/${ownerUserId}/${propertyId}`,
    {
      method: "PUT",
      body: JSON.stringify(req.body),
    },
  );
  return sendProxyResponse(res, proxied);
});

app.delete("/owners/:ownerUserId/properties/:propertyId", async (req, res) => {
  const { propertyId } = req.params;
  const proxied = await proxyJson(
    `${PROPERTY_SERVICE_URL}/properties/${propertyId}`,
    { method: "DELETE" },
  );
  return sendProxyResponse(res, proxied);
});

app.get(
  "/owners/:ownerUserId/properties/:propertyId/tenants",
  async (req, res) => {
    const { propertyId } = req.params;
    const proxied = await proxyJson(
      `${RESIDENTS_SERVICE_URL}/properties/${propertyId}/residents`,
    );
    return sendProxyResponse(res, proxied);
  },
);

app.get(
  "/owners/:ownerUserId/properties/:propertyId/residents",
  async (req, res) => {
    const { propertyId } = req.params;
    const proxied = await proxyJson(
      `${RESIDENTS_SERVICE_URL}/properties/${propertyId}/residents`,
    );
    return sendProxyResponse(res, proxied);
  },
);

app.get("/residents", async (req, res) => {
  const qs = new URLSearchParams(req.query).toString();
  const proxied = await proxyJson(`${RESIDENTS_SERVICE_URL}/residents${qs ? "?" + qs : ""}`);
  return sendProxyResponse(res, proxied);
});

app.post("/residents", async (req, res) => {
  const proxied = await proxyJson(`${RESIDENTS_SERVICE_URL}/residents`, {
    method: "POST",
    body: JSON.stringify(req.body),
  });
  return sendProxyResponse(res, proxied);
});

app.get("/residents/:residentId", async (req, res) => {
  const { residentId } = req.params;
  const proxied = await proxyJson(
    `${RESIDENTS_SERVICE_URL}/residents/${residentId}`,
  );
  return sendProxyResponse(res, proxied);
});

app.put("/residents/:residentId", async (req, res) => {
  const { residentId } = req.params;
  const proxied = await proxyJson(
    `${RESIDENTS_SERVICE_URL}/residents/${residentId}`,
    {
      method: "PUT",
      body: JSON.stringify(req.body),
    },
  );
  return sendProxyResponse(res, proxied);
});

app.delete("/residents/:residentId", async (req, res) => {
  const { residentId } = req.params;

  const paymentsProxied = await proxyJson(
    `${PAYMENT_SERVICE_URL}/payments/residents/${residentId}`,
  );
  if (paymentsProxied.status === 200 && Array.isArray(paymentsProxied.body)) {
    const hasPending = paymentsProxied.body.some((p) => p.status === "PENDING");
    if (hasPending) {
      return res.status(409).json({
        error: "Najemnik ima neporavnana plačila. Pred brisanjem poravnajte vse odprte račune.",
      });
    }
  }

  const proxied = await proxyJson(
    `${RESIDENTS_SERVICE_URL}/residents/${residentId}`,
    { method: "DELETE" },
  );
  return sendProxyResponse(res, proxied);
});

app.get("/properties/:propertyId", async (req, res) => {
  const { propertyId } = req.params;
  const proxied = await proxyJson(
    `${PROPERTY_SERVICE_URL}/properties/${propertyId}/tenants`,
  );
  return sendProxyResponse(res, proxied);
});

// ── PAYMENTS ──────────────────────────────────────────────────────────────

app.get("/payments", async (_req, res) => {
  const proxied = await proxyJson(`${PAYMENT_SERVICE_URL}/payments`);
  return sendProxyResponse(res, proxied);
});

app.post("/payments/rent", async (req, res) => {
  const proxied = await proxyJson(`${PAYMENT_SERVICE_URL}/payments/rent`, {
    method: "POST",
    body: JSON.stringify(req.body),
  });
  return sendProxyResponse(res, proxied);
});

app.get("/payments/properties/:propertyId/latest", async (req, res) => {
  const { propertyId } = req.params;
  const proxied = await proxyJson(
    `${PAYMENT_SERVICE_URL}/payments/properties/${propertyId}`,
  );
  if (proxied.status !== 200 || !Array.isArray(proxied.body)) {
    return sendProxyResponse(res, proxied);
  }
  const sorted = [...proxied.body].sort(
    (a, b) => new Date(b.dueDate) - new Date(a.dueDate),
  );
  const latest = sorted[0] ?? null;
  return res
    .status(latest ? 200 : 404)
    .json(latest ?? { error: "No payments found" });
});

app.get("/payments/properties/:propertyId", async (req, res) => {
  const { propertyId } = req.params;
  const proxied = await proxyJson(
    `${PAYMENT_SERVICE_URL}/payments/properties/${propertyId}`,
  );
  return sendProxyResponse(res, proxied);
});

app.get("/payments/residents/:residentId", async (req, res) => {
  const { residentId } = req.params;
  const proxied = await proxyJson(
    `${PAYMENT_SERVICE_URL}/payments/residents/${residentId}`,
  );
  return sendProxyResponse(res, proxied);
});

app.get("/payments/:paymentId", async (req, res) => {
  const { paymentId } = req.params;
  const proxied = await proxyJson(
    `${PAYMENT_SERVICE_URL}/payments/${paymentId}`,
  );
  return sendProxyResponse(res, proxied);
});

app.post("/payments/:paymentId/pay", async (req, res) => {
  const { paymentId } = req.params;
  const proxied = await proxyJson(
    `${PAYMENT_SERVICE_URL}/payments/${paymentId}/pay`,
    { method: "POST", body: JSON.stringify(req.body ?? {}) },
  );
  return sendProxyResponse(res, proxied);
});

app.post("/payments/:paymentId/cancel", async (req, res) => {
  const { paymentId } = req.params;
  const proxied = await proxyJson(
    `${PAYMENT_SERVICE_URL}/payments/${paymentId}/cancel`,
    { method: "POST" },
  );
  return sendProxyResponse(res, proxied);
});

app.post("/payments/:paymentId/retry", async (req, res) => {
  const { paymentId } = req.params;
  const proxied = await proxyJson(
    `${PAYMENT_SERVICE_URL}/payments/${paymentId}/retry`,
    { method: "POST" },
  );
  return sendProxyResponse(res, proxied);
});

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found in web-gateway" });
});

app.listen(PORT, () => {
  console.log(`Web gateway running on port ${PORT}`);
});
