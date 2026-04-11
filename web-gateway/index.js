import express from "express";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4000;
const USER_SERVICE_URL =
  process.env.USER_SERVICE_URL || "http://localhost:3005";
const PROPERTY_SERVICE_URL =
  process.env.PROPERTY_SERVICE_URL || "http://localhost:3002";
const RESIDENTS_SERVICE_URL =
  process.env.RESIDENTS_SERVICE_URL || "http://localhost:3003";

async function proxyJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

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

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "web-gateway" });
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
  const proxied = await proxyJson(
    `${PROPERTY_SERVICE_URL}/properties/owners/${ownerUserId}`,
  );
  return sendProxyResponse(res, proxied);
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
  const { ownerUserId, propertyId } = req.params;
  const proxied = await proxyJson(
    `${PROPERTY_SERVICE_URL}/properties/owners/${ownerUserId}/${propertyId}`,
    {
      method: "DELETE",
    },
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

app.get("/properties/:propertyId", async (req, res) => {
  const { propertyId } = req.params;
  const proxied = await proxyJson(
    `${PROPERTY_SERVICE_URL}/properties/by-id/${propertyId}`,
  );
  return sendProxyResponse(res, proxied);
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found in web-gateway" });
});

app.listen(PORT, () => {
  console.log(`Web gateway running on port ${PORT}`);
});
