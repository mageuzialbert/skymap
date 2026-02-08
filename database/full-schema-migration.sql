-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tanzanian Regions and Districts (from tanzania-locations.sql)
-- Regions table
CREATE TABLE IF NOT EXISTS regions (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  status BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Districts table
CREATE TABLE IF NOT EXISTS districts (
  id BIGSERIAL PRIMARY KEY,
  region_id BIGINT NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  status BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Locations
CREATE INDEX IF NOT EXISTS idx_districts_region_id ON districts(region_id);
CREATE INDEX IF NOT EXISTS idx_regions_status ON regions(status);
CREATE INDEX IF NOT EXISTS idx_districts_status ON districts(status);

-- CORE SCHEMA (from schema.sql)
-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'STAFF', 'RIDER', 'BUSINESS')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Businesses table
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  district_id BIGINT REFERENCES districts(id) ON DELETE SET NULL,
  logo_url TEXT,
  billing_cycle TEXT DEFAULT 'WEEKLY' CHECK (billing_cycle = 'WEEKLY'),
  delivery_fee DECIMAL(10, 2) DEFAULT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Deliveries table
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  pickup_address TEXT NOT NULL,
  pickup_name TEXT NOT NULL,
  pickup_phone TEXT NOT NULL,
  pickup_region_id BIGINT REFERENCES regions(id) ON DELETE SET NULL,
  pickup_district_id BIGINT REFERENCES districts(id) ON DELETE SET NULL,
  dropoff_address TEXT NOT NULL,
  dropoff_name TEXT NOT NULL,
  dropoff_phone TEXT NOT NULL,
  dropoff_region_id BIGINT REFERENCES regions(id) ON DELETE SET NULL,
  dropoff_district_id BIGINT REFERENCES districts(id) ON DELETE SET NULL,
  package_description TEXT,
  status TEXT NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'PENDING_CONFIRMATION', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'REJECTED')),
  assigned_rider_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE
);

-- Delivery events table
CREATE TABLE IF NOT EXISTS delivery_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID REFERENCES deliveries(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Charges table
CREATE TABLE IF NOT EXISTS charges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id UUID REFERENCES deliveries(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'PAID')),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoice items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  delivery_id UUID REFERENCES deliveries(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT
);

