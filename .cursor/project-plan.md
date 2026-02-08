# Logistics Delivery Platform - Build Plan

## Execution Order

### Phase 1: Foundation Setup
1. ✅ Initialize Next.js 14 project with TypeScript
2. ✅ Install dependencies (Tailwind, shadcn/ui, Supabase)
3. ✅ Configure Supabase connection
4. ✅ Set up project folder structure

### Phase 2: Database & Security
1. Create database schema (schema.sql)
   - users table
   - businesses table
   - deliveries table
   - delivery_events table
   - charges table
   - invoices table
   - invoice_items table
   - sms_logs table
2. Implement Row Level Security (RLS) policies (rls.sql)
   - User role-based access
   - Business data isolation
   - Delivery access rules
3. Set up Supabase Auth configuration

### Phase 3: Core Libraries
1. Create `/lib/supabase.ts` - Supabase client setup
2. Create `/lib/auth.ts` - Authentication helpers
3. Create `/lib/roles.ts` - Role checking utilities
4. Create `/lib/sms.ts` - SMS service (BongoLive integration)
5. Create `/lib/invoice.ts` - Invoice generation logic

### Phase 4: Authentication Pages
1. `/app/(auth)/login` - Login page
2. `/app/(auth)/register` - Registration page
3. Implement role-based redirects after login

### Phase 5: Public Landing Page
1. `/app/(public)/page.tsx` - Landing page with:
   - Hero section
   - Features slider
   - Delivery request CTA
   - Marketing content

### Phase 6: Business Dashboard
1. `/app/dashboard/business/page.tsx` - Business dashboard home
2. `/app/dashboard/business/deliveries/page.tsx` - View/create deliveries
3. `/app/dashboard/business/invoices/page.tsx` - View invoices
4. Components:
   - Delivery request form
   - Deliveries table
   - Invoices table

### Phase 7: Staff Dashboard
1. `/app/dashboard/staff/deliveries/page.tsx` - View all deliveries
2. `/app/dashboard/staff/assign/page.tsx` - Assign riders to deliveries
3. Components:
   - Deliveries management table
   - Rider assignment modal/form

### Phase 8: Rider Dashboard (Mobile-First)
1. `/app/dashboard/rider/jobs/page.tsx` - View assigned deliveries
2. Components:
   - Mobile-optimized delivery cards
   - Status update interface
   - Delivery details view

### Phase 9: Admin Dashboard
1. `/app/dashboard/admin/businesses/page.tsx` - Manage businesses
2. `/app/dashboard/admin/users/page.tsx` - Manage users
3. `/app/dashboard/admin/reports/page.tsx` - View reports
4. Components:
   - Business management table
   - User management table
   - Reports/charts (optional)

### Phase 10: Delivery Flow Implementation
1. Create delivery API routes
2. Implement status update flow
3. Create delivery_events logging
4. Add status validation rules

### Phase 11: SMS Notifications
1. Integrate BongoLive SMS API in `/lib/sms.ts`
2. Trigger SMS on:
   - Rider assignment
   - Pickup confirmation
   - Delivery completion
   - Delivery failure
3. Log all SMS in sms_logs table

### Phase 12: Invoice System
1. Create Supabase Edge Function: `generate-weekly-invoices`
2. Set up Supabase Cron job (weekly)
3. Implement invoice generation logic:
   - Fetch DELIVERED deliveries for week
   - Calculate totals
   - Create invoice + items
   - Set status = SENT
4. Invoice viewing pages (read-only for businesses)

### Phase 13: UI Components
1. Install and configure shadcn/ui
2. Create reusable components:
   - Status badges
   - Delivery tables
   - Invoice tables
   - Forms
   - Layout components

### Phase 14: Security & Validation
1. Implement server-side role checks
2. Add RLS policy testing
3. Validate all mutations server-side
4. Test access control for each role

### Phase 15: Polish & Testing
1. Mobile responsiveness (especially rider UI)
2. Error handling
3. Loading states
4. Form validation
5. User feedback (toasts, messages)

### Phase 16: Deployment
1. Deploy to Vercel
2. Configure Supabase production
3. Set up environment variables
4. Test production deployment
5. Verify all MVP criteria

## Key Implementation Notes

### SMS Service (BongoLive)
- Endpoint: `https://messaging-service.co.tz/api/sms/v1/text/single`
- Auth: Basic `bWFnZXV6aWFsYmVydDpIaCZiZXJ0bw==`
- From: `iPAB`
- Always log to sms_logs table

### Status Flow Enforcement
- Use server-side validation
- Create delivery_events on every status change
- Enforce role-based status update permissions

### Invoice Generation
- Weekly cron job
- Only include DELIVERED status deliveries
- Calculate from charges table
- Generate unique invoice numbers

## Testing Checklist
- [ ] Business can create delivery request
- [ ] Staff can view all deliveries
- [ ] Staff can assign rider
- [ ] Rider receives SMS on assignment
- [ ] Rider can update delivery status
- [ ] SMS sent on pickup, delivery, failure
- [ ] Weekly invoice generation works
- [ ] Business can view invoices
- [ ] Admin can manage users/businesses
- [ ] RLS policies enforce access correctly
- [ ] Mobile UI works for riders
