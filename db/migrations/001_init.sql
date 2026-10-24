-- Work Delegation Dashboard: core schema
-- Monday board stays the source of truth for projects, status, timeline and assignments.
-- This database owns skills, availability, interests, goals and interest windows.

CREATE TABLE IF NOT EXISTS skills (
  name        text PRIMARY KEY,
  learning_path text            -- the "YL" learning item that grows this skill, e.g. 'Agentic AI L3 badge'
);

CREATE TABLE IF NOT EXISTS product_types (
  name text PRIMARY KEY
);

-- Skills autofilled onto a project when it arrives with this product type
CREATE TABLE IF NOT EXISTS product_type_skills (
  product_type text REFERENCES product_types(name) ON DELETE CASCADE,
  skill        text REFERENCES skills(name) ON DELETE CASCADE,
  PRIMARY KEY (product_type, skill)
);

CREATE TABLE IF NOT EXISTS roles (
  name text PRIMARY KEY
);

-- Skills-requirement list per role/position
CREATE TABLE IF NOT EXISTS role_requirements (
  role       text REFERENCES roles(name) ON DELETE CASCADE,
  skill      text REFERENCES skills(name) ON DELETE CASCADE,
  min_rating smallint NOT NULL CHECK (min_rating BETWEEN 1 AND 5),
  PRIMARY KEY (role, skill)
);

CREATE TABLE IF NOT EXISTS people (
  id             serial PRIMARY KEY,
  email          text UNIQUE NOT NULL,
  name           text NOT NULL,
  role           text REFERENCES roles(name),
  is_lead        boolean NOT NULL DEFAULT false,   -- engagement leads and managers
  is_engineer    boolean NOT NULL DEFAULT true,
  availability   smallint NOT NULL DEFAULT 3 CHECK (availability BETWEEN 1 AND 5), -- 5 Open .. 1 Full
  last_checkin   timestamptz NOT NULL DEFAULT now(),
  goals          text NOT NULL DEFAULT '',
  onboarded      boolean NOT NULL DEFAULT false,
  monday_user_id bigint UNIQUE,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS person_skills (
  person_id    int  REFERENCES people(id) ON DELETE CASCADE,
  skill        text REFERENCES skills(name) ON DELETE CASCADE,
  rating       smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  kind         text NOT NULL DEFAULT 'client' CHECK (kind IN ('client','learning')),
  badge        text,                      -- e.g. 'L2', 'L3'
  evidence     text NOT NULL DEFAULT '',  -- how the skill was applied
  confirmed_by int REFERENCES people(id),
  confirmed_at timestamptz,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (person_id, skill)
);

CREATE TABLE IF NOT EXISTS person_growth (
  person_id int  REFERENCES people(id) ON DELETE CASCADE,
  skill     text REFERENCES skills(name) ON DELETE CASCADE,
  PRIMARY KEY (person_id, skill)
);

CREATE TABLE IF NOT EXISTS person_interests (
  person_id    int  REFERENCES people(id) ON DELETE CASCADE,
  product_type text REFERENCES product_types(name) ON DELETE CASCADE,
  PRIMARY KEY (person_id, product_type)
);

CREATE TABLE IF NOT EXISTS projects (
  id                 serial PRIMARY KEY,
  monday_item_id     bigint UNIQUE,
  name               text NOT NULL,
  client             text NOT NULL DEFAULT '',
  product_type       text REFERENCES product_types(name),
  status             text NOT NULL DEFAULT 'new' CHECK (status IN ('new','progress','hold','done')),
  seat_cap           smallint NOT NULL DEFAULT 3 CHECK (seat_cap BETWEEN 1 AND 20),
  interest_closes_at timestamptz,
  starts_on          date,
  ends_on            date,
  notified_at        timestamptz,
  synced_at          timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_skills (
  project_id int  REFERENCES projects(id) ON DELETE CASCADE,
  skill      text REFERENCES skills(name) ON DELETE CASCADE,
  PRIMARY KEY (project_id, skill)
);

-- resource = tracked against bandwidth and seat cap; shadow = open, not tracked
CREATE TABLE IF NOT EXISTS assignments (
  project_id int REFERENCES projects(id) ON DELETE CASCADE,
  person_id  int REFERENCES people(id) ON DELETE CASCADE,
  kind       text NOT NULL CHECK (kind IN ('resource','shadow')),
  source     text NOT NULL DEFAULT 'dashboard' CHECK (source IN ('dashboard','monday')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, person_id)
);

CREATE TABLE IF NOT EXISTS project_interest (
  project_id int REFERENCES projects(id) ON DELETE CASCADE,
  person_id  int REFERENCES people(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, person_id)
);

CREATE TABLE IF NOT EXISTS settings (
  key   text PRIMARY KEY,
  value jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_events (
  id         serial PRIMARY KEY,
  kind       text NOT NULL CHECK (kind IN ('sync','webhook','write-back','notify','error')),
  message    text NOT NULL,
  payload    jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assignments_person ON assignments(person_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_sync_events_created ON sync_events(created_at DESC);

INSERT INTO settings(key, value) VALUES
  ('skill_visibility', '"leads"'),   -- 'leads' or 'all'
  ('checkin_days', '14'),
  ('interest_window_hours', '24'),
  ('default_seat_cap', '3')
ON CONFLICT (key) DO NOTHING;
