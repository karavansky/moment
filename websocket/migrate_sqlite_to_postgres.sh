#!/bin/bash
# Script to migrate data from SQLite to PostgreSQL
# Migrates all existing data from db.sqlite to PostgreSQL monitor database

set -e  # Exit on error

echo "🚀 Starting data migration from SQLite to PostgreSQL..."
echo ""

# Database settings
SQLITE_DB="db.sqlite"
PG_HOST="localhost"
PG_PORT="5432"
PG_USER="updateservice"
PG_PASS="1234"
PG_DB="monitor"

export PGPASSWORD="$PG_PASS"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to migrate table
migrate_table() {
    local table=$1
    local csv_file="${table}_export.csv"

    echo -e "${YELLOW}📦 Migrating table: $table${NC}"

    # Count records in SQLite
    local sqlite_count=$(sqlite3 "$SQLITE_DB" "SELECT COUNT(*) FROM ${table};")
    echo "  SQLite records: $sqlite_count"

    if [ "$sqlite_count" -eq 0 ]; then
        echo -e "  ${YELLOW}⚠️  No data in $table${NC}"
        return
    fi

    # Export from SQLite to CSV
    sqlite3 "$SQLITE_DB" <<EOF
.headers on
.mode csv
.output ${csv_file}
SELECT * FROM ${table};
.quit
EOF

    if [ ! -f "${csv_file}" ]; then
        echo -e "  ${RED}❌ Failed to export $table${NC}"
        return 1
    fi

    local csv_lines=$(wc -l < "$csv_file")
    echo "  CSV lines: $csv_lines (including header)"

    # Check if PostgreSQL table is empty
    local pg_count=$(docker exec alpine psql -U "$PG_USER" -d "$PG_DB" -t -c "SELECT COUNT(*) FROM ${table};" | tr -d ' ')
    echo "  PostgreSQL before: $pg_count records"

    # Import to PostgreSQL using docker exec with stdin
    docker exec -i alpine psql -U "$PG_USER" -d "$PG_DB" > /dev/null 2>&1 <<EOF
\COPY ${table} FROM STDIN WITH CSV HEADER;
$(cat ${csv_file})
\.
EOF

    if [ $? -eq 0 ]; then
        # Verify import
        local pg_count_after=$(docker exec alpine psql -U "$PG_USER" -d "$PG_DB" -t -c "SELECT COUNT(*) FROM ${table};" | tr -d ' ')
        echo "  PostgreSQL after: $pg_count_after records"

        if [ "$pg_count_after" -ge "$sqlite_count" ]; then
            echo -e "  ${GREEN}✅ $table migrated successfully${NC}"
        else
            echo -e "  ${YELLOW}⚠️  Warning: Record count mismatch (SQLite: $sqlite_count, PG: $pg_count_after)${NC}"
        fi
    else
        echo -e "  ${RED}❌ Failed to import $table to PostgreSQL${NC}"
        return 1
    fi

    # Cleanup CSV
    rm -f "${csv_file}"
}

# Start migration
echo "================================"
echo "Starting migration of tables..."
echo "================================"
echo ""

# Migrate tables in order (respecting foreign keys)
migrate_table "users"
echo ""

migrate_table "messages"
echo ""

migrate_table "user_status_history"
echo ""

migrate_table "sessions"
echo ""

echo "================================"
echo -e "${GREEN}✅ Migration complete!${NC}"
echo "================================"
echo ""

# Final verification
echo "📊 Final record counts:"
echo ""
echo "Table                    | SQLite | PostgreSQL"
echo "-------------------------|--------|------------"

for table in users messages user_status_history sessions; do
    sqlite_count=$(sqlite3 "$SQLITE_DB" "SELECT COUNT(*) FROM ${table};" 2>/dev/null || echo "0")
    pg_count=$(docker exec alpine psql -U "$PG_USER" -d "$PG_DB" -t -c "SELECT COUNT(*) FROM ${table};" 2>/dev/null | tr -d ' ' || echo "0")
    printf "%-24s | %6s | %10s\n" "$table" "$sqlite_count" "$pg_count"
done

echo ""
echo "✅ Data migration completed successfully!"
