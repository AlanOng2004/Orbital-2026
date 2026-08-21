# Contributing to NUS Maps

Thank you for helping improve NUS Maps. Bug reports, documentation fixes, tests, designs, and code contributions are all welcome.

## Before you start

- Search existing issues and pull requests before opening a duplicate.
- Use an issue to discuss significant behavior, architecture, data-model, or UI changes before investing in an implementation.
- Keep each contribution focused on one problem.
- Never commit credentials, personal data, or private campus data. Use `backend/.env.example` as the configuration template.
- Follow our [Code of Conduct](CODE_OF_CONDUCT.md).

Security vulnerabilities should not be reported in a public issue. Follow [SECURITY.md](SECURITY.md) instead.

## Development setup

Fork the repository, clone your fork, and create a branch from the current default branch:

```bash
git clone https://github.com/<your-username>/NUSMaps.git
cd NUSMaps
git checkout -b fix/short-description
```

The backend requires Java 17, Maven 3.9 or newer, and PostgreSQL. Copy the environment template and edit the local copy:

```bash
cp backend/.env.example backend/.env
cd backend
mvn spring-boot:run
```

The React annotator additionally requires Node.js 22 and npm:

```bash
cd frontend/annotator
npm ci
npm run dev
```

See the main [README](README.md) for database configuration, application routes, and the complete development workflow.

## Making changes

- Match the style and structure of the surrounding code.
- Add or update tests when changing behavior.
- Update documentation when changing configuration, APIs, commands, or user-visible behavior.
- Avoid unrelated formatting or refactoring in the same pull request.
- Use clear commit messages that explain the intent of the change.

When changing the annotator, regenerate the bundle served by Spring Boot:

```bash
cd frontend/annotator
npm run build -- --config vite.backend.config.js
```

Commit the updated files under `backend/src/main/resources/static/annotator/` with the source change.

## Running checks

Run the backend tests:

```bash
cd backend
mvn test
```

Run the annotator checks when frontend code changes:

```bash
cd frontend/annotator
npm ci
npm run lint
npm run build
```

If you cannot run a check, explain why in the pull request.

## Opening a pull request

- Complete the pull request template.
- Link the relevant issue, if one exists.
- Describe the problem and the approach taken, not only the files changed.
- Include screenshots or a short recording for visible UI changes.
- Call out database, configuration, API, or compatibility effects.
- Make sure CI passes and respond to review feedback.

By submitting a contribution, you agree that it may be distributed under this repository's [MIT License](LICENSE).
