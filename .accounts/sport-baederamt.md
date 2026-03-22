# Sport- und Bäderamt Account

**Created:** 2025-03-22

## Organisation
- **firmaID:** `sVNMbwCAG86ciOPihMria`
- **Name:** Sport- und Bäderamt

## User Account
- **userID:** `bRXEBIEYkWEekd6KD8jpg`
- **Name:** Sport- und Bäderamt
- **Email:** `sport@bonn`
- **Password:** `1111`
- **Status:** `7` (Special sport organization user)
- **Language:** `de` (German)
- **Country:** `de` (Germany)

## Special Features
- `status = 7` - Custom status for sport organization with different UI labels
- Linked to organisation "Sport- und Bäderamt"

## Database Verification
```sql
SELECT o."firmaID", o.name as org_name,
       u."userID", u.name as user_name, u.email, u.status
FROM organisations o
JOIN users u ON o."firmaID" = u."firmaID"
WHERE o.name = 'Sport- und Bäderamt';
```

## Next Steps
- Configure custom UI labels for status=7 users
- Different terminology for appointments/scheduling specific to sport facilities