-- SMS logs table
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  to_phone TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  provider_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OTP codes table
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_businesses_phone ON businesses(phone);
CREATE INDEX IF NOT EXISTS idx_businesses_district_id ON businesses(district_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_business_id ON deliveries(business_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_assigned_rider_id ON deliveries(assigned_rider_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_created_at ON deliveries(created_at);
CREATE INDEX IF NOT EXISTS idx_deliveries_pickup_region_id ON deliveries(pickup_region_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_pickup_district_id ON deliveries(pickup_district_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_dropoff_region_id ON deliveries(dropoff_region_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_dropoff_district_id ON deliveries(dropoff_district_id);
CREATE INDEX IF NOT EXISTS idx_delivery_events_delivery_id ON delivery_events(delivery_id);
CREATE INDEX IF NOT EXISTS idx_invoices_business_id ON invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_week_start ON invoices(week_start);
CREATE INDEX IF NOT EXISTS idx_otp_codes_phone ON otp_codes(phone);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON otp_codes(expires_at);

-- UPDATES (from update-schema.sql)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS district_id BIGINT REFERENCES districts(id) ON DELETE SET NULL;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS pickup_region_id BIGINT REFERENCES regions(id) ON DELETE SET NULL;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS pickup_district_id BIGINT REFERENCES districts(id) ON DELETE SET NULL;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS dropoff_region_id BIGINT REFERENCES regions(id) ON DELETE SET NULL;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS dropoff_district_id BIGINT REFERENCES districts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_businesses_district_id ON businesses(district_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_pickup_region_id ON deliveries(pickup_region_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_pickup_district_id ON deliveries(pickup_district_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_dropoff_region_id ON deliveries(dropoff_region_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_dropoff_district_id ON deliveries(dropoff_district_id);


-- ADD LOCATION DATA (from tanzania-locations.sql)
INSERT INTO regions (id, name, status, created_at, updated_at) VALUES
(1, 'Arusha', true, '2020-07-30 02:30:07', NULL),
(2, 'Dar es salaam', true, '2020-07-30 02:30:07', NULL),
(3, 'Dodoma', true, '2020-07-30 02:30:07', NULL),
(4, 'Tanga', true, '2020-07-30 02:30:07', NULL),
(7, 'Morogoro', true, '2020-07-30 02:30:07', NULL),
(8, 'Pwani', true, '2020-07-30 02:30:07', NULL),
(9, 'Kilimanjaro', true, '2020-07-30 02:30:07', NULL),
(10, 'Mtwara', true, '2020-07-30 02:30:07', NULL),
(11, 'Lindi', true, '2020-07-30 02:30:07', NULL),
(12, 'Ruvuma', true, '2020-07-30 02:30:07', NULL),
(13, 'Songwe', true, '2020-07-30 02:30:07', NULL),
(14, 'Mbeya', true, '2020-07-30 02:30:07', NULL),
(15, 'Njombe', true, '2020-07-30 02:30:07', NULL),
(16, 'Rukwa', true, '2020-07-30 02:30:07', NULL),
(17, 'Katavi', true, '2020-07-30 02:30:07', NULL),
(19, 'Kigoma', true, '2020-07-30 02:30:07', NULL),
(20, 'Geita', true, '2020-07-30 02:30:07', NULL),
(21, 'Kagera', true, '2020-07-30 02:30:07', NULL),
(22, 'Mwanza', true, '2020-07-30 02:30:07', NULL),
(23, 'Shinyanga', true, '2020-07-30 02:30:07', NULL),
(24, 'Simiyu', true, '2020-07-30 02:30:07', NULL),
(25, 'Mara', true, '2020-07-30 02:30:07', NULL),
(26, 'Manyara', true, '2020-07-30 02:30:07', NULL),
(27, 'Singida', true, '2020-07-30 02:30:07', NULL),
(28, 'Iringa', true, '2020-07-30 02:30:07', NULL),
(29, 'Tabora', true, '2020-07-30 02:30:07', NULL),
(30, 'Songea', true, '2020-07-30 02:30:07', NULL),
(33, 'Pemba Kaskazini', true, '2021-01-18 12:02:31', NULL),
(34, 'Pemba Kusini', true, '2021-01-18 12:02:48', NULL),
(35, 'Unguja Kaskazini', true, '2021-01-18 12:08:43', NULL),
(36, 'Unguja Kusini', true, '2021-01-18 12:09:24', NULL),
(37, 'Unguja Magharibi', true, '2021-01-18 12:09:43', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO districts (id, region_id, name, status, created_at, updated_at) VALUES
(1, 2, 'Kinondoni', true, '2020-06-06 00:47:59', NULL),
(3, 1, 'Ngorongoro', true, '2020-06-06 01:02:07', NULL),
(5, 1, 'Arusha', true, '2020-06-20 13:15:36', NULL),
(6, 1, 'Arumeru', true, '2020-06-24 05:28:15', NULL),
(7, 1, 'Longido', true, '2020-06-24 05:28:45', NULL),
(8, 1, 'Monduli', true, '2020-06-24 05:28:52', NULL),
(9, 1, 'Karatu', true, '2020-06-24 05:28:59', NULL),
(10, 2, 'Ilala', true, '2020-06-24 05:29:57', NULL),
(11, 2, 'Temeke', true, '2020-06-24 05:30:03', NULL),
(12, 2, 'Ubungo', true, '2020-06-24 05:30:10', NULL),
(13, 2, 'Kigamboni', true, '2020-06-24 05:30:22', NULL),
(14, 3, 'Dodoma', true, '2020-06-24 05:32:12', NULL),
(15, 3, 'Chamwino', true, '2020-06-24 05:32:19', NULL),
(16, 3, 'Chemba', true, '2020-06-24 05:32:31', NULL),
(17, 3, 'Kondoa', true, '2020-06-24 05:32:37', NULL),
(18, 3, 'Bahi', true, '2020-06-24 05:32:48', NULL),
(19, 3, 'Mpwapwa', true, '2020-06-24 05:32:58', NULL),
(20, 3, 'Kongwa', true, '2020-06-24 05:33:08', NULL),
(21, 20, 'Bukombe', true, '2020-06-24 05:34:57', NULL),
(22, 20, 'Mbogwe', true, '2020-06-24 05:35:13', NULL),
(23, 20, 'Geita', true, '2020-06-24 05:35:20', NULL),
(24, 20, 'Chato', true, '2020-06-24 05:35:27', NULL),
(25, 20, 'Nyang''wale', true, '2020-06-24 05:35:42', NULL),
(26, 28, 'Iringa', true, '2020-06-24 05:36:05', NULL),
(27, 28, 'Mufindi', true, '2020-06-24 05:36:13', NULL),
(28, 28, 'Kilolo', true, '2020-06-24 05:36:27', NULL),
(29, 21, 'Biharamulo', true, '2020-06-24 05:37:30', NULL),
(30, 21, 'Karagwe', true, '2020-06-24 05:37:48', NULL),
(31, 21, 'Muleba', true, '2020-06-24 05:37:56', NULL),
(32, 21, 'Bukoba', true, '2020-06-24 05:38:18', NULL),
(33, 21, 'Ngara', true, '2020-06-24 05:38:26', NULL),
(34, 21, 'Missenyi', true, '2020-06-24 05:38:37', NULL),
(35, 21, 'Kyerwa', true, '2020-06-24 05:38:56', NULL),
(36, 17, 'Mlele', true, '2020-06-24 05:39:26', NULL),
(37, 17, 'Mpanda', true, '2020-06-24 05:39:33', NULL),
(38, 17, 'Tanganyika', true, '2020-06-24 05:39:40', NULL),
(39, 19, 'Kigoma', true, '2020-06-24 05:40:03', NULL),
(40, 19, 'Kasulu', true, '2020-06-24 05:40:11', NULL),
(41, 19, 'Kankoko', true, '2020-06-24 05:40:24', NULL),
(42, 19, 'Uvinza', true, '2020-06-24 05:40:30', NULL),
(43, 19, 'Buhigwe', true, '2020-06-24 05:40:45', NULL),
(44, 19, 'Kibondo', true, '2020-06-24 05:40:53', NULL),
(45, 9, 'Siha', true, '2020-06-24 05:41:29', NULL),
(46, 9, 'Moshi', true, '2020-06-24 05:41:35', NULL),
(47, 9, 'Mwanga', true, '2020-06-24 05:41:46', NULL),
(48, 8, 'Rombo', true, '2020-06-24 05:41:52', NULL),
(49, 9, 'Hai', true, '2020-06-24 05:42:06', NULL),
(50, 9, 'Same', true, '2020-06-24 05:42:15', NULL),
(51, 11, 'Nachingwea', true, '2020-06-24 06:01:11', NULL),
(52, 11, 'Ruangwa', true, '2020-06-24 06:01:23', NULL),
(53, 11, 'Liwale', true, '2020-06-24 06:01:35', NULL),
(54, 11, 'Lindi', true, '2020-06-24 06:01:46', NULL),
(55, 11, 'Kilwa', true, '2020-06-24 06:01:58', NULL),
(56, 26, 'Babati', true, '2020-06-24 06:03:23', NULL),
(57, 26, 'Mbulu', true, '2020-06-24 06:03:31', NULL),
(58, 26, 'Hanang''', true, '2020-06-24 06:03:53', NULL),
(59, 26, 'Kiteto', true, '2020-06-24 06:04:01', NULL),
(60, 26, 'Simanjiro', true, '2020-06-24 06:04:20', NULL),
(61, 25, 'Rorya', true, '2020-06-24 06:05:13', NULL),
(62, 25, 'Serengeti', true, '2020-06-24 06:05:28', NULL),
(63, 25, 'Bunda', true, '2020-06-24 06:05:35', NULL),
(64, 25, 'Butiama', true, '2020-06-24 06:05:51', NULL),
(65, 25, 'Tarime', true, '2020-06-24 06:05:59', NULL),
(66, 25, 'Musoma', true, '2020-06-24 06:06:12', NULL),
(67, 14, 'Chunya', true, '2020-06-24 06:06:43', NULL),
(68, 14, 'Kyela', true, '2020-06-24 06:06:51', NULL),
(69, 14, 'Mbeya', true, '2020-06-24 06:07:05', NULL),
(70, 14, 'Rungwe', true, '2020-06-24 06:07:12', NULL),
(71, 14, 'Mbarali', true, '2020-06-24 06:07:33', NULL),
(72, 7, 'Gairo', true, '2020-06-24 06:08:32', NULL),
(73, 7, 'Kilombero', true, '2020-06-24 06:08:40', NULL),
(74, 7, 'Kilosa', true, '2020-06-24 06:08:46', NULL),
(75, 7, 'Mvomero', true, '2020-06-24 06:09:03', NULL),
(76, 7, 'Morogoro', true, '2020-06-24 06:09:09', NULL),
(77, 7, 'Ulanga', true, '2020-06-24 06:09:21', NULL),
(78, 7, 'Malinyi', true, '2020-06-24 06:09:27', NULL),
(79, 10, 'Newala', true, '2020-06-24 06:10:36', NULL),
(80, 10, 'Nanyumbu', true, '2020-06-24 06:11:05', NULL),
(81, 10, 'Mtwara', true, '2020-06-24 06:11:18', NULL),
(82, 10, 'Masasi', true, '2020-06-24 06:11:25', NULL),
(83, 10, 'Tandahimba', true, '2020-06-24 06:11:50', NULL),
(84, 22, 'Ilemela', true, '2020-06-24 06:12:29', NULL),
(85, 22, 'Kwimba', true, '2020-06-24 06:12:40', NULL),
(86, 22, 'Sengerema', true, '2020-06-24 06:12:55', NULL),
(87, 22, 'Nyamagana', true, '2020-06-24 06:13:05', NULL),
(88, 22, 'Magu', true, '2020-06-24 06:13:21', NULL),
(89, 22, 'Ukerewe', true, '2020-06-24 06:13:29', NULL),
(90, 22, 'Misungwi', true, '2020-06-24 06:13:41', NULL),
(91, 15, 'Njombe', true, '2020-06-24 06:14:18', NULL),
(92, 15, 'Ludewa', true, '2020-06-24 06:14:25', NULL),
(93, 15, 'Wang''ing''ombe', true, '2020-06-24 06:14:44', NULL),
(94, 15, 'Makete', true, '2020-06-24 06:14:55', NULL),
(95, 8, 'Bagamoyo', true, '2020-06-24 06:15:23', NULL),
(96, 8, 'Mkuranga', true, '2020-06-24 06:15:30', NULL),
(97, 8, 'Rufiji', true, '2020-06-24 06:15:46', NULL),
(98, 8, 'Mafia', true, '2020-06-24 06:15:52', NULL),
(99, 8, 'Kibaha', true, '2020-06-24 06:16:04', NULL),
(100, 8, 'Kisarawe', true, '2020-06-24 06:16:11', NULL),
(101, 8, 'Kibiti', true, '2020-06-24 06:16:25', NULL),
(102, 16, 'Sumbawanga', true, '2020-06-24 06:17:11', NULL),
(103, 16, 'Nkasi', true, '2020-06-24 06:17:18', NULL),
(104, 16, 'Kalambo', true, '2020-06-24 06:17:26', NULL),
(105, 12, 'Namtumbo', true, '2020-06-24 06:17:42', NULL),
(106, 12, 'Mbinga', true, '2020-06-24 06:17:48', NULL),
(107, 12, 'Nyasa', true, '2020-06-24 06:17:59', NULL),
(108, 12, 'Tunduru', true, '2020-06-24 06:18:06', NULL),
(109, 12, 'Songea', true, '2020-06-24 06:18:19', NULL),
(110, 23, 'Kishapu', true, '2020-06-24 06:18:45', NULL),
(111, 23, 'Kahama', true, '2020-06-24 06:18:53', NULL),
(112, 23, 'Shinyanga', true, '2020-06-24 06:19:04', NULL),
(113, 24, 'Busega', true, '2020-06-24 06:21:41', NULL),
(114, 24, 'Maswa', true, '2020-06-24 06:21:52', NULL),
(115, 24, 'Bariadi', true, '2020-06-24 06:22:04', NULL),
(116, 24, 'Meatu', true, '2020-06-24 06:22:12', NULL),
(117, 24, 'Itilima', true, '2020-06-24 06:22:27', NULL),
(118, 27, 'Mkalama', true, '2020-06-24 06:27:56', NULL),
(119, 27, 'Manyoni', true, '2020-06-24 06:28:06', NULL),
(120, 27, 'Singida', true, '2020-06-24 06:28:20', NULL),
(121, 27, 'Ikungi', true, '2020-06-24 06:28:27', NULL),
(122, 27, 'Iramba', true, '2020-06-24 06:28:47', NULL),
(123, 13, 'Songwe', true, '2020-06-24 06:29:26', NULL),
(124, 13, 'Ileje', true, '2020-06-24 06:29:48', NULL),
(125, 13, 'Mbozi', true, '2020-06-24 06:29:57', NULL),
(126, 13, 'Momba', true, '2020-06-24 06:30:13', NULL),
(127, 29, 'Nzega', true, '2020-06-24 06:31:00', NULL),
(128, 29, 'Kaliua', true, '2020-06-24 06:31:16', NULL),
(129, 29, 'Igunga', true, '2020-06-24 06:31:23', NULL),
(130, 29, 'Sikonge', true, '2020-06-24 06:31:39', NULL),
(131, 29, 'Tabora', true, '2020-06-24 06:31:51', NULL),
(132, 29, 'Urambo', true, '2020-06-24 06:32:06', NULL),
(133, 29, 'Uyui', true, '2020-06-24 06:32:16', NULL),
(134, 4, 'Tanga', true, '2020-06-24 06:34:32', NULL),
(135, 4, 'Muheza', true, '2020-06-24 06:34:43', NULL),
(136, 4, 'Mkinga', true, '2020-06-24 06:34:53', NULL),
(137, 4, 'Pangani', true, '2020-06-24 06:35:46', NULL),
(138, 4, 'Handeni', true, '2020-06-24 06:35:57', NULL),
(139, 4, 'Korogwe', true, '2020-06-24 06:36:07', NULL),
(140, 4, 'Kilindi', true, '2020-06-24 06:36:17', NULL),
(141, 4, 'Lushoto', true, '2020-06-24 06:36:27', NULL),
(145, 33, 'Micheweni', true, '2021-01-18 12:03:16', NULL),
(146, 33, 'Wete', true, '2021-01-18 12:03:24', NULL),
(147, 34, 'Chakechake', true, '2021-01-18 12:07:50', NULL),
(148, 34, 'Mkoani', true, '2021-01-18 12:08:04', NULL),
(149, 35, 'Kaskazini A', true, '2021-01-18 12:10:42', NULL),
(150, 35, 'Kaskazini B', true, '2021-01-18 12:10:53', NULL),
(151, 36, 'Unguja Kati', true, '2021-01-18 12:11:40', NULL),
(152, 36, 'Unguja Kusini', true, '2021-01-18 12:11:52', NULL),
(153, 37, 'Unguja Magharibi', true, '2021-01-18 12:12:24', NULL),
(154, 37, 'Unguja Mjini', true, '2021-01-18 12:12:39', NULL),
(155, 2, 'WINGERS', true, '2025-06-09 16:18:34', NULL)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  PERFORM setval('regions_id_seq', COALESCE((SELECT MAX(id) FROM regions), 1), true);
  PERFORM setval('districts_id_seq', COALESCE((SELECT MAX(id) FROM districts), 1), true);
END $$;


-- ROW LEVEL SECURITY (from rls.sql)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;

-- USERS TABLE POLICIES
CREATE POLICY "Users can read own record" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can read all users" ON users FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "Staff can read riders and businesses" ON users FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'STAFF') AND role IN ('RIDER', 'BUSINESS'));
CREATE POLICY "Users can update own record" ON users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can update any user" ON users FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "Admins can insert users" ON users FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));

-- BUSINESSES TABLE POLICIES
CREATE POLICY "Businesses can read own record" ON businesses FOR SELECT USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')));
CREATE POLICY "Staff and Admins can read all businesses" ON businesses FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')));
CREATE POLICY "Public can read business logos" ON businesses FOR SELECT USING (logo_url IS NOT NULL AND active = true);
CREATE POLICY "Businesses can update own record" ON businesses FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins and Staff can update any business" ON businesses FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')));

-- DELIVERIES TABLE POLICIES
CREATE POLICY "Businesses can read own deliveries" ON deliveries FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));
CREATE POLICY "Staff and Admins can read all deliveries" ON deliveries FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')));
CREATE POLICY "Riders can read assigned deliveries" ON deliveries FOR SELECT USING (assigned_rider_id = auth.uid() AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'RIDER'));
CREATE POLICY "Businesses and Staff can create deliveries" ON deliveries FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('BUSINESS', 'STAFF')));
CREATE POLICY "Staff and Admins can update deliveries" ON deliveries FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('STAFF', 'ADMIN')));
CREATE POLICY "Riders can update assigned deliveries" ON deliveries FOR UPDATE USING (assigned_rider_id = auth.uid() AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'RIDER'));

-- DELIVERY EVENTS TABLE POLICIES
CREATE POLICY "Read delivery events" ON delivery_events FOR SELECT USING (delivery_id IN (SELECT id FROM deliveries WHERE business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()) OR assigned_rider_id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF'))));
CREATE POLICY "Riders and Staff can create events" ON delivery_events FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('RIDER', 'STAFF')));

-- CHARGES TABLE POLICIES
CREATE POLICY "Businesses can read own charges" ON charges FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));
CREATE POLICY "Staff and Admins can read all charges" ON charges FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')));
CREATE POLICY "Staff and Admins can create charges" ON charges FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')));

