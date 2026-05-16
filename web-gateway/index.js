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

// ── VZOREC: ODKLOPNIK (Circuit Breaker) ───────────────────────────────────
//
// Problem brez odklopnika: če payment-service "visi" (čaka 30s na odgovor),
// vsak zahtevek do gateway-a prav tako čaka 30s. Pri večjem prometu se vsi
// delavski niti gateway-a zasedejo z čakanjem → kaskadna odpoved celotnega
// sistema (tudi user-service in property-service postaneta nedosegljiva).
//
// Odklopnik deluje kot avtomatska varovalka z 3 stanji:
//
//   CLOSED (zaprto) ──→ normalno delovanje, zahtevki gredo skozi.
//       ↓  (N zaporednih napak)
//   OPEN (odprto) ──→ krog je prekinjen; zahtevki se TAKOJ zavrnejo s 503,
//       ↓              brez čakanja na nedosegljiv servis.
//   (po recoveryTimeout ms)
//   HALF_OPEN (polodprto) ──→ en preskusni zahtevek gre skozi.
//       ↓ uspeh → CLOSED           ↓ napaka → OPEN

const CB_CLOSED    = "CLOSED";
const CB_OPEN      = "OPEN";
const CB_HALF_OPEN = "HALF_OPEN";

class CircuitBreaker {
  constructor(name, { failureThreshold = 3, recoveryTimeout = 30_000 } = {}) {
    this.name             = name;
    this.failureThreshold = failureThreshold; // napake pred odprtjem
    this.recoveryTimeout  = recoveryTimeout;  // ms čakanja pred HALF_OPEN
    this.state            = CB_CLOSED;
    this.failureCount     = 0;
    this.lastFailureTime  = null;
  }

  // Vrne true kadar je krog odprt in zahtevek ne sme iti skozi.
  isOpen() {
    if (this.state === CB_OPEN) {
      if (Date.now() - this.lastFailureTime >= this.recoveryTimeout) {
        this.state = CB_HALF_OPEN;
        console.log(`[CircuitBreaker] ${this.name}: HALF_OPEN — preskusni zahtevek`);
        return false;
      }
      return true;
    }
    return false;
  }

  onSuccess() {
    if (this.state !== CB_CLOSED) {
      console.log(`[CircuitBreaker] ${this.name}: CLOSED — servis je spet dosegljiv`);
    }
    this.failureCount = 0;
    this.state        = CB_CLOSED;
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.state === CB_HALF_OPEN || this.failureCount >= this.failureThreshold) {
      this.state = CB_OPEN;
      console.warn(`[CircuitBreaker] ${this.name}: OPEN po ${this.failureCount} napakah`);
    }
  }

  status() {
    return {
      state:           this.state,
      failureCount:    this.failureCount,
      lastFailureTime: this.lastFailureTime
        ? new Date(this.lastFailureTime).toISOString()
        : null,
    };
  }
}

// En odklopnik na servis — vsak servis neodvisno šteje napake.
const breakers = {
  user:      new CircuitBreaker("user-service"),
  property:  new CircuitBreaker("property-service"),
  residents: new CircuitBreaker("residents-service"),
  payment:   new CircuitBreaker("payment-service"),
};

// ── POMOŽNE FUNKCIJE ───────────────────────────────────────────────────────

// proxyJson zdaj sprejme odklopnik (cb). Pred vsakim fetch() preveri stanje.
// 5xx odgovori štejejo kot napaka (servis teče, a je pokvarjen).
// 4xx odgovori NE štejejo — 404 ali 401 je veljaven odgovor, ne napaka servisa.
async function proxyJson(url, options = {}, cb = null) {
  if (cb && cb.isOpen()) {
    console.warn(`[CircuitBreaker] ${cb.name}: fast-fail (krog ODPRT)`);
    return {
      status: 503,
      body: { error: `Storitev ${cb.name} trenutno ni dosegljiva (odklopnik odprt).` },
    };
  }

  let response;
  try {
    response = await fetch(url, {
      headers: { "content-type": "application/json", ...(options.headers || {}) },
      ...options,
    });
  } catch (err) {
    if (cb) cb.onFailure();
    return { status: 503, body: { error: `Storitev nedosegljiva: ${err.message}` } };
  }

  if (response.status >= 500) {
    if (cb) cb.onFailure();
  } else {
    if (cb) cb.onSuccess();
  }

  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text();

  return { status: response.status, body };
}

