# Cobbled-demo-activity — Name Round-Trip Demo

A working proof-of-concept for the Cobble platform task: a React frontend sends a name to a C# Web API, which stores it in SQL Server, reads it back, and returns it — the frontend then displays it in capitals. Not tied to any specific Cobble module yet; this is the plumbing, proven end to end.

## Project layout

| Path | What it is |
|---|---|
| `backend/CobbleNameDemo/` | ASP.NET Core Web API |
| `frontend/` | React + Vite UI (see `frontend/README.md` for frontend-specific detail) |
| `database/schema.sql` | Reference SQL for the `Users` table |
| `docker-compose.yml` | One-command way to start a full SQL Server instance |

## Prerequisites

- .NET SDK 8.0 or later — check with `dotnet --version` (see Troubleshooting if you have a different version installed)
- Node.js 22 LTS or newer — check with `node --version`
- Docker Desktop

## 1. Start the database

```bash
docker compose up -d
```

This starts a full Microsoft SQL Server 2022 container on port 1433, matching the connection string already set in `backend/CobbleNameDemo/appsettings.json`.

On Apple Silicon Macs this runs under emulation and can take 30-60 seconds to finish starting. Check `docker ps` shows `cobble-sql-server` as `Up`, or `docker logs cobble-sql-server` and look for `SQL Server is now ready for client connections` if you're not sure it's ready yet.

(Azure SQL Edge — a lighter, ARM-native alternative — also works and is faster to start, though Microsoft no longer updates it. See `frontend/README.md` for that command if you'd rather use it.)

## 2. Run the backend, on a pinned port

```bash
cd backend/CobbleNameDemo
dotnet restore
dotnet run --urls http://localhost:5000
```

**Pinning the port with `--urls` matters** — the frontend's dev server proxies requests to exactly `localhost:5000`, and without this flag the port can change between runs. Leave this running in its own terminal.

Sanity-check it before touching the frontend:

```bash
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" -d '{"name":"Alex"}'
```

Expect `{"id":1,"name":"Alex"}` back. If this fails, fix it here before involving the frontend at all.

## 3. Run the frontend

Full detail is in `frontend/README.md`. Quick version:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The frontend talks to the backend through a Vite dev-server proxy (browser → `localhost:5173/api/...` → forwarded to `localhost:5000`), so CORS never comes into play here.

## API reference

**POST** `/api/users`

Request: `{ "name": "Alex" }`
Response (200 OK): `{ "id": 1, "name": "Alex" }`

## Known issues to raise with the team

- **Stored procedures.** The project brief calls for database writes to go through stored procedures rather than direct application updates. `Program.cs` currently uses EF Core directly (`db.Users.Add()` then `SaveChangesAsync()`), which doesn't follow that yet. Worth deciding as a team how to handle this before this goes in front of Wayne.
- **No read-all endpoint yet.** There's no `GET /api/users`, so nothing currently reads the database's actual contents back — the frontend's "sent this session" list is only what that browser has sent in-memory, not a real database read.

## Troubleshooting

**"You must install or update .NET to run this application"**
Your machine doesn't have the .NET SDK version this project targets. Open `CobbleNameDemo.csproj` and change `<TargetFramework>net8.0</TargetFramework>` to match a version you have installed (check with `dotnet --list-sdks`).

**"A network-related or instance-specific error occurred while establishing a connection to SQL Server"**
The database isn't running, or the connection string doesn't match it. Confirm `docker ps` shows the SQL Server container as `Up` (`cobble-sql-server` for `docker compose up -d`, or `sql-edge` if using Azure SQL Edge), and that `appsettings.json`'s `DefaultConnection` string matches the password used to start it.

**CORS error in the browser console ("blocked by CORS policy")**
If you're running the frontend the normal way (`npm run dev`, using its built-in proxy), this shouldn't come up at all. It only applies if something is calling the backend directly rather than through the proxy — in that case, confirm the backend is actually running and that you're calling `http://localhost:5000` (matching the CORS policy in `Program.cs`, which allows `http://localhost:5173`).
