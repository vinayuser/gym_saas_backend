# Gym SaaS Backend

Multi-tenant gym management API (Express + Prisma + PostgreSQL).

## Production (Oracle VM)

Deploys on push to `main` via GitHub Actions.

| Secret | Example |
|--------|---------|
| `ORACLE_HOST` | VM public IP |
| `ORACLE_USER` | `ubuntu` |
| `ORACLE_SSH_KEY` | SSH private key |
| `ORACLE_APP_HOME` | `/opt/gym-saas-backend` |
| `BACKEND_ENV` | Full `.env` file contents |

Demo URL (via host nginx on port **8090**): `http://<ORACLE_HOST>:8090/api/v1/health`

Stack on server: PostgreSQL + Redis + API containers in `/opt/gym-saas-backend`.
