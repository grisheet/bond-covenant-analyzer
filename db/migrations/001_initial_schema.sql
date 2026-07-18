-- Bond Covenant Analyzer - Initial Database Schema
-- Migration: 001_initial_schema.sql

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- ORGANIZATIONS & USERS
-- ============================================================

CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  plan        TEXT NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial', 'pro', 'enterprise')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           TEXT NOT NULL UNIQUE,
  name            TEXT,
  role            TEXT NOT NULL DEFAULT 'analyst' CHECK (role IN ('admin', 'analyst', 'viewer')),
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DOCUMENTS
-- ============================================================

CREATE TABLE documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  uploaded_by     UUID NOT NULL REFERENCES users(id),
  filename        TEXT NOT NULL,
  original_name   TEXT NOT NULL,
  s3_key          TEXT NOT NULL UNIQUE,
  s3_bucket       TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  mime_type       TEXT NOT NULL DEFAULT 'application/pdf',
  page_count      INTEGER,
  -- Metadata extracted from document
  issuer_name     TEXT,
  instrument_type TEXT,  -- 'high_yield_bond', 'investment_grade', 'term_loan', 'revolving_credit', 'other'
  issuance_date   DATE,
  maturity_date   DATE,
  principal_amount NUMERIC(20, 2),
  currency        TEXT DEFAULT 'USD',
  -- Processing state
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'ingesting', 'extracting', 'validating', 'processed', 'failed')),
  processing_error TEXT,
  -- Timestamps
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at    TIMESTAMPTZ
);

CREATE TABLE document_pages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  -- Text layers
  pdf_layer_text   TEXT,  -- native PDF text
  ocr_text         TEXT,  -- OCR fallback (populated when PDF text is inadequate)
  used_ocr         BOOLEAN NOT NULL DEFAULT FALSE,
  -- Character-level confidence for OCR
  ocr_confidence   FLOAT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, page_number)
);

-- ============================================================
-- DOCUMENT SECTIONS (hierarchical)
-- ============================================================

