# NUS Maps

NUS Maps is an indoor navigation web application for the National University of Singapore. It combines a searchable campus map with same-building pathfinding, turn-by-turn indoor directions, account-based route suggestions, and an administrator-facing floorplan annotation workflow.

The application is delivered as a single Spring Boot service: the public interface is plain HTML, CSS, and JavaScript served by the backend, while the React annotator is compiled into the backend's static assets.

## Features

- Search across faculties, buildings, rooms, and node aliases
- Find shortest indoor routes within a building
- View floor-by-floor route paths, walking estimates, and directions
- Create accounts and authenticate with JWT bearer tokens
- Annotate floorplans with typed nodes and directed, accessibility-aware edges
- Export annotation data as JSON or SQL
- Submit route JSON files for administrator review
- Import validated annotation graphs into PostgreSQL as an administrator

## Technology

| Layer | Stack |
| --- | --- |
| Backend | Java 17, Spring Boot 3.3, Spring Web, Spring Security |
| Persistence | Spring Data JPA, PostgreSQL, Flyway |
| Authentication | BCrypt, JSON Web Tokens (`jjwt`) |
| Routing | Dijkstra-style single-source shortest path using FastUtil |
| Main frontend | Static HTML, CSS, and JavaScript |
| Annotator | React 19, Vite 8 |
| Testing and CI | JUnit 5, Mockito, Spring Boot Test, GitHub Actions |

## Repository layout

```text
.
├── backend/
│   ├── pom.xml                         # Maven project
│   └── src/
│       ├── main/java/...               # API, security, persistence, and routing
│       ├── main/resources/static/      # Main UI and compiled annotator
│       └── test/java/...               # Backend tests
├── frontend/annotator/                 # React annotator source
├── shared/data/mapdata.json            # Shared/prototype map-data shape
└── .github/workflows/backend-tests.yml # Backend CI
```

Files under `backend/reference/` are historical prototypes and are not part of the running application.

## Prerequisites

- Java 17 (also declared in `.java-version`)
- Maven 3.9 or newer
- PostgreSQL
- Node.js 22 and npm, only when changing the React annotator

## Local setup

### 1. Configure PostgreSQL

Create an empty database and update `backend/.env` with its connection details. `backend/.env.example` contains the expected datasource shape:

```dotenv
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/nusmaps
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=postgres
SPRING_DATASOURCE_DRIVER_CLASS_NAME=org.postgresql.Driver
SPRING_JPA_HIBERNATE_DDL_AUTO=update
SPRING_FLYWAY_ENABLED=false
APP_JWT_SECRET=replace-with-a-long-random-secret
```

The backend loads `backend/.env` automatically when run from either the repository root or `backend/`. Real deployment secrets should be supplied by the hosting platform, not committed to Git.

Hibernate currently creates and updates the schema. Flyway is included but disabled because there are no active migrations yet. A fresh database starts without campus graph data; floorplans, nodes, and edges must be imported or seeded separately.

### 2. Start the application

```bash
cd backend
mvn spring-boot:run
```

