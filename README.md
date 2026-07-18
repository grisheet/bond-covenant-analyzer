# Bond Covenant Analyzer

A production-grade SaaS web application for AI-powered bond covenant extraction and analysis. Upload bond prospectuses, indentures, and offering memoranda to extract, organize, and review restrictive covenants, leverage limits, default clauses, and reporting obligations.

## Overview

Bond Covenant Analyzer converts unstructured debt documents into a structured, source-linked covenant database that analysts can review, query, and compare in minutes instead of hours. The core thesis: **AI accelerates covenant review but cannot replace it.** Every extracted data point is anchored to the exact page and section it came from, scored for confidence, and flagged for human review when the language is ambiguous.

## Key Features

- **Multi-document Upload** - Upload one or more PDF bond documents simultaneously
- **AI Covenant Extraction** - Automated extraction of 15+ covenant categories using OpenAI GPT-4
- **Analyst Dashboard** - KPI summary, recent documents, flagged clauses requiring review
- **Document Analysis View** - Side-by-side original text vs. structured interpretation with source citations
- **Clause Comparison Matrix** - Cross-issuer comparison of covenant packages
- **Chat Q&A** - Ask-the-document chat with page-level citations (RAG-powered)
- **Confidence Scoring** - AI confidence scores + deterministic rule-based validation
- **Audit Trail** - Every review action logged with analyst identity and timestamp
- **Export** - CSV / memo format export for downstream workflows

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand + React Query |
| AI/LLM | OpenAI GPT-4o API |
| Backend API | Next.js API Routes |
| Extraction Service | Python 3.11, FastAPI, Celery |
| PDF Parsing | pdfplumber, PyMuPDF, Tesseract OCR |
| Database | PostgreSQL 15 + pgvector |
| Job Queue | PostgreSQL-native (pg-boss pattern) |
| Storage | S3-compatible (AWS S3 / MinIO) |
| Auth | NextAuth.js |
| Deployment | Docker Compose / Kubernetes |

## Project Structure

```
bond-covenant-analyzer/
├── apps/
│   └── web/                          # Next.js App Router
│       ├── app/
│       │   ├── (auth)/               # Auth pages
│       │   ├── dashboard/            # Main dashboard
│       │   ├── upload/               # Document upload flow
│       │   ├── documents/
│       │   │   └── [id]/             # Document analysis view
│       │   ├── compare/              # Clause comparison matrix
│       │   ├── chat/                 # RAG chat interface
│       │   └── api/                  # API routes
│       ├── components/
│       │   ├── ui/                   # shadcn/ui primitives
│       │   ├── dashboard/            # Dashboard widgets
│       │   ├── upload/               # Upload components
│       │   ├── analysis/             # Clause viewer components
│       │   ├── compare/              # Comparison table
│       │   └── chat/                 # Chat components
│       ├── lib/
│       │   ├── db.ts                 # Database client
│       │   ├── openai.ts             # OpenAI client
│       │   └── s3.ts                 # S3 client
│       └── types/                    # TypeScript types
├── services/
│   └── extraction/                   # Python microservice
│       ├── main.py                   # FastAPI entry point
│       ├── worker.py                 # Celery worker
│       ├── pipeline/
│       │   ├── ingest.py             # Document ingestion
│       │   ├── pdf_text.py           # PDF text extraction
│       │   ├── ocr.py                # OCR fallback
│       │   ├── sections.py           # Section detection
│       │   ├── chunking.py           # Intelligent chunking
│       │   ├── classify.py           # Clause classification
│       │   ├── extract.py            # Structured extraction
│       │   ├── validate.py           # Deterministic validation
│       │   ├── scoring.py            # Confidence scoring
│       │   └── persist.py            # Database persistence
│       └── prompts/                  # Versioned LLM prompts
├── packages/
│   └── shared/                       # Shared types/schemas
│       ├── schemas.ts                # Zod schemas
│       └── schemas.py                # Pydantic schemas
├── db/
│   └── migrations/                   # SQL migrations
├── docker-compose.yml
├── docker-compose.dev.yml
└── README.md
```

## Covenant Categories Extracted

### Financial Covenants
- Leverage ratio limits (Total Debt / EBITDA)
- Interest coverage / Fixed charge coverage limits
- Minimum liquidity requirements
- Capital expenditure limits

