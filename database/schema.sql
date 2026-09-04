-- Creates the database and Users table used by the backend.
-- This mirrors the EF Core model in backend/CobbleNameDemo/Models/UserRecord.cs.
-- Running this manually is optional: the backend also creates it automatically
-- on first run via EnsureCreated(). This file exists so the schema is
-- readable and version-controlled even without opening the C# project.

CREATE DATABASE CobbleNameDemo;
GO

USE CobbleNameDemo;
GO

CREATE TABLE Users (
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Name NVARCHAR(MAX) NOT NULL
);
GO