CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resumes (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    filename TEXT NOT NULL,
    parsed_data JSON,
    raw_text TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS preferences (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    target_roles JSON,
    target_locations JSON,
    salary_min INTEGER,
    salary_max INTEGER,
    remote_preference TEXT DEFAULT 'any',
    industries JSON,
    excluded_companies JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    source_id TEXT,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    company_url TEXT,
    location TEXT,
    is_remote BOOLEAN,
    salary_min INTEGER,
    salary_max INTEGER,
    description TEXT,
    requirements JSON,
    posted_at TIMESTAMP,
    raw_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source, source_id)
);

CREATE TABLE IF NOT EXISTS job_matches (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    job_id TEXT REFERENCES jobs(id),
    match_score REAL,
    match_reasons JSON,
    skills_matched JSON,
    skills_missing JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, job_id)
);

CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    job_id TEXT REFERENCES jobs(id),
    resume_id TEXT REFERENCES resumes(id),
    status TEXT NOT NULL DEFAULT 'saved',
    cover_letter TEXT,
    tailored_resume JSON,
    applied_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS application_events (
    id TEXT PRIMARY KEY,
    application_id TEXT REFERENCES applications(id),
    event_type TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    application_id TEXT REFERENCES applications(id),
    reminder_date TIMESTAMP NOT NULL,
    message TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    application_id TEXT REFERENCES applications(id),
    doc_type TEXT NOT NULL,
    content TEXT,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_user ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(reminder_date) WHERE is_completed = FALSE;
