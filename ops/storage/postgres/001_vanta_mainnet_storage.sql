-- Vanta mainnet storage baseline.
-- FORWARD ONLY MIGRATION.
-- DO NOT STORE SECRET VALUES in this database or in migration metadata.
-- Secrets belong in the production secret manager and should be referenced by name only.

CREATE TABLE IF NOT EXISTS schema_versions (
  store_id TEXT NOT NULL,
  version TEXT NOT NULL,
  migration_name TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checksum TEXT NOT NULL,
  PRIMARY KEY (store_id, version)
);

-- pay-core-schema
CREATE TABLE IF NOT EXISTS pay_merchants (
  merchant_id TEXT PRIMARY KEY,
  environment TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL,
  branding JSONB NOT NULL DEFAULT '{}'::JSONB,
  payout_settings JSONB NOT NULL DEFAULT '{}'::JSONB,
  accepted_assets JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pay_checkout_sessions (
  session_id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL REFERENCES pay_merchants(merchant_id),
  order_id TEXT,
  amount TEXT NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  ui_mode TEXT NOT NULL,
  success_url TEXT NOT NULL,
  cancel_url TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pay_payments (
  payment_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES pay_checkout_sessions(session_id),
  merchant_id TEXT NOT NULL REFERENCES pay_merchants(merchant_id),
  order_id TEXT,
  amount TEXT NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  private_settlement_fingerprint TEXT,
  refunded_amount TEXT NOT NULL DEFAULT '0.00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pay_receipts (
  receipt_id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL REFERENCES pay_payments(payment_id),
  merchant_id TEXT NOT NULL REFERENCES pay_merchants(merchant_id),
  amount TEXT NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  audit_disclosure_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pay_withdrawals (
  withdrawal_id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL REFERENCES pay_merchants(merchant_id),
  amount TEXT NOT NULL,
  asset TEXT NOT NULL,
  destination_type TEXT NOT NULL,
  destination_ref TEXT NOT NULL,
  status TEXT NOT NULL,
  private_exit_fingerprint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- pay-webhook-delivery-schema
CREATE TABLE IF NOT EXISTS pay_webhook_endpoints (
  endpoint_id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL REFERENCES pay_merchants(merchant_id),
  endpoint_url TEXT NOT NULL,
  status TEXT NOT NULL,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pay_webhook_deliveries (
  delivery_id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  endpoint_id TEXT NOT NULL REFERENCES pay_webhook_endpoints(endpoint_id),
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  response_status INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- pay-idempotency-schema
CREATE TABLE IF NOT EXISTS pay_idempotency_keys (
  scope TEXT NOT NULL,
  key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_ref TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (scope, key)
);

CREATE INDEX IF NOT EXISTS idx_pay_checkout_sessions_merchant_status_created
  ON pay_checkout_sessions (merchant_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_pay_payments_merchant_status_created
  ON pay_payments (merchant_id, status, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pay_receipts_payment_id
  ON pay_receipts (payment_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pay_webhook_deliveries_event_endpoint
  ON pay_webhook_deliveries (event_id, endpoint_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pay_idempotency_keys_scope_key
  ON pay_idempotency_keys (scope, key);

-- pool-commitment-tree-schema
CREATE TABLE IF NOT EXISTS pool_commitments (
  commitment_id TEXT PRIMARY KEY,
  tree_id TEXT NOT NULL,
  leaf_index BIGINT NOT NULL,
  commitment TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  merkle_root TEXT NOT NULL,
  recorded_at_slot BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pool_roots (
  root TEXT PRIMARY KEY,
  tree_id TEXT NOT NULL,
  leaf_count BIGINT NOT NULL,
  recorded_at_slot BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- pool-nullifier-schema
CREATE TABLE IF NOT EXISTS pool_nullifiers (
  nullifier TEXT NOT NULL PRIMARY KEY,
  asset_id TEXT NOT NULL,
  spent_at_slot BIGINT,
  claim_receipt_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- pool-proof-receipt-schema
CREATE TABLE IF NOT EXISTS pool_proof_requests (
  request_id TEXT PRIMARY KEY,
  request_type TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  public_input_commitment TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pool_proof_receipts (
  receipt_id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES pool_proof_requests(request_id),
  public_input_commitment TEXT NOT NULL,
  proof_fingerprint TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pool_settlement_submissions (
  submission_id TEXT PRIMARY KEY,
  settlement_type TEXT NOT NULL,
  external_ref TEXT NOT NULL,
  settlement_fingerprint TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pool_operator_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_ref TEXT NOT NULL,
  severity TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pool_commitments_commitment
  ON pool_commitments (commitment);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pool_commitments_tree_leaf
  ON pool_commitments (tree_id, leaf_index);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pool_roots_root
  ON pool_roots (root);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pool_nullifiers_nullifier
  ON pool_nullifiers (nullifier);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pool_proof_requests_request_id
  ON pool_proof_requests (request_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pool_settlement_submissions_submission_id
  ON pool_settlement_submissions (submission_id);

-- strategy-parent-order-schema
CREATE TABLE IF NOT EXISTS strategies (
  strategy_id TEXT PRIMARY KEY,
  owner_public_key TEXT NOT NULL,
  mode TEXT NOT NULL,
  side TEXT NOT NULL,
  from_asset TEXT NOT NULL,
  to_asset TEXT NOT NULL,
  total_notional TEXT NOT NULL,
  status TEXT NOT NULL,
  destination TEXT NOT NULL,
  privacy_mode TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS strategy_funding_events (
  funding_event_id TEXT PRIMARY KEY,
  strategy_id TEXT NOT NULL REFERENCES strategies(strategy_id),
  source_type TEXT NOT NULL,
  amount TEXT NOT NULL,
  asset TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- strategy-child-order-schema
CREATE TABLE IF NOT EXISTS strategy_child_orders (
  child_order_id TEXT PRIMARY KEY,
  strategy_id TEXT NOT NULL REFERENCES strategies(strategy_id),
  sequence INTEGER NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  amount TEXT NOT NULL,
  status TEXT NOT NULL,
  landing_mode TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- strategy-fill-schema
CREATE TABLE IF NOT EXISTS strategy_fills (
  fill_id TEXT PRIMARY KEY,
  strategy_id TEXT NOT NULL REFERENCES strategies(strategy_id),
  child_order_id TEXT NOT NULL REFERENCES strategy_child_orders(child_order_id),
  from_amount TEXT NOT NULL,
  to_amount TEXT NOT NULL,
  effective_price TEXT NOT NULL,
  route_type TEXT NOT NULL,
  landed_via TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS strategy_execution_attempts (
  attempt_id TEXT PRIMARY KEY,
  child_order_id TEXT NOT NULL REFERENCES strategy_child_orders(child_order_id),
  attempt INTEGER NOT NULL,
  status TEXT NOT NULL,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS strategy_disclosures (
  disclosure_id TEXT PRIMARY KEY,
  strategy_id TEXT NOT NULL REFERENCES strategies(strategy_id),
  disclosure_type TEXT NOT NULL,
  export_ref TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strategies_owner_status_created
  ON strategies (owner_public_key, status, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_strategy_child_orders_strategy_sequence
  ON strategy_child_orders (strategy_id, sequence);
CREATE UNIQUE INDEX IF NOT EXISTS idx_strategy_execution_attempts_child_attempt
  ON strategy_execution_attempts (child_order_id, attempt);
CREATE INDEX IF NOT EXISTS idx_strategy_fills_strategy_created
  ON strategy_fills (strategy_id, created_at);

-- operator-service-registry-schema
CREATE TABLE IF NOT EXISTS operator_service_instances (
  service_instance_id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL,
  environment TEXT NOT NULL,
  status TEXT NOT NULL,
  endpoint_ref TEXT NOT NULL,
  version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS operator_service_health_checks (
  health_check_id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL,
  status TEXT NOT NULL,
  latency_ms INTEGER,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- operator-release-schema
CREATE TABLE IF NOT EXISTS operator_release_versions (
  version TEXT PRIMARY KEY,
  git_sha TEXT NOT NULL,
  manifest_ref TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS operator_deployment_locks (
  lock_name TEXT PRIMARY KEY,
  owner_ref TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- operator-incident-schema
CREATE TABLE IF NOT EXISTS operator_incident_events (
  incident_event_id TEXT PRIMARY KEY,
  severity TEXT NOT NULL,
  service_id TEXT NOT NULL,
  status TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_operator_service_instances_service_environment
  ON operator_service_instances (service_id, environment);
CREATE INDEX IF NOT EXISTS idx_operator_service_health_checks_service_created
  ON operator_service_health_checks (service_id, checked_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_operator_release_versions_version
  ON operator_release_versions (version);
CREATE UNIQUE INDEX IF NOT EXISTS idx_operator_deployment_locks_lock_name
  ON operator_deployment_locks (lock_name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_schema_versions_store_version
  ON schema_versions (store_id, version);
