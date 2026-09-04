using Microsoft.EntityFrameworkCore;
using CobbleNameDemo.Data;
using CobbleNameDemo.Models;
using Microsoft.Data.SqlClient;
using System.Text.RegularExpressions;


var builder = WebApplication.CreateBuilder(args);

// Wire up EF Core to talk to SQL Server using the connection string in appsettings.json.
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Allow the React dev server (Vite's default port) to call this API from the browser.
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseCors();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    // Creates the database and the Users table if they don't exist.
    db.Database.EnsureCreated();

    // Stored procedures are not part of the EF Core model, so EnsureCreated()
    // never creates them. Apply database/stored-procedures.sql here so a fresh
    // clone works with no manual sqlcmd step. The script uses CREATE OR ALTER,
    // so running it on every start is safe and picks up any edits.
    var scriptPath = Path.Combine(AppContext.BaseDirectory, "Database", "stored-procedures.sql");
    var script = await File.ReadAllTextAsync(scriptPath);

    // GO is a batch separator understood by sqlcmd, not a T-SQL statement,
    // so the script has to be split on it before it can be executed here.
    var batches = Regex.Split(script, @"^\s*GO\s*$",
        RegexOptions.Multiline | RegexOptions.IgnoreCase);

    foreach (var batch in batches)
    {
        if (!string.IsNullOrWhiteSpace(batch))
            await db.Database.ExecuteSqlRawAsync(batch);
    }
}

// The single endpoint the React front end calls.
// Receives a name from the react frontend and stores it in SQL server. 
// Database writes are performed through the AddUser stored procedure
// rather than directly modifying the Users table through EF Core.
app.MapPost("/api/users", async (UserRequest request, AppDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.Name))
    {
        return Results.BadRequest(new { error = "Name is required." });
    }

    var connection = db.Database.GetDbConnection();

    await connection.OpenAsync();

    await using var dbCommand = connection.CreateCommand();

    dbCommand.CommandText = "AddUser";
    dbCommand.CommandType = System.Data.CommandType.StoredProcedure;

    dbCommand.Parameters.Add(new SqlParameter("@Name", request.Name));


        // AddUser returns the row it just inserted, so both values in the response come from SQL Server rather than the name being echoed from the request.
    await using var reader = await dbCommand.ExecuteReaderAsync();

    if (!await reader.ReadAsync())
    {
        return Results.Problem("AddUser did not return the inserted row.");
    }

    return Results.Ok(new
    {
        id = reader.GetInt32(0),
        name = reader.GetString(1)
    });
});

app.MapGet("/api/users", async (AppDbContext db) =>
{
    var users = new List<UserRecord>();
    var connection = db.Database.GetDbConnection();
    await connection.OpenAsync();

    await using var dbCommand = connection.CreateCommand();

    dbCommand.CommandText = "GetUsers";
    dbCommand.CommandType = System.Data.CommandType.StoredProcedure;

    await using var reader = await dbCommand.ExecuteReaderAsync();

    while (await reader.ReadAsync())
    {
        users.Add(new UserRecord
        {
            Id = reader.GetInt32(0),
            Name = reader.GetString(1)
        });
    }
    return Results.Ok(users);
});

app.Run();

// The shape of the JSON body React sends: { "name": "..." }
public record UserRequest(string Name);
