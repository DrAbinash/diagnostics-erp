# Diagnostics ERP

A configurable, single-tenant diagnostic center / radiology ERP system.

## Quick Start

1. Clone this repository
2. Copy `.env.example` to `.env` and adjust settings
3. Run `docker compose up -d`
4. Open `http://localhost:3100` in your browser
5. Complete the setup wizard (clinic name, network settings, admin account)

## Default Ports

- **Web UI**: 3100
- **API**: 8200
- **PostgreSQL**: 5433
- **DICOM**: 6433

These ports are chosen to coexist with other systems (e.g., care-erp on 3000/8100/5400).

## Configuration

All clinic-specific settings (name, address, logo, network, radiology config, notifications) are configurable from the Admin → Settings page after initial setup.

Environment variables in `.env` provide bootstrap defaults; the database settings table overrides them at runtime.

## Development

```bash
# Install dependencies
pnpm install

# Start PostgreSQL (or use Docker)
sudo pg_ctlcluster 16 main start

# Apply database schema
pnpm db:push

# Start API server
pnpm --filter @workspace/api-server run dev

# Start web UI (in another terminal)
pnpm --filter @workspace/diagnostic-erp run dev
```

## Architecture

- **pnpm monorepo** with workspaces
- **PostgreSQL 16** database
- **Express.js** API server
- **React + Vite** web frontend
- **Drizzle ORM** for database access
- **Docker Compose** for deployment

## License

MIT
