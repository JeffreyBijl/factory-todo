# Factory-todo

Een todo-lijst in de browser: taken toevoegen, afvinken en verwijderen. Gebouwd door de software factory.

## Stack

- **Frontend:** Angular 22 (zoneless, geen SSR) in `src/`
- **Backend:** Node-server in `server/` met `node:http` en `node:sqlite`, zonder framework. Draait de TypeScript direct (Node 22.18 of hoger).
- **Database:** SQLite-bestand, pad via `DB_PATH` (standaard `data/todo.db`; `:memory:` voor tests)
- **Tests:** Vitest (Angular via `ng test`, server via `vitest run`), Playwright voor E2E
- **Linter en formatter:** angular-eslint en Prettier met tabs

## Draaien

```sh
npm ci
npm run dev:api   # API op http://localhost:3000 (met --watch)
npm run dev       # Angular op http://localhost:4200, proxy naar de API
```

Of de gebouwde app in één proces, zoals in de preview:

```sh
npm run build
npm start         # http://localhost:3000, poort via PORT
```

## Testen

```sh
npm test               # Angular-tests + servertests
npm run e2e            # Playwright; zonder BASE_URL bouwt en start hij de app zelf op poort 3100
npm run lint
npm run format:check   # of: npm run format
```

Eenmalig voor E2E: `npx playwright install chromium`.

## Testmap van de factory

De testagent schrijft tests in `tests/factory/`:

- `unit/` – Angular-tests (`*.spec.ts`), opgepikt door `ng test`
- `server/` – API-tests (`*.test.ts`), opgepikt door `vitest run`
- `e2e/` – Playwright-tests (`*.spec.ts`)

## Preview

De `Dockerfile` bouwt de app en start de server op de poort uit `PORT`. Een deploy naar productie hoort niet bij dit skelet.

## Devcontainer

De factory werkt in een devcontainer met firewall en vaste tooling. Start hem vanaf de host met:

```sh
.devcontainer/start-devcontainer.sh
```
