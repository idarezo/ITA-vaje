# Property Service API

Property Service je mikrostoritev za upravljanje nepremičnin z REST API vmesnikom, naprednima značajnostima kot sta logging preko RabbitMQ in podrobno testiranje.

## Značajnosti

- ✅ CRUD operacije za nepremičnine (properties)
- ✅ Upravljanje rezidentov (residents)
- ✅ RabbitMQ logging za sledenje akcij
- ✅ MySQL baza podatkov
- ✅ Swagger API dokumentacija
- ✅ Celovito testiranje (Unit Tests)
- ✅ GitHub Actions CI/CD

## Zahteve

- Node.js 18+
- Docker in Docker Compose
- npm ali yarn

## Namestitev

```bash
# Namesti odvisnosti
npm install

# Kopiraj .env datoteko
cp .env.example .env

# Zaženi Docker kontejnerje
docker compose up --build -d
```

## Razvoj

```bash
# Zaženi servis v development modu
npm run dev

# Dostopi do API dokumentacije
http://localhost:3002/api-docs

# Dostopi do RabbitMQ managementa
http://localhost:15672
```

## Testiranje

```bash
# Zaženi vse teste
npm test

# Zaženi teste s pokritostjo
npm test -- --coverage

# Zaženi teste v watch modu
npm run test:watch
```

### Testne datoteke

- `__tests__/api.test.js` - Testi za API endpoints
- `__tests__/db.test.js` - Testi za database layer
- `__tests__/logger.test.js` - Testi za logging sistem

### Test pokritost

Cilj je doseči najmanj 80% pokritost kode:

- API endpoints (POST, GET, PUT, DELETE /properties)
- Database operacije
- Logger funkcionalnost
- Error handling

## GitHub Actions

Testiranje se avtomatično zaganja ob:

- `git push` na `main`, `master` ali `develop` vej
- Odprtih pull requestih

Workflow datoteka: `.github/workflows/test.yml`

## API Endpoints

### Properties

- **POST** `/properties` - Dodaj novo nepremičnino
- **GET** `/properties` - Pridobi vse nepremičnine
- **GET** `/properties/:id` - Pridobi specifično nepremičnino
- **PUT** `/properties/:id` - Posodobi nepremičnino
- **DELETE** `/properties/:id` - Izbriši nepremičnino

### Residents

- **POST** `/properties/:id/residents` - Dodaj rezidenta
- **GET** `/properties/:id/residents` - Pridobi rezidente
- **DELETE** `/properties/:id/residents/:residentId` - Izbriši rezidenta

### Health

- **GET** `/health` - Preveri status servisa

## Struktura projekta

```
property-service/
├── __tests__/                 # Testne datoteke
│   ├── api.test.js           # API endpoint testi
│   ├── db.test.js            # Database layer testi
│   └── logger.test.js        # Logger testi
├── db/                        # Database layer
│   ├── index.js              # Inicializacija in konfiguracija
│   └── schema.js             # Drizzle ORM schema
├── .env                       # Okoljske spremenljivke
├── .gitignore                # Git ignore pravila
├── docker-compose.yml         # Docker Compose konfiguracija
├── Dockerfile                # Docker build datoteka
├── jest.config.js            # Jest konfiguracija
├── logger.js                 # RabbitMQ logger
├── package.json              # npm odvisnosti in skripta
└── property-service.js       # Glavna aplikacija
```

## Okoljske spremenljivke

```env
DB_HOST=mysql
DB_USER=root
DB_PASSWORD=password
DB_NAME=property_db
PORT=3002
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
```

## Direktni dostop do podatkovne baze

```bash
# Prijavite se v MySQL
mysql -h localhost -P 3306 -u root -ppassword property_db

# Prikažite tabele
SHOW TABLES;

# Prikažite podatke
SELECT * FROM properties;
SELECT * FROM residents;
```

## Dostop do RabbitMQ

```
URL: http://localhost:15672
Username: guest
Password: guest
```

## Reševanje težav

### Docker kontejnerji se ne zaganjajo

```bash
# Preveri loge
docker compose logs

# Restartaj kontejnerje
docker compose restart
```

### Testi ne delujejo

```bash
# Očisti node_modules
rm -rf node_modules package-lock.json

# Ponovno namesti
npm install

# Zaženi teste
npm test
```

### Mysql konekcija ne deluje

- Preveri, da je `.env` pravilno konfiguriran
- Preveri, da je MySQL kontejner zagnan: `docker ps`
- Preveri port: `lsof -i :3306`

## Razvojni tipki

- **Logging**: Vsi logi se pošiljajo v RabbitMQ in izpisujejo v konzolo
- **Health Check**: Uporabi `/health` za preverjanje statusa servisa
- **API testi**: Vsi testi se izvršijo pred push-om v GitHub

## Prihodnje izboljšave

- [ ] Integracija s Payment Service
- [ ] Integracija s User Service
- [ ] WebSocket za real-time notifikacije
- [ ] Caching z Redis
- [ ] Advanced Search in Filtering

---

**Avtorja**: ITA semester 2 projekt  
**Verzija**: 1.0.0
