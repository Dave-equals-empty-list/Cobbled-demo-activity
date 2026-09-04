# Frontend — Round trip

React + Vite UI for the `CobbleNameDemo` backend in this repo. It posts a name to
`POST /api/users`, shows each hop of the trip as it happens, and renders the name the
database gave back in capitals.

## Prerequisites

- Node.js 22 LTS or newer — `node --version`
- The backend and its database already running (see below)

## Run it

Three terminals, all left open.

**Terminal 1 — database**

```bash
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStrong!Passw0rd" \
  -p 1433:1433 --name sql-demo -d mcr.microsoft.com/mssql/server:2025-latest
```

On Apple Silicon, either enable Rosetta in Docker Desktop → Settings → General, or use
the Azure SQL Edge command from the root README instead. Note that Azure SQL Edge is no
longer receiving updates from Microsoft, so on Intel or Windows prefer the image above.

Already have `sql-edge` running from an earlier session? Just `docker start sql-edge`.

**Terminal 2 — backend, on a pinned port**

```bash
cd backend/CobbleNameDemo
dotnet run --urls http://localhost:5000
```

The `--urls` flag matters. Without it the port changes between runs and the frontend
proxy stops matching. Wait for `Now listening on: http://localhost:5000`.

Sanity check before touching the frontend:

```bash
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" -d '{"name":"Alex"}'
```

You want `{"id":1,"name":"Alex"}` back. If this fails, the frontend cannot help you —
fix the backend first.

**Terminal 3 — frontend**

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>.

## How it talks to the backend

`vite.config.js` proxies `/api/*` to `http://localhost:5000`. The browser only ever
calls its own origin, so the CORS policy in `Program.cs` never comes into play. That
removes the most common failure mode in the root README's troubleshooting section.

If you'd rather call the backend directly, change `ENDPOINT` in `src/App.jsx` to the
full `http://localhost:5000/api/users` and delete the proxy block. The existing CORS
policy already allows `http://localhost:5173`.

## Where things live

| File | What it does |
|---|---|
| `src/App.jsx` | All the logic. `ENDPOINT` and `STAGES` at the top are the only things tied to the backend. |
| `src/styles.css` | All the styling. Colours and spacing are CSS variables in `:root`. |
| `vite.config.js` | Dev server port and the `/api` proxy target. |

## Two things the UI deliberately does not claim

**No tenant label.** The `Users` table has no `TenantId` column, so putting a tenant
badge on screen would imply something the backend doesn't do. When `TenantId` is added,
the badge goes back in.

**The session table is not a database read.** The backend has no `GET /api/users`, so
the list at the bottom is what this browser has sent, held in React state. The footnote
under it says so. Adding a read-all endpoint would let it show real database contents.

## Known gap to raise with the team

The brief says database operations must go through stored procedures and that the app
must not update the database directly. `Program.cs` uses EF Core — `db.Users.Add(record)`
followed by `SaveChangesAsync()` — which is the application updating the database
directly. The demo works, but it demonstrates the opposite of the stated requirement.
Worth settling before the partner sees it.
