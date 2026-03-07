#!/usr/bin/env python3
"""
Migrate data from SQLite to PostgreSQL
Handles type conversions between SQLite and PostgreSQL
"""

import sqlite3
import psycopg2
from datetime import datetime
import sys

# Database settings
SQLITE_DB = "db.sqlite"
PG_HOST = "localhost"
PG_PORT = 5432
PG_USER = "updateservice"
PG_PASS = "1234"
PG_DB = "monitor"

def unix_to_timestamp(unix_time):
    """Convert Unix timestamp to PostgreSQL timestamp"""
    if unix_time is None or unix_time == '':
        return None
    try:
        return datetime.fromtimestamp(float(unix_time))
    except (ValueError, TypeError):
        return None

def migrate_users(sqlite_conn, pg_conn):
    """Migrate users table"""
    print("📦 Migrating users...")

    sqlite_cur = sqlite_conn.cursor()
    pg_cur = pg_conn.cursor()

    # Fetch all users
    sqlite_cur.execute("SELECT id, username, passwordHash, token, status, is_online, last_activity FROM users")
    users = sqlite_cur.fetchall()

    print(f"  Found {len(users)} users in SQLite")

    migrated = 0
    skipped = 0

    for user in users:
        id, username, password_hash, token, status, is_online, last_activity = user

        # Convert last_activity from Unix timestamp
        last_activity_ts = unix_to_timestamp(last_activity)

        # Convert is_online to boolean
        is_online_bool = bool(is_online)

        # Convert token (NULL if empty string)
        token_val = None if token == '' else token

        try:
            pg_cur.execute("""
                INSERT INTO users (id, username, "passwordHash", token, status, is_online, last_activity)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """, (id, username, password_hash, token_val, status, is_online_bool, last_activity_ts))

            if pg_cur.rowcount > 0:
                migrated += 1
            else:
                skipped += 1
        except Exception as e:
            print(f"  ⚠️  Error migrating user {username}: {e}")
            skipped += 1

    pg_conn.commit()
    print(f"  ✅ Migrated {migrated} users, skipped {skipped}")
    return migrated

def migrate_messages(sqlite_conn, pg_conn):
    """Migrate messages table"""
    print("📦 Migrating messages...")

    sqlite_cur = sqlite_conn.cursor()
    pg_cur = pg_conn.cursor()

    # Fetch all messages
    sqlite_cur.execute("SELECT id, username, content, createdAt FROM messages")
    messages = sqlite_cur.fetchall()

    print(f"  Found {len(messages)} messages in SQLite")

    migrated = 0
    skipped = 0

    for msg in messages:
        id, username, content, timestamp = msg

        # Convert timestamp
        timestamp_ts = unix_to_timestamp(timestamp)

        try:
            pg_cur.execute("""
                INSERT INTO messages (id, username, content, "createdAt")
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """, (id, username, content, timestamp_ts))

            if pg_cur.rowcount > 0:
                migrated += 1
            else:
                skipped += 1
        except Exception as e:
            print(f"  ⚠️  Error migrating message {id}: {e}")
            skipped += 1

    pg_conn.commit()
    print(f"  ✅ Migrated {migrated} messages, skipped {skipped}")
    return migrated

def migrate_user_status_history(sqlite_conn, pg_conn):
    """Migrate user_status_history table"""
    print("📦 Migrating user_status_history...")

    sqlite_cur = sqlite_conn.cursor()
    pg_cur = pg_conn.cursor()

    # Fetch all records
    sqlite_cur.execute("SELECT id, username, is_online, timestamp FROM user_status_history")
    records = sqlite_cur.fetchall()

    print(f"  Found {len(records)} records in SQLite")

    migrated = 0
    skipped = 0

    for record in records:
        id, username, is_online, timestamp = record

        # Convert timestamp
        timestamp_ts = unix_to_timestamp(timestamp)

        # Convert is_online to boolean
        is_online_bool = bool(is_online)

        try:
            pg_cur.execute("""
                INSERT INTO user_status_history (id, username, is_online, timestamp)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """, (id, username, is_online_bool, timestamp_ts))

            if pg_cur.rowcount > 0:
                migrated += 1
            else:
                skipped += 1
        except Exception as e:
            print(f"  ⚠️  Error migrating status history {id}: {e}")
            skipped += 1

    pg_conn.commit()
    print(f"  ✅ Migrated {migrated} records, skipped {skipped}")
    return migrated

def migrate_sessions(sqlite_conn, pg_conn):
    """Migrate sessions table"""
    print("📦 Migrating sessions...")

    sqlite_cur = sqlite_conn.cursor()
    pg_cur = pg_conn.cursor()

    # Fetch all sessions
    sqlite_cur.execute("SELECT id, session_id, username, created_at, expires_at, last_activity FROM sessions")
    sessions = sqlite_cur.fetchall()

    print(f"  Found {len(sessions)} sessions in SQLite")

    migrated = 0
    skipped = 0

    for session in sessions:
        id, session_id, username, created_at, expires_at, last_activity = session

        # Convert timestamps
        created_at_ts = unix_to_timestamp(created_at)
        expires_at_ts = unix_to_timestamp(expires_at)
        last_activity_ts = unix_to_timestamp(last_activity)

        try:
            pg_cur.execute("""
                INSERT INTO sessions (id, session_id, username, created_at, expires_at, last_activity)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """, (id, session_id, username, created_at_ts, expires_at_ts, last_activity_ts))

            if pg_cur.rowcount > 0:
                migrated += 1
            else:
                skipped += 1
        except Exception as e:
            print(f"  ⚠️  Error migrating session {session_id}: {e}")
            skipped += 1

    pg_conn.commit()
    print(f"  ✅ Migrated {migrated} sessions, skipped {skipped}")
    return migrated

def main():
    print("🚀 Starting data migration from SQLite to PostgreSQL...")
    print("")

    try:
        # Connect to SQLite
        sqlite_conn = sqlite3.connect(SQLITE_DB)
        print(f"✅ Connected to SQLite: {SQLITE_DB}")

        # Connect to PostgreSQL
        pg_conn = psycopg2.connect(
            host=PG_HOST,
            port=PG_PORT,
            user=PG_USER,
            password=PG_PASS,
            database=PG_DB
        )
        print(f"✅ Connected to PostgreSQL: {PG_DB}")
        print("")

        # Migrate tables
        total_migrated = 0
        total_migrated += migrate_users(sqlite_conn, pg_conn)
        print("")
        total_migrated += migrate_messages(sqlite_conn, pg_conn)
        print("")
        total_migrated += migrate_user_status_history(sqlite_conn, pg_conn)
        print("")
        total_migrated += migrate_sessions(sqlite_conn, pg_conn)
        print("")

        print("=" * 50)
        print(f"✅ Migration complete! Total records migrated: {total_migrated}")
        print("=" * 50)

        # Close connections
        sqlite_conn.close()
        pg_conn.close()

        return 0

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())
