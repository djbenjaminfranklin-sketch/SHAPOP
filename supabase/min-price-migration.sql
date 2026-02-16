-- Add min_price (reserve price) column to items table
ALTER TABLE items ADD COLUMN IF NOT EXISTS min_price numeric DEFAULT NULL;