// Kratki pomočniki — vsak klic avtomatsko dobi pravi odklopnik.
const proxyUser      = (path, opts) => proxyJson(`${USER_SERVICE_URL}${path}`,      opts, breakers.user);
const proxyProperty  = (path, opts) => proxyJson(`${PROPERTY_SERVICE_URL}${path}`,  opts, breakers.property);
const proxyResidents = (path, opts) => proxyJson(`${RESIDENTS_SERVICE_URL}${path}`, opts, breakers.residents);
const proxyPayment   = (path, opts) => proxyJson(`${PAYMENT_SERVICE_URL}${path}`,   opts, breakers.payment);

function sendProxyResponse(res, proxied) {
  if (proxied.body && typeof proxied.body === "object") {
    return res.status(proxied.status).json(proxied.body);
  }
  return res.status(proxied.status).send(proxied.body);
}

// ── VZOREC: VMESNIK ZA PREVERJANJE STANJA (Health Check API) ──────────────
//
// /health        → samo gateway sam (obstoječe)
// /health/all    → agregiran pogled na vse servise vzporedno
// /health/circuit-breakers → trenutno stanje vseh odklopnikov (za razhroščevanje)
//
// Zakaj agregator? Gateway je edina vstopna točka; brez /health/all moraš
// ročno klicati vsak servis posebej da ugotoviš kaj je pokvarjeno.
// HTTP 200 = vse zdravo, HTTP 207 = vsaj en servis ima težave.

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "web-gateway" });
});

app.get("/health/all", async (_req, res) => {
  const targets = [
    { name: "user-service",      fn: () => proxyUser("/health") },
    { name: "property-service",  fn: () => proxyProperty("/health") },
    { name: "residents-service", fn: () => proxyResidents("/health") },
    { name: "payment-service",   fn: () => proxyPayment("/health") },
  ];

  const results = await Promise.all(
    targets.map(async ({ name, fn }) => {
      const start   = Date.now();
      const proxied = await fn();
      return {
        service:        name,
        status:         proxied.status === 200 ? "healthy" : "unhealthy",
        httpStatus:     proxied.status,
        responseTimeMs: Date.now() - start,
        circuitBreaker: breakers[name.replace("-service", "")]?.status() ?? null,
      };
    }),
  );

  const allHealthy = results.every((r) => r.status === "healthy");
  return res.status(allHealthy ? 200 : 207).json({
    status:    allHealthy ? "healthy" : "degraded",
    gateway:   "web-gateway",
    timestamp: new Date().toISOString(),
    services:  results,
  });
});

app.get("/health/circuit-breakers", (_req, res) => {
  res.json(
    Object.fromEntries(
      Object.entries(breakers).map(([k, cb]) => [`${k}-service`, cb.status()]),
    ),
  );
});

app.get("/users/:userId", async (req, res) => {
  const proxied = await proxyUser(`/users/${req.params.userId}`);
  return sendProxyResponse(res, proxied);
});

app.post("/auth/register", async (req, res) => {
  const proxied = await proxyUser("/auth/register", { method: "POST", body: JSON.stringify(req.body) });
  return sendProxyResponse(res, proxied);
});

app.post("/auth/login", async (req, res) => {
  const proxied = await proxyUser("/auth/login", { method: "POST", body: JSON.stringify(req.body) });
  return sendProxyResponse(res, proxied);
});

app.post("/auth/logout", async (req, res) => {
  const proxied = await proxyUser("/auth/logout", { method: "POST", body: JSON.stringify(req.body ?? {}) });
  return sendProxyResponse(res, proxied);
});

app.get("/owners/:ownerUserId/properties", async (req, res) => {
  const { ownerUserId } = req.params;
  const [proxied, residentsProxied] = await Promise.all([
    proxyProperty(`/properties/owners/${ownerUserId}`),
    proxyResidents("/residents?limit=1000"),
  ]);

  if (proxied.status !== 200 || !Array.isArray(proxied.body?.data)) {
    return sendProxyResponse(res, proxied);
  }

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
  const proxied = await proxyProperty("/properties", {
    method: "POST",
    body: JSON.stringify({ ...req.body, ownerUserId: Number(ownerUserId) }),
  });
  return sendProxyResponse(res, proxied);
});

app.get("/owners/:ownerUserId/properties/:propertyId", async (req, res) => {
  const { ownerUserId, propertyId } = req.params;
  const proxied = await proxyProperty(`/properties/owners/${ownerUserId}/${propertyId}`);
  return sendProxyResponse(res, proxied);
});

app.put("/owners/:ownerUserId/properties/:propertyId", async (req, res) => {
  const { ownerUserId, propertyId } = req.params;
  const proxied = await proxyProperty(
    `/properties/owners/${ownerUserId}/${propertyId}`,
    { method: "PUT", body: JSON.stringify(req.body) },
  );
  return sendProxyResponse(res, proxied);
});

app.delete("/owners/:ownerUserId/properties/:propertyId", async (req, res) => {
  const proxied = await proxyProperty(`/properties/${req.params.propertyId}`, { method: "DELETE" });
  return sendProxyResponse(res, proxied);
});

