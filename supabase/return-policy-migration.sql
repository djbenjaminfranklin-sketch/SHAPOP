ALTER TABLE sellers ADD COLUMN IF NOT EXISTS return_policy text
  DEFAULT 'no_return'
  CHECK (return_policy IN ('no_return', 'exchange_only', 'return_7', 'return_14', 'return_30'));
