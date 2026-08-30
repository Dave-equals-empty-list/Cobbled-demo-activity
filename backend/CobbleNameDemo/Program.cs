using Microsoft.EntityFrameworkCore;
using CobbleNameDemo.Data;
using CobbleNameDemo.Models;

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
app.MapPost("/api/users", async (UserRequest request, AppDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.Name))
    {
        return Results.BadRequest(new { error = "Name is required." });
    }

    // 1. Store the incoming JSON in the database.
    var record = new UserRecord { Name = request.Name };
    db.Users.Add(record);
    await db.SaveChangesAsync();

    // 2. Read it back from the database to confirm the round trip.
    var saved = await db.Users.FindAsync(record.Id);

    // 3. Return it to the React front end, which will display it in caps.
    return Results.Ok(new { id = saved!.Id, name = saved.Name });
});

app.Run();

// The shape of the JSON body React sends: { "name": "..." }
public record UserRequest(string Name);