### Restrictive Covenants
- Debt incurrence limitations and baskets
- Restricted payments (dividends, buybacks) capacity
- Liens / collateral / security package
- Asset sale and merger covenants
- Investment limitations

### Default / Risk Provisions
- Events of default definitions
- Cure periods and grace periods
- Acceleration triggers
- Cross-default clauses and thresholds
- Change of control protections
- Guarantee structure

### Reporting & Redemption
- Reporting requirements and timelines
- Redemption / call protections
- Make-whole provisions
- Consent solicitation rights

## Database Schema

```sql
-- Core tables
organizations, users, documents, document_pages

-- Structure
sections (hierarchical tree for navigation/citation)

-- Extraction
clause_types (taxonomy), extracted_clauses, covenant_metrics

-- Audit / Workflow
review_flags, processing_jobs, chat_sessions, chat_messages, source_citations
```

## API Routes

```
POST   /api/uploads                    # Get signed upload URL
GET    /api/documents                  # List documents
GET    /api/documents/:id              # Document detail
POST   /api/documents/:id/process      # Trigger extraction
GET    /api/documents/:id/clauses      # Filtered clause list
GET    /api/clauses/:id                # Full clause detail
POST   /api/clauses/:id/review         # Submit review (audit trail)
POST   /api/compare                    # Generate comparison matrix
POST   /api/chat                       # Streaming RAG chat
GET    /api/export                     # Export to CSV/memo
GET    /api/dashboard/kpis             # Dashboard KPI data
```

## Implementation Phases

| Phase | Weeks | Focus |
|-------|-------|-------|
| 1 | 1-3 | Pipeline spine: upload, text extraction, section detection, golden test set |
| 2 | 3-6 | Extraction core: taxonomy, classifier, top 6 high-value categories, validation |
| 3 | 5-8 | Analyst UI: auth, dashboard, upload progress, analysis viewer |
| 4 | 8-10 | Chat (RAG) and comparison matrix |
| 5 | 10-12 | Hardening: OCR fallback, remaining categories, audit logs, billing |

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL 15+ with pgvector extension
- Redis (for Celery broker)
- OpenAI API key
- AWS S3 bucket or MinIO instance

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/grisheet/bond-covenant-analyzer.git
cd bond-covenant-analyzer
```

2. **Install Node.js dependencies**

```bash
cd apps/web
npm install
```

3. **Install Python dependencies**

```bash
cd services/extraction
pip install -r requirements.txt
```

4. **Configure environment variables**

```bash
cp apps/web/.env.example apps/web/.env.local
cp services/extraction/.env.example services/extraction/.env
```

Fill in your OpenAI API key, database URL, S3 credentials, and other configuration.

5. **Run database migrations**

```bash
psql $DATABASE_URL -f db/migrations/001_initial_schema.sql
psql $DATABASE_URL -f db/migrations/002_covenant_types.sql
psql $DATABASE_URL -f db/migrations/003_pgvector.sql
```

6. **Start development servers**

```bash
# Terminal 1: Next.js
cd apps/web && npm run dev

# Terminal 2: Python extraction service
cd services/extraction && uvicorn main:app --reload

# Terminal 3: Celery worker
cd services/extraction && celery -A worker worker --loglevel=info
```

### Docker Compose

```bash
docker-compose -f docker-compose.dev.yml up
```

This starts PostgreSQL, Redis, MinIO, the Next.js app, and the Python extraction service.

## Environment Variables

### Next.js App (`apps/web/.env.local`)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/bond_analyzer
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET=bond-documents
AWS_S3_REGION=us-east-1
EXTRACTION_SERVICE_URL=http://localhost:8000
```

### Python Service (`services/extraction/.env`)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/bond_analyzer
REDIS_URL=redis://localhost:6379/0
OPENAI_API_KEY=sk-...
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET=bond-documents
```

## Design Principles

- **Determinism**: LLMs parse and extract, but regex rules verify every number, ratio, and threshold against verbatim source excerpts
- **Auditability**: Every extracted data point is anchored to a source page/section; failures in verification trigger a `needs_review` flag
- **Citation**: Chat answers assembled from retrieved chunks, citing exact clause and page number
- **Institutional UX**: Dark-mode-friendly, compact, analyst-centric — like a modern fixed-income research terminal

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

## License

MIT License — see [LICENSE](LICENSE) for details.