CREATE TABLE sections (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES sections(id),
  heading     TEXT,
  level       INTEGER NOT NULL DEFAULT 1,  -- 1=article, 2=section, 3=subsection
  start_page  INTEGER NOT NULL,
  end_page    INTEGER,
  start_char  INTEGER,
  end_char    INTEGER,
  path        TEXT,  -- e.g. "Article IV > Section 4.2 > (a)"
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CLAUSE TAXONOMY
-- ============================================================

CREATE TABLE clause_types (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        TEXT NOT NULL UNIQUE,  -- e.g. 'leverage_ratio', 'restricted_payments'
  label       TEXT NOT NULL,
  category    TEXT NOT NULL,  -- 'financial', 'restrictive', 'default', 'reporting', 'redemption'
  description TEXT,
  risk_weight FLOAT NOT NULL DEFAULT 1.0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed clause types
INSERT INTO clause_types (code, label, category, description, risk_weight) VALUES
  ('leverage_ratio',          'Leverage Ratio Limit',           'financial',   'Total Debt / EBITDA ceiling',                          1.5),
  ('interest_coverage',       'Interest Coverage Ratio',        'financial',   'EBITDA / Interest expense floor',                      1.4),
  ('fixed_charge_coverage',   'Fixed Charge Coverage',          'financial',   'Fixed charges coverage ratio floor',                   1.3),
  ('min_liquidity',           'Minimum Liquidity',              'financial',   'Minimum cash / available revolver requirement',        1.2),
  ('capex_limit',             'Capital Expenditure Limit',      'financial',   'Annual capex ceiling',                                 0.9),
  ('debt_incurrence',         'Debt Incurrence',                'restrictive', 'Conditions and baskets for incurring additional debt',  1.5),
  ('restricted_payments',     'Restricted Payments',            'restrictive', 'Dividend and buyback capacity basket',                  1.4),
  ('liens',                   'Liens / Collateral',             'restrictive', 'Security package and permitted lien baskets',           1.3),
  ('asset_sales',             'Asset Sales',                    'restrictive', 'Asset disposal covenants and reinvestment rights',      1.2),
  ('investments',             'Investments',                    'restrictive', 'Permitted investment baskets',                          1.1),
  ('mergers',                 'Mergers & Acquisitions',         'restrictive', 'Consolidation and merger provisions',                   1.3),
  ('affiliate_transactions',  'Affiliate Transactions',         'restrictive', 'Related-party transaction restrictions',                1.0),
  ('events_of_default',       'Events of Default',             'default',     'Defined triggers for acceleration',                     2.0),
  ('cure_periods',            'Cure Periods',                   'default',     'Grace periods to remedy defaults',                      1.3),
  ('cross_default',           'Cross-Default',                  'default',     'Cross-default and cross-acceleration thresholds',       1.8),
  ('change_of_control',       'Change of Control',              'default',     'Change of control puts and protections',                1.5),
  ('guarantee_structure',     'Guarantee Structure',            'default',     'Guarantee coverage and release conditions',             1.4),
  ('reporting_requirements',  'Reporting Requirements',         'reporting',   'Financial reporting timelines and obligations',         0.8),
  ('call_protection',         'Call / Redemption Protection',   'redemption',  'Non-call periods, make-whole, and redemption premiums', 1.2),
  ('consent_rights',          'Consent & Amendment Rights',     'reporting',   'Consent solicitation and amendment provisions',         1.0);

-- ============================================================
-- EXTRACTED CLAUSES (core output)
-- ============================================================

CREATE TABLE extracted_clauses (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id       UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  clause_type_id    UUID NOT NULL REFERENCES clause_types(id),
  section_id        UUID REFERENCES sections(id),
  -- Source location
  source_page_start INTEGER NOT NULL,
  source_page_end   INTEGER,
  source_char_start INTEGER,
  source_char_end   INTEGER,
  verbatim_text     TEXT NOT NULL,  -- exact quoted text from document
  -- AI Outputs
  plain_english_summary TEXT NOT NULL,
  structured_data   JSONB NOT NULL DEFAULT '{}',  -- thresholds, baskets, exceptions
  -- Deterministic extraction fields (validated by rules)
  threshold_value   NUMERIC(20, 4),
  threshold_unit    TEXT,  -- 'x', '%', 'USD', etc.
  threshold_type    TEXT,  -- 'maximum', 'minimum', 'equal'
  basket_amount     NUMERIC(20, 4),
  basket_currency   TEXT,
  cure_period_days  INTEGER,
  -- Scoring
  confidence_score  FLOAT NOT NULL DEFAULT 0.0 CHECK (confidence_score BETWEEN 0 AND 1),
  validation_passed BOOLEAN NOT NULL DEFAULT FALSE,
  risk_level        TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  -- Review state
  review_status     TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected', 'needs_review')),
  reviewed_by       UUID REFERENCES users(id),
  reviewed_at       TIMESTAMPTZ,
  -- Metadata
  extraction_model  TEXT,
  prompt_version    TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COVENANT METRICS (normalized numeric data for screening)
-- ============================================================

CREATE TABLE covenant_metrics (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clause_id     UUID NOT NULL REFERENCES extracted_clauses(id) ON DELETE CASCADE,
  document_id   UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  metric_name   TEXT NOT NULL,  -- e.g. 'max_leverage_ratio', 'min_dscr'
  metric_value  NUMERIC(20, 6),
  metric_unit   TEXT,
  is_floor      BOOLEAN NOT NULL DEFAULT FALSE,
  is_ceiling    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- REVIEW FLAGS
-- ============================================================

CREATE TABLE review_flags (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clause_id       UUID NOT NULL REFERENCES extracted_clauses(id) ON DELETE CASCADE,
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  flagged_by      TEXT NOT NULL,  -- 'system' | user_id
  flag_type       TEXT NOT NULL,  -- 'low_confidence', 'validation_failed', 'ambiguous_language', 'manual'
  flag_reason     TEXT NOT NULL,
  resolved        BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by     UUID REFERENCES users(id),
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROCESSING JOBS
-- ============================================================

CREATE TABLE processing_jobs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  job_type        TEXT NOT NULL DEFAULT 'full_extraction',
  status          TEXT NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  celery_task_id  TEXT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  error_message   TEXT,
  pipeline_stage  TEXT,  -- current stage: ingest, pdf_text, sections, chunking, classify, extract, validate, score, persist
  progress_pct    INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CHAT SESSIONS & MESSAGES
-- ============================================================

CREATE TABLE chat_sessions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  title       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE chat_messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE source_citations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id      UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  clause_id       UUID REFERENCES extracted_clauses(id),
  document_id     UUID NOT NULL REFERENCES documents(id),
  page_number     INTEGER NOT NULL,
  verbatim_quote  TEXT NOT NULL,
  relevance_score FLOAT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_documents_org ON documents(organization_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_document_pages_doc ON document_pages(document_id);
CREATE INDEX idx_sections_doc ON sections(document_id);
CREATE INDEX idx_extracted_clauses_doc ON extracted_clauses(document_id);
CREATE INDEX idx_extracted_clauses_type ON extracted_clauses(clause_type_id);
CREATE INDEX idx_extracted_clauses_review ON extracted_clauses(review_status);
CREATE INDEX idx_covenant_metrics_doc ON covenant_metrics(document_id);
CREATE INDEX idx_review_flags_clause ON review_flags(clause_id);
CREATE INDEX idx_processing_jobs_doc ON processing_jobs(document_id);
CREATE INDEX idx_processing_jobs_status ON processing_jobs(status);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);
