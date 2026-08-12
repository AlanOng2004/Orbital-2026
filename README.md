# Orbital-2026

## Railway Deployment

This project is currently deployed from the Spring Boot backend in
`backend/`.

### Backend Service Settings

Create a Railway service from this repository and use:

- Root Directory: `backend`
- Build Command: `mvn package -DskipTests`
- Start Command: `java -jar target/nusmaps-backend-0.0.1-SNAPSHOT.jar`

The backend is configured to bind to Railway's injected `PORT` through:

- `server.port=${PORT:8080}`

### Backend Environment Variables

Set these variables on the Railway backend service:

- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `SPRING_JPA_HIBERNATE_DDL_AUTO=update` (the value must be the literal word
  `update`, not a `${...}` placeholder)
- `SPRING_FLYWAY_ENABLED=false`
- `APP_JWT_SECRET=<long-random-secret>`

### Database

Provision a PostgreSQL database in Railway, then copy its connection values
into the backend service variables above.
