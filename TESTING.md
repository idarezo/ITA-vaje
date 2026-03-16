# Property Service - Testing Dokumentacija

## Pregled

Property Service je kompleksna mikrostoritev s celovitim testiranjem na nivoju:

- **Unit Tests** - Testi za posamezne funkcije in module
- **Integration Tests** - Testi za API endpoints
- **Database Tests** - Testi za database layer

## Testnih okvir

Projekt uporablja:

- **Jest** - Testni okvir
- **Supertest** - HTTP assertion library za API testiranje

## Struktura testov

```
property-service/
├── __tests__/
│   ├── api.test.js           # API endpoint testi
│   ├── db.test.js            # Database layer testi
│   └── logger.test.js        # Logger testi
└── jest.config.js            # Jest konfiguracija
```

## Zagon testov

### Lokalno testiranje

```bash
# Namesti odvisnosti
cd property-service
npm install

# Zaženi teste
npm test

# Zaženi teste s pokritostjo
npm test -- --coverage

# Zaženi teste v watch modu
npm run test:watch
```

### Testiranje v GitHub Actions

Testi se avtomatično zaganjajo ob push-u na GitHub:

```yaml
name: Run Tests
on:
  push:
    branches: [main, master, develop]
  pull_request:
    branches: [main, master, develop]
```

## Opis testov

### 1. API Tests (`api.test.js`)

Testira vse API endpoints:

#### POST /properties

```javascript
✓ should create a new property with valid data
✓ should return 400 if required fields are missing
✓ should return 400 if price is missing
```

#### GET /properties

```javascript
✓ should return all properties
```

#### GET /properties/:id

```javascript
✓ should return a single property by ID
```

#### PUT /properties/:id

```javascript
✓ should update a property
✓ should return 404 if property does not exist
```

#### DELETE /properties/:id

```javascript
✓ should delete a property
```

#### GET /health

```javascript
✓ should return health status
```

**Kaj se testira:**

- Pravilnost JSON odziva
- HTTP status kode (200, 201, 400, 404)
- Validacija vhodnih podatkov
- Logging akcij

### 2. Database Tests (`db.test.js`)

Testira databazni layer:

```javascript
✓ should initialize database connection
✓ should retry connection on failure
✓ should return database instance
✓ should throw error if db not initialized
✓ should return connection pool
✓ should throw error if pool not initialized
```

**Kaj se testira:**

- Inicializacija konekcije
- Retry logika pri neuspešni konekciji
- Getter funkcije za db in pool

### 3. Logger Tests (`logger.test.js`)

Testira RabbitMQ logging sistem:

```javascript
✓ should initialize logger without throwing
✓ should retry on connection failure
✓ should send log with correct format
✓ should handle different log levels
✓ should log to console if channel is not available
✓ should call sendLog with correct level for info
✓ should call sendLog with correct level for error
✓ should call sendLog with correct level for warn
✓ should call sendLog with correct level for debug
✓ should close logger without throwing
```

**Kaj se testira:**

- Inicializacija RabbitMQ konekcije
- Pošiljanje logov v različnih nivojih
- Retry logika pri neuspešni konekciji
- Zapiranje konekcije

## Pokritost kode

Cilj je doseči najmanj **80% pokritost kode**.

```bash
# Prikaži pokritost
npm test -- --coverage

# Primer izhoda:
# -------|----------|----------|----------|----------|----------------|
# File   | % Stmts  | % Branch | % Funcs  | % Lines  | Uncovered Line |
# -------|----------|----------|----------|----------|----------------|
# All    |   82.5   |   75.0   |   88.3   |   82.1   |                |
# -------|----------|----------|----------|----------|----------------|
```

## Mocking

Projekti uporabljajo Jest mock-e za:

- **Database**: Mocked `getDb()` funkcija
- **Logger**: Mocked RabbitMQ connection
- **HTTP zahtevke**: Mocked Express app

Primer:

```javascript
jest.mock("../db/index.js", () => ({
  initDb: jest.fn(),
  getDb: jest.fn(),
}));
```

## Primer test koda

### Test za POST /properties

```javascript
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
  });
});
```

## GitHub Actions Workflow

Workflow file: `.github/workflows/test.yml`

```yaml
name: Run Tests
on:
  push:
    branches: [main, master, develop]
  pull_request:
    branches: [main, master, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "20"
      - run: cd property-service && npm install
      - run: cd property-service && npm test -- --coverage
      - uses: codecov/codecov-action@v3
```

### Kako deluje:

1. Ko naredim `git push`, se workflow avtomatično zažene
2. Preveri se latest Node.js verzijo
3. Namestijo se odvisnosti
4. Zaganjajo se vsi testi
5. Pokritost se pošlje na Codecov

## Debugging testov

### Prikaži console output med testi

```javascript
// V testu
console.log("Debug info:", data);
```

Zaženi teste:

```bash
npm test -- --verbose
```

### Zaženi samo en test

```bash
npm test -- api.test.js -t "should create a new property"
```

### Zaženi teste s debugger-jem

```bash
node --inspect-brk ./node_modules/jest/bin/jest.js --runInBand
```

## Best practices

1. **Ločitev testov** - Vsak test je neodvisen
2. **Mockiranje zunanjih dependency-jev** - Database, RabbitMQ
3. **Descriping testi** - Jasni nazivi za hitro identifikacijo
4. **Pokritost** - Najmanj 80% pokritosti
5. **CI/CD integracija** - Avtomatski testi ob push-u

## Problemi in rešitve

### Testi se ne zaganjajo

```bash
# Očisti cache
npm test -- --clearCache

# Ponovno namesti
rm -rf node_modules package-lock.json
npm install
```

### Testi se s timeout-om

Povečaj timeout v jest.config.js:

```javascript
testTimeout: 10000; // 10 sekund
```

### Jest ne najde modulov

Prepričaj se da je path pravilen:

```javascript
import { initDb, getDb } from "../db/index.js";
```

## Naslednji koraki

Planiran je stil test pokritosti za:

- E2E testiranje (Cypress/Playwright)
- Performance testiranje
- Load testiranje z k6
- Security skeniranje

## Reference

- [Jest dokumentacija](https://jestjs.io)
- [Supertest dokumentacija](https://github.com/visionmedia/supertest)
- [GitHub Actions dokumentacija](https://docs.github.com/en/actions)
