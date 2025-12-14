# Database Reset Script

This script resets your MongoDB database and keeps only the super admin user.

## Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. The `.env.local` file has been created with your MongoDB connection string.
   
   **Note:** If your password contains special characters (like `@`), they must be URL-encoded:
   - `@` becomes `%40`
   - Other special characters may also need encoding

## Usage

Run the reset script:

```bash
npm run reset-db
```

## What the script does:

1. ✅ Connects to MongoDB
2. ✅ Drops all existing collections
3. ✅ Creates a super admin user with:
   - Email: `theplaceadmin@theplace.com.kh`
   - Password: `admin123`
   - Role: `SUPERADMIN`
4. ✅ Creates indexes for better performance:
   - Users collection (email unique index)
   - Staff collection (email, staffID unique indexes)
   - Members collection (customerNumber unique index)
   - Appointments collection (clientId, staffId, date indexes)

## After Reset

You can now:
- Login with super admin credentials
- Start adding staff, members, appointments from scratch
- Test all features from A to Z

## Seed Database with Test Data

If you want to populate the database with test data for development:

```bash
npm run seed-db
```

This will add:
- 13 staff members
- 15 members
- 55 appointments

**Note:** The script will skip collections that already have data to avoid duplicates.

## Security Note

⚠️ **Important:** In production, passwords should be hashed using bcrypt or similar. The current implementation stores passwords in plain text for development/testing purposes only.

