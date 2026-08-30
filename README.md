# Cobbled-demo-activity

# Backend — Name Round-Trip Demo

A minimal ASP.NET Core Web API that receives a name as JSON, stores it in SQL Server, reads it back, and returns it. Built as a first working example for the Cobble platform task — not tied to any specific Cobble module yet.

## Prerequisites

- .NET SDK 8.0 or later (check with `dotnet --version`; if you only have other versions installed, see Troubleshooting below)
- Docker Desktop (for running SQL Server locally)

## 1. Start a database

This project expects a SQL Server instance. On Apple Silicon Macs, use Azure SQL Edge (same engine, ARM-native):



Check it's running: `docker ps` should list `sql-edge` as `Up`.

If you're on Windows/Intel and already have SQL Server or LocalDB installed, update the connection string in `appsettings.json` to match instead.

## 2. Run the API


**Important:** run this in its own terminal window and leave it running. If you're also running a frontend, that needs a *second*, separate terminal — running one will stop the other if you reuse the same terminal tab.

Watch for `Now listening on: http://localhost:XXXX` and note the port — it's not always the same port every time.

## API reference

**POST** `/api/users`

Request body:
```json
{ "name": "Alex" }
```

Response (200 OK):
```json
{ "id": 1, "name": "Alex" }
```

Test it without a frontend:

(replace 5000 with whatever port your terminal printed)

## Troubleshooting

**"You must install or update .NET to run this application"**
Your machine doesn't have the .NET SDK version this project targets. Open `CobbleNameDemo.csproj` and change `<TargetFramework>net8.0</TargetFramework>` to match a version you have installed (check with `dotnet --list-sdks`).

**"A network-related or instance-specific error occurred while establishing a connection to SQL Server"**
Your database isn't running or the connection string doesn't match it. Confirm `docker ps` shows `sql-edge` as up, and that `appsettings.json`'s `DefaultConnection` string matches the password you used to start the container.

**CORS error in the browser console ("blocked by CORS policy")**
Usually means the backend isn't actually running when the frontend makes the request (commonly: it got stopped by accident, or you're only running one terminal and toggling between folders). Confirm both frontend and backend terminals show as currently running before testing.
