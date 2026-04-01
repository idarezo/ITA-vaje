# User Service

Node.js Express microservice providing registration, login, and logout endpoints backed by MySQL.

## Environment

Duplicate `.env.example` to `.env` and adjust credentials.

```
PORT=3005
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=user_service
JWT_SECRET=change-me
```

## Commands

```bash
npm install
npm run dev
```

## REST API

- `POST /auth/register` – creates a user (`firstName`, `lastName`, `birthYear`, `role: tenant|landlord`, `email`, `password`).
- `POST /auth/login` – returns JWT token for valid credentials.
- `POST /auth/logout` – stateless logout; client should discard the issued token.
- `GET /health` – simple readiness probe.

Passwords are hashed with bcrypt; the JWT payload includes `id`, `role`, `firstName`, and `lastName`.
