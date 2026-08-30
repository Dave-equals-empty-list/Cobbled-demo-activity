using Microsoft.EntityFrameworkCore;
using CobbleNameDemo.Models;

namespace CobbleNameDemo.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<UserRecord> Users => Set<UserRecord>();
}
