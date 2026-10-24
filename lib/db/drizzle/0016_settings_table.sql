-- Settings table: single-tenant configuration store
-- Key/value + JSON, loaded once at boot and cached in memory
-- Groups: clinic, network, radiology, notifications, security, branding

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

-- Index for efficient lookups by key pattern (e.g., all 'clinic.*' keys)
CREATE INDEX IF NOT EXISTS idx_settings_key_pattern ON settings (key text_pattern_ops);

-- Seed default settings with empty objects for each group
-- These will be populated by the onboarding wizard on first run
INSERT INTO settings (key, value) VALUES
  ('clinic', '{"name": "", "address": "", "phone": "", "email": "", "logoUrl": "", "timezone": "Asia/Kolkata", "locale": "en-IN"}'),
  ('network', '{"publicUrl": "", "nasHost": "", "apiPort": 8200, "webPort": 3100, "dicomPort": 6433}'),
  ('radiology', '{"modalities": [], "aeTitle": "DIAGNOSTICS", "viewerEnabled": true, "defaultTemplates": []}'),
  ('notifications', '{"smtpHost": "", "smtpPort": 587, "smtpUser": "", "smtpFrom": "", "whatsappEnabled": false}'),
  ('security', '{"totpIssuer": "Diagnostics ERP", "sessionTtlHours": 24, "secretRotationDue": false}'),
  ('branding', '{"primaryColor": "#2563eb", "accentColor": "#10b981", "favicon": "", "loginTagline": "Configure your clinic settings to get started"}')
ON CONFLICT (key) DO NOTHING;
