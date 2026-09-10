ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('man', 'woman', 'non-binary'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS looking_for text CHECK (looking_for IN ('men', 'women', 'everyone'));