-- INVOICES TABLE POLICIES
CREATE POLICY "Businesses can read own invoices" ON invoices FOR SELECT USING (business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()));
CREATE POLICY "Staff and Admins can read all invoices" ON invoices FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')));

-- INVOICE ITEMS TABLE POLICIES
CREATE POLICY "Read invoice items" ON invoice_items FOR SELECT USING (invoice_id IN (SELECT id FROM invoices WHERE business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid()) OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF'))));

-- SMS LOGS TABLE POLICIES
CREATE POLICY "Admins and Staff can read SMS logs" ON sms_logs FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')));

-- OTP CODES TABLE POLICIES
CREATE POLICY "Users can read own OTP codes" ON otp_codes FOR SELECT USING (phone IN (SELECT phone FROM users WHERE id = auth.uid()));
CREATE POLICY "Users can update own OTP codes" ON otp_codes FOR UPDATE USING (phone IN (SELECT phone FROM users WHERE id = auth.uid()));

-- REGIONS/DISTRICTS POLICIES
CREATE POLICY "Anyone can read regions" ON regions FOR SELECT USING (true);
CREATE POLICY "Admins can modify regions" ON regions FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "Anyone can read districts" ON districts FOR SELECT USING (true);
CREATE POLICY "Admins can modify districts" ON districts FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));


-- TRIGGERS (from triggers.sql)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, phone, role, active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'business_name', NULL),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'BUSINESS'),
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET
    name = COALESCE(NEW.raw_user_meta_data->>'business_name', users.name),
    email = COALESCE(NEW.email, users.email),
    phone = COALESCE(NEW.raw_user_meta_data->>'phone', users.phone),
    role = COALESCE(NEW.raw_user_meta_data->>'role', users.role);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_user_name_from_business()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET name = NEW.name
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_business_name_update
  AFTER INSERT OR UPDATE OF name ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_name_from_business();

CREATE OR REPLACE FUNCTION public.create_delivery_event()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.delivery_events (delivery_id, status, created_by)
    VALUES (NEW.id, NEW.status, NEW.assigned_rider_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_delivery_status_change
  AFTER UPDATE OF status ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.create_delivery_event();

CREATE OR REPLACE FUNCTION public.set_delivered_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'DELIVERED' AND OLD.status != 'DELIVERED' THEN
    NEW.delivered_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_delivery_delivered
  BEFORE UPDATE OF status ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_delivered_at();

