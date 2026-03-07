#!/bin/bash
# Script to migrate data from SQLite to PostgreSQL
# This copies all existing data from db.sqlite to PostgreSQL monitor database

echo "🚀 Starting data migration from SQLite to PostgreSQL..."

# Database settings
SQLITE_DB="db.sqlite"
PG_HOST="localhost"
PG_PORT="5432"
PG_USER="updateservice"
PG_PASS="1234"
PG_DB="monitor"

export PGPASSWORD="$PG_PASS"

# Function to migrate table
migrate_table() {
    local table=$1
    echo "📦 Migrating table: $table"

    # Export from SQLite to CSV
    sqlite3 "$SQLITE_DB" <<EOF
.headers on
.mode csv
.output ${table}.csv
SELECT * FROM ${table};
.quit
EOF

    if [ ! -f "${table}.csv" ]; then
        echo "  ⚠️  No data in $table or table doesn't exist"
        return
    fi

    # Import to PostgreSQL
    docker exec -i alpine psql -U "$PG_USER" -d "$PG_DB" -c "\COPY ${table} FROM STDIN WITH CSV HEADER;" < "${table}.csv"

    # Cleanup
    rm -f "${table}.csv"
    echo "  ✅ $table migrated"
}

# Migrate all tables
echo ""
echo "Starting migration of tables..."
echo "================================"

migrate_table "users"
migrate_table "messages"
migrate_table "user_status_history"
migrate_table "sessions"

echo ""
echo "================================"
echo "✅ Migration complete!"
echo ""
echo "Verify data:"
echo "  docker exec alpine psql -U updateservice -d monitor -c 'SELECT COUNT(*) FROM messages;'"
echo "  docker exec alpine psql -U updateservice -d monitor -c 'SELECT COUNT(*) FROM users;'"
