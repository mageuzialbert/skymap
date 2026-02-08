# Logistics Delivery Platform - MVP

A B2B logistics delivery platform where businesses request deliveries and are billed weekly via invoices.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account
- Vercel account (for deployment)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in your Supabase credentials

# Run development server
npm run dev
```

## 📋 Project Structure

```
/app
  /(auth)          # Authentication pages
  /(public)        # Public landing page
  /dashboard       # Role-based dashboards
/lib               # Core utilities
/components        # React components
/database          # SQL schemas and migrations
/supabase          # Edge functions
```

## 👥 User Roles

- **Admin**: Full system access, user/business management, reports
- **Staff**: Create deliveries, assign riders, view all deliveries
- **Rider**: View assigned deliveries, update delivery status
- **Business**: Request deliveries, view own deliveries and invoices

## 🔐 Security

- Supabase Authentication
- Row Level Security (RLS) policies
- Role-based access control
- Server-side validation

## 📱 Features

- Delivery request and management
- Rider assignment and tracking
- Real-time status updates
- SMS notifications
- Weekly invoice generation
- Multi-role dashboards

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Deployment**: Vercel

## 📝 Documentation

See `.cursor/` directory for detailed implementation notes and project plan.

## 🎯 MVP Status

- [x] Project setup
- [ ] Database schema
- [ ] Authentication
- [ ] Delivery flow
- [ ] SMS notifications
- [ ] Invoice system
- [ ] Deployment

## 📄 License

Proprietary - All rights reserved
