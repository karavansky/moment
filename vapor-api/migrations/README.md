# Database Migrations

This directory contains SQL migrations for the Vapor API database.

## How to Apply Migrations

### Via Docker Compose

```bash
# Apply a specific migration
docker compose exec -T postgres psql -U hronop -d moment < vapor-api/migrations/001_add_current_speed_to_vehicles.sql

# Or apply all migrations
for file in vapor-api/migrations/*.sql; do
  echo "Applying migration: $file"
  docker compose exec -T postgres psql -U hronop -d moment < "$file"
done
```

### Direct PostgreSQL Connection

```bash
psql -U hronop -d moment -f 001_add_current_speed_to_vehicles.sql
```

## Migration Files

- `001_add_current_speed_to_vehicles.sql` - Adds `currentSpeed` column to `vehicles` table for dynamic GPS noise filtering based on acceleration
