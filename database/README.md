# Database Setup Instructions

## SQL Files Execution Order

Run these SQL files in Supabase SQL Editor in this exact order:

1. **schema.sql** - Creates all main tables
2. **tanzania-locations.sql** - Creates regions and districts tables with data
3. **rls.sql** - Sets up Row Level Security policies
4. **triggers.sql** - Creates database triggers
5. **update-schema.sql** - Adds region/district columns to existing tables (if needed)

## Quick Setup

1. Go to Supabase Dashboard → SQL Editor
2. Run each file in order above
3. Verify tables are created in Table Editor
4. Check that RLS is enabled on all tables

## Tables Created

### Main Tables
- users
- businesses (with district_id)
- deliveries (with pickup/dropoff region/district IDs)
- delivery_events
- charges
- invoices
- invoice_items
- sms_logs
- otp_codes

### Location Tables
- regions (31 Tanzanian regions)
- districts (155+ Tanzanian districts)

## Verification

After setup, verify:
- All 11 tables exist
- RLS is enabled on all tables
- Regions and districts have data
- Indexes are created
