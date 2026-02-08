# Implementation Notes & Technical Details

## Authentication Implementation

### Business Registration Flow
1. User enters:
   - Business name
   - Phone number (will be used as username/email in Supabase)
   - Password
2. Create user in Supabase Auth with phone as email
3. Create business record linked to user
4. Set user role to 'BUSINESS'

### Login Options
1. **Phone + Password**: Standard Supabase signInWithPassword
2. **Phone + SMS Code (OTP)**:
   - User enters phone number
   - System sends 6-digit OTP via SMS
   - User enters OTP to verify
   - Use Supabase signInWithOtp or custom verification

### SMS OTP Implementation
- Generate 6-digit random code
- Store code in database (otp_codes table) with expiration (5 minutes)
- Send via BongoLive API
- Verify code on login
- Code expires after 5 minutes or single use

## SMS Integration (BongoLive)

### API Details
```typescript
// lib/sms.ts implementation should include:
- Endpoint: https://messaging-service.co.tz/api/sms/v1/text/single
- Method: POST
- Headers:
  - Authorization: Basic bWFnZXV6aWFsYmVydDpIaCZiZXJ0bw==
  - Content-Type: application/json
  - Accept: application/json
- Body:
  {
    "from": "iPAB",
    "text": "message content",
    "to": "phone_number"
  }
```

### SMS Logging
Every SMS must be logged to `sms_logs` table with:
- to_phone
- message
- status (success/failed)
- provider_response
- created_at

## Delivery Status Flow

### Valid Transitions
```
CREATED → ASSIGNED (by Staff)
ASSIGNED → PICKED_UP (by Rider)
PICKED_UP → IN_TRANSIT (by Rider)
IN_TRANSIT → DELIVERED (by Rider)
IN_TRANSIT → FAILED (by Rider)
```

### Status Update Rules
- Only Riders can update status from ASSIGNED onwards
- Only Staff can change status to ASSIGNED
- Every status change must create a delivery_events record
- Status changes should trigger SMS notifications

## Invoice Generation Logic

### Weekly Invoice Process
1. Cron triggers `generate-weekly-invoices` function
2. For each active business:
   - Calculate week_start and week_end (Monday to Sunday)
   - Find all deliveries with status = 'DELIVERED' in that week
   - Sum charges for those deliveries
   - Generate unique invoice_number (format: INV-YYYY-MMDD-XXXX)
   - Create invoice record
   - Create invoice_items for each delivery
   - Set invoice status = 'SENT'

### Invoice Number Format
`INV-{YEAR}-{WEEK}-{SEQUENCE}`
Example: `INV-2024-0101-0001`

## Row Level Security (RLS) Policies

### Users Table
- Users can only read their own record
- Admins can read all users
- Staff can read riders and businesses

### Deliveries Table
- Businesses can only see their own deliveries
- Staff can see all deliveries
- Riders can only see assigned deliveries
- Admins can see all deliveries

### Invoices Table
- Businesses can only see their own invoices
- Staff and Admins can see all invoices

### Businesses Table
- Businesses can only see their own record
- Staff and Admins can see all businesses

## API Route Structure

### Delivery Routes
- `POST /api/deliveries` - Create delivery (Business/Staff)
- `GET /api/deliveries` - List deliveries (role-based)
- `GET /api/deliveries/[id]` - Get delivery details
- `PATCH /api/deliveries/[id]/assign` - Assign rider (Staff only)
- `PATCH /api/deliveries/[id]/status` - Update status (Rider only)

### Invoice Routes
- `GET /api/invoices` - List invoices (role-based)
- `GET /api/invoices/[id]` - Get invoice details
- `POST /api/invoices/generate` - Manual generation (Admin only)

### SMS Routes
- `POST /api/sms/send` - Send SMS (internal use only)
- `POST /api/auth/send-otp` - Send OTP code for login
- `POST /api/auth/verify-otp` - Verify OTP code
- `GET /api/sms/logs` - View SMS logs (Admin/Staff)

### Auth Routes
- `POST /api/auth/register` - Business registration
- `POST /api/auth/login` - Password login
- `POST /api/auth/logout` - Logout

## Component Structure

### Reusable Components Needed
1. **StatusBadge** - Color-coded status display
   - CREATED: gray
   - ASSIGNED: blue
   - PICKED_UP: yellow
   - IN_TRANSIT: orange
   - DELIVERED: green
   - FAILED: red

2. **DeliveryTable** - Table with filtering/sorting
3. **InvoiceTable** - Invoice listing with status
4. **DeliveryForm** - Create/edit delivery
5. **RiderAssignment** - Assign rider modal
6. **StatusUpdate** - Rider status update form

## Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SMS_API_URL=https://messaging-service.co.tz/api/sms/v1/text/single
SMS_API_AUTH=bWFnZXV6aWFsYmVydDpIaCZiZXJ0bw==
SMS_SENDER=iPAB
```

## Database Indexes (Recommended)

```sql
CREATE INDEX idx_deliveries_business_id ON deliveries(business_id);
CREATE INDEX idx_deliveries_assigned_rider_id ON deliveries(assigned_rider_id);
CREATE INDEX idx_deliveries_status ON deliveries(status);
CREATE INDEX idx_deliveries_created_at ON deliveries(created_at);
CREATE INDEX idx_invoices_business_id ON invoices(business_id);
CREATE INDEX idx_invoices_week_start ON invoices(week_start);
CREATE INDEX idx_delivery_events_delivery_id ON delivery_events(delivery_id);
```

## Mobile-First Considerations (Rider UI)

- Use card-based layout instead of tables
- Large touch targets (min 44x44px)
- Swipe actions for status updates
- Bottom navigation for quick access
- Offline capability (future enhancement)

## Error Handling Patterns

- Use try-catch in all API routes
- Return consistent error format: `{ error: string, code?: string }`
- Log errors to Supabase or external service
- Show user-friendly error messages
- Never expose sensitive error details to client

## Performance Considerations

- Use Supabase real-time subscriptions for delivery updates
- Implement pagination for delivery/invoice lists
- Cache user role in session
- Optimize RLS policies for query performance
- Use database indexes on frequently queried columns
