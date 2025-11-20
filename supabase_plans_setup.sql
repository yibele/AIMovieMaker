-- Create plans table
CREATE TABLE IF NOT EXISTS plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT '$',
    interval_label TEXT NOT NULL, -- e.g., "/mo", "/yr"
    features JSONB NOT NULL DEFAULT '[]',
    badge TEXT, -- e.g., "POPULAR", "BEST VALUE"
    discount_label TEXT, -- e.g., "SAVE 50%"
    button_text TEXT DEFAULT 'Get Started',
    tier TEXT NOT NULL, -- 'basic', 'popular', 'premium', 'standard' to map to UI styles
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access" ON plans
    FOR SELECT
    USING (true);

-- Insert initial data based on current LandingPage.tsx
INSERT INTO plans (name, price, currency, interval_label, features, badge, discount_label, button_text, tier, sort_order) VALUES
(
    'Monthly',
    9.99,
    '$',
    '/mo',
    '[
        {"text": "100 Credits", "icon": "Zap"},
        {"text": "Standard Speed", "icon": "Check"},
        {"text": "2 Concurrent Jobs", "icon": "Check"}
    ]',
    NULL,
    NULL,
    'Get Started',
    'basic',
    1
),
(
    'Quarterly',
    19.99,
    '$',
    '/3mo',
    '[
        {"text": "400 Credits", "icon": "Move3d"},
        {"text": "Fast Speed", "icon": "Check"},
        {"text": "Priority Support", "icon": "Check"}
    ]',
    'POPULAR',
    NULL,
    'Upgrade Flow',
    'popular',
    2
),
(
    'Yearly',
    59.99,
    '$',
    '/yr',
    '[
        {"text": "Unlimited Credits", "icon": "Infinity"},
        {"text": "Turbo Mode (4x Faster)", "icon": "Zap"},
        {"text": "Early Access to New Models", "icon": "Star"}
    ]',
    'BEST VALUE',
    'SAVE 50%',
    'Go Unlimited',
    'premium',
    3
),
(
    'Semiannual',
    34.99,
    '$',
    '/6mo',
    '[
        {"text": "1000 Credits", "icon": "Palette"},
        {"text": "Commercial License", "icon": "Check"},
        {"text": "Private Mode", "icon": "Check"}
    ]',
    NULL,
    NULL,
    'Select Plan',
    'standard',
    4
);
