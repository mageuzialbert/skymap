-- CMS Content Tables for Landing Page Management

-- Slider Images table
CREATE TABLE IF NOT EXISTS slider_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_url TEXT NOT NULL,
  caption TEXT,
  cta_text TEXT,
  cta_link TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CMS Content table (for About Us and other content)
CREATE TABLE IF NOT EXISTS cms_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  content JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Add logo_url column to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_slider_images_active ON slider_images(active);
CREATE INDEX IF NOT EXISTS idx_slider_images_order ON slider_images(order_index);
CREATE INDEX IF NOT EXISTS idx_cms_content_key ON cms_content(key);
CREATE INDEX IF NOT EXISTS idx_businesses_logo_url ON businesses(logo_url) WHERE logo_url IS NOT NULL;

-- Enable RLS
ALTER TABLE slider_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_content ENABLE ROW LEVEL SECURITY;

-- RLS Policies for slider_images
-- Public can read active sliders
CREATE POLICY "Public can read active sliders"
  ON slider_images FOR SELECT
  USING (active = true);

-- Admins can read all sliders
CREATE POLICY "Admins can read all sliders"
  ON slider_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Admins can insert sliders
CREATE POLICY "Admins can insert sliders"
  ON slider_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Admins can update sliders
CREATE POLICY "Admins can update sliders"
  ON slider_images FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Admins can delete sliders
CREATE POLICY "Admins can delete sliders"
  ON slider_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- RLS Policies for cms_content
-- Public can read all CMS content
CREATE POLICY "Public can read CMS content"
  ON cms_content FOR SELECT
  USING (true);

-- Admins can insert CMS content
CREATE POLICY "Admins can insert CMS content"
  ON cms_content FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Admins can update CMS content
CREATE POLICY "Admins can update CMS content"
  ON cms_content FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Admins can delete CMS content
CREATE POLICY "Admins can delete CMS content"
  ON cms_content FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Update trigger for slider_images
CREATE OR REPLACE FUNCTION update_slider_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_slider_images_updated_at
  BEFORE UPDATE ON slider_images
  FOR EACH ROW
  EXECUTE FUNCTION update_slider_images_updated_at();

-- Update trigger for cms_content
CREATE OR REPLACE FUNCTION update_cms_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cms_content_updated_at
  BEFORE UPDATE ON cms_content
  FOR EACH ROW
  EXECUTE FUNCTION update_cms_content_updated_at();