Open [http://localhost:8080](http://localhost:8080). Useful application routes are:

| Route | Purpose |
| --- | --- |
| `/` | Main NUS Maps interface |
| `/login.html` | Sign in |
| `/signup.html` | Create an account |
| `/annotator/index.html` | Floorplan annotator |
| `/suggested-routes.html` | Administrator suggestion review |

The application binds to `PORT` when it is provided and otherwise uses port `8080`.

> [!WARNING]
> `AdminAccountInitializer` currently creates or resets `admin1` with the password `password` every time the backend starts. This is development behavior and must be replaced before exposing the application publicly.

## Annotator development

Install the locked frontend dependencies:

```bash
cd frontend/annotator
npm ci
```

Run the Vite development server for UI-only work:

```bash
npm run dev
```

The annotator calls same-origin `/api` and `/img` paths. The current Vite development config does not proxy those requests, so API-backed flows are tested through the Spring Boot build.

Compile the annotator directly into the backend's static resources:

```bash
npm run build -- --config vite.backend.config.js
```

This replaces `backend/src/main/resources/static/annotator/`. Restart Spring Boot, then open [http://localhost:8080/annotator/index.html](http://localhost:8080/annotator/index.html).

Other frontend checks:

```bash
npm run lint
npm run build
npm run preview
```

The standard `npm run build` writes a standalone bundle to `frontend/annotator/dist/`; use the backend config command above for the bundle served by Spring Boot.

## Testing

Run the backend test suite from `backend/`:

```bash
mvn test
```

Build the deployable JAR:

```bash
mvn package
java -jar target/nusmaps-backend-0.0.1-SNAPSHOT.jar
```

GitHub Actions runs `mvn test` with Temurin Java 17 on every branch push and pull request. The annotator currently has lint and build checks but no automated test suite.

## API overview

Public endpoints:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/signup` | Register a user and return a JWT |
| `POST` | `/api/auth/login` | Authenticate and return a JWT |
| `GET` | `/api/search?query=...` | Search map entities |
| `GET` | `/api/routes/buildings/{building}/nodes` | List routable nodes in a building |
| `GET` | `/api/routes/nodes/search?query=...` | Search routable nodes |
| `POST` | `/api/routes/same-building` | Calculate a same-building route |
| `GET` | `/api/annotator/floorplans` | List annotatable floorplans |

Authenticated endpoints expect this header:

```http
Authorization: Bearer <token>
```

| Access | Method | Endpoint | Purpose |
| --- | --- | --- | --- |
| Signed-in user | `GET` | `/api/auth/me` | Return the current user |
| Signed-in user | `POST` | `/api/annotator/suggestions` | Submit a JSON route suggestion (multipart, up to 5 MB) |
| Administrator | `GET` | `/api/annotator/suggestions` | List submitted suggestions |
| Administrator | `GET` | `/api/annotator/suggestions/{id}/file` | Download a submitted JSON file |
| Administrator | `POST` | `/api/admin/annotator/import` | Import validated nodes and directed edges |

Only same-building routing is currently supported. Edge metadata records bus, sheltered, keycard, stair, ramp, and elevator properties for future route preferences and accessibility filtering.

## Configuration

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `PORT` | No | `8080` | HTTP port |
| `SPRING_DATASOURCE_URL` | Recommended | Railway-style PostgreSQL URL assembled from `PG*` variables | JDBC database URL |
| `SPRING_DATASOURCE_USERNAME` | No | `PGUSER`, then `postgres` | Database user |
| `SPRING_DATASOURCE_PASSWORD` | Yes outside configured Railway environments | `PGPASSWORD`, then empty | Database password |
| `SPRING_DATASOURCE_DRIVER_CLASS_NAME` | No | `org.postgresql.Driver` | JDBC driver |
| `SPRING_JPA_HIBERNATE_DDL_AUTO` | No | `update` | Hibernate schema policy |
| `SPRING_FLYWAY_ENABLED` | No | `false` | Enable database migrations |
| `APP_JWT_SECRET` | Yes in production | Development-only fallback | JWT signing secret |
| `APP_JWT_EXPIRATION_MS` | No | `86400000` | Token lifetime in milliseconds (24 hours) |
| `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` | No | Railway-oriented values | Components used when an explicit datasource URL is absent |

## Railway deployment

Create a Railway service from this repository with the following settings:

| Setting | Value |
| --- | --- |
| Root directory | `backend` |
| Build command | `mvn package -DskipTests` |
| Start command | `java -jar target/nusmaps-backend-0.0.1-SNAPSHOT.jar` |

Provision PostgreSQL in the same Railway project and provide:

```dotenv
SPRING_DATASOURCE_URL=<jdbc-postgresql-url>
SPRING_DATASOURCE_USERNAME=<database-user>
SPRING_DATASOURCE_PASSWORD=<database-password>
SPRING_JPA_HIBERNATE_DDL_AUTO=update
SPRING_FLYWAY_ENABLED=false
APP_JWT_SECRET=<long-random-production-secret>
```

Railway injects `PORT`; Spring Boot reads it automatically. Because Railway only builds the Maven project, commit an updated annotator bundle after changing `frontend/annotator/`, or add the annotator build step to the deployment pipeline.

## Current limitations

- Routing is limited to destinations in the same building.
- Database migrations and production seed data are not yet provided.
- The forgot-password screen is present, but account recovery is not implemented.
- The development admin bootstrap uses fixed credentials.
- Frontend unit and end-to-end tests are not configured.

## Contributing

Contributions are welcome. Start with the [contribution guide](CONTRIBUTING.md), which covers local setup, project conventions, testing, and the pull request process. Please also read our [Code of Conduct](CODE_OF_CONDUCT.md) and report security issues according to the [security policy](SECURITY.md).

Before opening a pull request, run:

```bash
cd backend
mvn test

cd ../frontend/annotator
npm ci
npm run lint
npm run build
```

When the annotator changes, also regenerate the backend-served bundle with `npm run build -- --config vite.backend.config.js` and include the resulting static assets in the same change.

## License

NUS Maps is available under the [MIT License](LICENSE).