app.get(
  "/owners/:ownerUserId/properties/:propertyId/tenants",
  async (req, res) => {
    const proxied = await proxyResidents(`/properties/${req.params.propertyId}/residents`);
    return sendProxyResponse(res, proxied);
  },
);

app.get(
  "/owners/:ownerUserId/properties/:propertyId/residents",
  async (req, res) => {
    const proxied = await proxyResidents(`/properties/${req.params.propertyId}/residents`);
    return sendProxyResponse(res, proxied);
  },
);

app.get("/residents", async (req, res) => {
  const qs = new URLSearchParams(req.query).toString();
  const proxied = await proxyResidents(`/residents${qs ? "?" + qs : ""}`);
  return sendProxyResponse(res, proxied);
});

app.post("/residents", async (req, res) => {
  const proxied = await proxyResidents("/residents", { method: "POST", body: JSON.stringify(req.body) });
  return sendProxyResponse(res, proxied);
});

app.get("/residents/:residentId", async (req, res) => {
  const proxied = await proxyResidents(`/residents/${req.params.residentId}`);
  return sendProxyResponse(res, proxied);
});

app.put("/residents/:residentId", async (req, res) => {
  const proxied = await proxyResidents(
    `/residents/${req.params.residentId}`,
    { method: "PUT", body: JSON.stringify(req.body) },
  );
  return sendProxyResponse(res, proxied);
});

app.delete("/residents/:residentId", async (req, res) => {
  const { residentId } = req.params;

  const paymentsProxied = await proxyPayment(`/payments/residents/${residentId}`);
  if (paymentsProxied.status === 200 && Array.isArray(paymentsProxied.body)) {
    const hasPending = paymentsProxied.body.some((p) => p.status === "PENDING");
    if (hasPending) {
      return res.status(409).json({
        error: "Najemnik ima neporavnana plačila. Pred brisanjem poravnajte vse odprte račune.",
      });
    }
  }

  const proxied = await proxyResidents(`/residents/${residentId}`, { method: "DELETE" });
  return sendProxyResponse(res, proxied);
});

app.get("/properties/:propertyId", async (req, res) => {
  const proxied = await proxyProperty(`/properties/${req.params.propertyId}/tenants`);
  return sendProxyResponse(res, proxied);
});

// ── PAYMENTS ──────────────────────────────────────────────────────────────

app.get("/payments", async (_req, res) => {
  const proxied = await proxyPayment("/payments");
  return sendProxyResponse(res, proxied);
});

app.post("/payments/rent", async (req, res) => {
  const proxied = await proxyPayment("/payments/rent", { method: "POST", body: JSON.stringify(req.body) });
  return sendProxyResponse(res, proxied);
});

app.get("/payments/properties/:propertyId/latest", async (req, res) => {
  const proxied = await proxyPayment(`/payments/properties/${req.params.propertyId}`);
  if (proxied.status !== 200 || !Array.isArray(proxied.body)) {
    return sendProxyResponse(res, proxied);
  }
  const sorted = [...proxied.body].sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
  const latest = sorted[0] ?? null;
  return res.status(latest ? 200 : 404).json(latest ?? { error: "No payments found" });
});

app.get("/payments/properties/:propertyId", async (req, res) => {
  const proxied = await proxyPayment(`/payments/properties/${req.params.propertyId}`);
  return sendProxyResponse(res, proxied);
});

app.get("/payments/residents/:residentId", async (req, res) => {
  const proxied = await proxyPayment(`/payments/residents/${req.params.residentId}`);
  return sendProxyResponse(res, proxied);
});

app.get("/payments/:paymentId", async (req, res) => {
  const proxied = await proxyPayment(`/payments/${req.params.paymentId}`);
  return sendProxyResponse(res, proxied);
});

app.post("/payments/:paymentId/pay", async (req, res) => {
  const proxied = await proxyPayment(
    `/payments/${req.params.paymentId}/pay`,
    { method: "POST", body: JSON.stringify(req.body ?? {}) },
  );
  return sendProxyResponse(res, proxied);
});

app.post("/payments/:paymentId/cancel", async (req, res) => {
  const proxied = await proxyPayment(`/payments/${req.params.paymentId}/cancel`, { method: "POST" });
  return sendProxyResponse(res, proxied);
});

app.post("/payments/:paymentId/retry", async (req, res) => {
  const proxied = await proxyPayment(`/payments/${req.params.paymentId}/retry`, { method: "POST" });
  return sendProxyResponse(res, proxied);
});

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found in web-gateway" });
});

app.listen(PORT, () => {
  console.log(`Web gateway running on port ${PORT}`);
});
