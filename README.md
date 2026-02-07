# Job Application Assistant

Multi-agent AI system for job search, resume tailoring, and application tracking. Built with LangGraph orchestration and MCP (Model Context Protocol) server.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js Dashboard                          │
│   Dashboard  │  Job Search  │  Kanban Board  │  Resume Upload   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       FastAPI Backend                            │
│   /api/jobs  │  /api/applications  │  /api/resumes  │  /api/agent│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  LangGraph Orchestrator                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   Supervisor Agent                         │  │
│  └───────────────────────────────────────────────────────────┘  │
│         │                    │                    │              │
│         ▼                    ▼                    ▼              │
│  ┌───────────┐       ┌───────────┐       ┌───────────┐          │
│  │  Matcher  │       │  Tailor   │       │  Tracker  │          │
│  │   Agent   │       │   Agent   │       │   Agent   │          │
│  └───────────┘       └───────────┘       └───────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        MCP Server                                │
│  search_jobs │ parse_resume │ generate_cover_letter │ CRUD ops  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
            ┌─────────────────────────────────────┐
            │  Adzuna API  │  RemoteOK  │  SQLite │
            └─────────────────────────────────────┘
```

## Features

- **Job Search**: Search Adzuna and RemoteOK APIs, auto-save results
- **AI Matching**: LLM-powered skill matching with explanations
- **Cover Letter Generation**: Claude generates tailored cover letters
- **Resume Suggestions**: AI analyzes job requirements vs your resume
- **Kanban Tracking**: Drag-and-drop application pipeline
- **MCP Server**: 10+ tools following Model Context Protocol

## Tech Stack

| Layer | Technology |
|-------|------------|
| Agent Framework | LangGraph |
| MCP Server | FastMCP (Python) |
| Backend | FastAPI |
| Frontend | Next.js 14, shadcn/ui, TanStack Query |
| Database | SQLite + SQLAlchemy |
| LLM | Claude (Anthropic) |
| Job APIs | Adzuna, RemoteOK |

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Anthropic API key (optional, for AI features)

### Setup

```bash
# Clone
git clone https://github.com/EiriniOr/job-application-assistant
cd job-application-assistant

# Backend
python -m venv .venv
source .venv/bin/activate
pip install -e .

# Set environment variables
cp .env.example .env
# Edit .env with your API keys

# Frontend
cd frontend
npm install
cd ..

# Run
uvicorn backend.main:app --reload &
cd frontend && npm run dev
```

Open http://localhost:3000

### With Docker

```bash
docker-compose up
```

## Agents

### Supervisor
Routes requests to specialist agents based on action type.

### Matcher Agent
- Searches Adzuna + RemoteOK APIs
- Calculates match scores using Claude
- Identifies skill overlaps and gaps

### Tailor Agent
- Generates personalized cover letters
- Suggests resume bullet improvements
- Maps experience to job requirements

### Tracker Agent
- Updates application status
- Generates pipeline summaries
- Tracks application timeline

## MCP Tools

| Tool | Description |
|------|-------------|
| `search_jobs` | Search across job boards |
| `get_job_details` | Fetch full job info |
| `parse_and_save_resume` | Extract resume structure |
| `create_job_application` | Save job to pipeline |
| `update_application` | Change application status |
| `save_cover_letter` | Store generated letter |
| `save_match_score` | Record match analysis |

## API Endpoints

```
GET  /api/jobs           - List saved jobs
GET  /api/jobs/search    - Search job boards
POST /api/applications   - Create application
GET  /api/applications   - List applications
PATCH /api/applications/:id - Update status
POST /api/resumes/upload - Upload resume
POST /api/agent/run      - Trigger agent workflow
```

## Environment Variables

```
ANTHROPIC_API_KEY=     # Required for AI features
ADZUNA_APP_ID=         # Optional: Adzuna job search
ADZUNA_APP_KEY=        # Optional: Adzuna job search
DATABASE_URL=          # Default: sqlite+aiosqlite:///./data/jobs.db
```

## License

MIT
