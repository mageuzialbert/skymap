# Database Setup Guide

## Step 1: Create Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Fill in project details:
   - Name: Skymap Services
   - Database Password: (choose a strong password)
   - Region: (choose closest to your users)
4. Wait for project to be created (2-3 minutes)

## Step 2: Get API Keys

1. In your Supabase project, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

## Step 3: Run Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the entire contents of `database/schema.sql`
4. Click **Run** (or press Ctrl+Enter)
5. Verify all tables are created:
   - Go to **Table Editor** and check that you see:
     - users
     - businesses
     - deliveries
     - delivery_events
     - charges
     - invoices
     - invoice_items
     - sms_logs
     - otp_codes

## Step 4: Set Up Row Level Security (RLS)

1. In **SQL Editor**, create a new query
2. Copy and paste the entire contents of `database/rls.sql`
3. Click **Run**
4. Verify RLS is enabled:
   - Go to **Table Editor**
   - Click on any table
   - Check that "RLS enabled" is shown

## Step 5: Create Initial Admin User (Optional)

You can create an admin user manually or via the registration flow, then update their role:

```sql
-- After registering a user, update their role to ADMIN
UPDATE users 
SET role = 'ADMIN' 
WHERE phone = 'your_admin_phone_number';
```

## Step 6: Set Up Environment Variables

1. Copy `.env.local.example` to `.env.local`
2. Fill in your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

## Step 7: Test Database Connection

1. Start your dev server: `npm run dev`
2. Try to register a business account
3. Check Supabase **Table Editor** to see if the user and business records were created

## Troubleshooting

### Error: "relation does not exist"
- Make sure you ran `schema.sql` first
- Check that all tables were created in Table Editor

### Error: "permission denied"
- Make sure you ran `rls.sql` after `schema.sql`
- Check that RLS policies are enabled on tables

### Error: "duplicate key value"
- User/phone already exists
- Check the users or businesses table

### Authentication Issues
- Verify your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- Check Supabase project is active (not paused)

## Next Steps

After database setup:
1. Test user registration
2. Test login (password and OTP)
3. Create test data for deliveries
4. Set up Edge Functions for invoices
5. Configure Supabase Cron jobs
