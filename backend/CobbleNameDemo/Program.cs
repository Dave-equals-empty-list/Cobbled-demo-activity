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

// Demo-only convenience: creates the database/table on first run if they don't exist.
// For real Cobble work, replace this with proper EF Core migrations.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
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


    var result = await dbCommand.ExecuteScalarAsync();

    var id = Convert.ToInt32(result);

    return Results.Ok(new
    {
        id,
        name = request.Name
    }
    );
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
