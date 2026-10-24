# Work Delegation Dashboard

Squad 3's staffing dashboard: who has which skills, who has room, and who wants which work. It matches engineers to new projects that come in from the Monday board.

```
 Browser ──▶ web (React + IBM Carbon, nginx :8080) ──/api──▶ api (Node + Express :8080) ──▶ db (PostgreSQL 16)
                                                                   │  ▲
                                                 GraphQL + write-back │  │ webhooks
                                                                   ▼  │
                                                              Monday board
```

| Tier | Folder | What it does |
|---|---|---|
| Frontend | `frontend/` | React 18 + `@carbon/react` (g10 light / g100 dark). nginx serves the build and proxies `/api`. |
| Backend | `backend/` | Express REST API. Handles roles and permissions, ranks candidates, syncs Monday, and posts to Slack. |
| Database | `db/` | PostgreSQL schema migrations, reference data, and an optional demo seed. |

## Run it

You need Docker with Compose v2.24 or later.

```bash
cp .env.example .env        # optional; the defaults run on demo data
docker compose up --build
```

Open http://localhost:8080. Dev sign-in shows a **Viewing as** switch at the top of the page:
- Pick **Kalia** to see the engagement lead screens: Team, Staff a project, Projects, Monday board.
- Pick any engineer to see My profile and Open projects.

### Without Docker

Requires Node 20+ and a PostgreSQL 16 database.

```bash
# API
cd backend && npm install
DATABASE_URL=postgres://delegation:delegation@localhost:5432/delegation SEED_DEMO=true npm run dev

# Web (in a second terminal; proxies /api to localhost:8080)
cd frontend && npm install && npm run dev      # http://localhost:5173
```

The API applies migrations on startup. `npm run migrate` runs them on their own.

Backend unit tests: `cd backend && npm test`.

## Features (from meetings 1 and 2)

**Engineer profile**
- 1–5 self-rating per skill, with evidence of how it was applied.
- Each skill is marked as client work or learning (with L1–L4 badges).
- Manager review: changing a rating or its source sends it back to *Pending*. Leads click **Confirm**.
- Growth areas are mapped to a learning path (the "YL" item), with a suggested project to shadow.
- Product interests and professional goals.
- Current and on-hold projects come from Monday.

**Availability**
- One-click 5-step scale: Open → Light load → Some room → Stretched → Full.
- A "nothing changed" check-in button.
- Overdue check-ins are flagged based on the cadence setting (weekly, every 2 weeks, or monthly).

**Bandwidth**
- On-hold projects are listed but don't count as busy.
- Shadows are open and untracked; resources take a seat and count against bandwidth.

**Staffing a project**
- Required skills autofill from the product type and can be edited.
- A seat cap limits who joins the kickoff call.
- Candidates are ranked by fit: 60% required-skill ratings, 30% availability, 10% interest. Unconfirmed ratings count at 80%.
- Filters: minimum rating, minimum availability, raised hand only.
- A Slack placement notice, with optional write-back to Monday.

**Interest window**
- New projects open a window (24 h by default) for engineers to raise a hand.
- Late interest gets a message telling them to contact the lead.

**Skill visibility**
- Ratings are visible to leads only by default.
- One setting switches them to visible for all of Squad 3. This is still an open question from meeting 1.

**Skills required per role**
- Shown on the Team page and as "fit for role" on each profile.

## Connecting the Monday board

1. **Get a token.** In Monday, open the avatar menu → Developers → My access tokens. The account must be a member; viewers can't use the API. Put the token in `MONDAY_API_TOKEN`.
2. **Set the board.** Put the number after `/boards/` in the board URL in `MONDAY_BOARD_ID`. Restart the API.
3. **Map columns.** On the dashboard's **Monday board** page, click **Look up board column IDs**. Copy the IDs into the `MONDAY_COL_*` variables:
   - client
   - product type
   - status
   - people
   - timeline
   - seat cap (optional)
4. **Map status labels.** Set `MONDAY_STATUS_PROGRESS`, `_HOLD` and `_DONE` to your board's exact labels. Any other label counts as a new project and opens an interest window.
5. **Match people.** Engineers are matched to Monday users by work email. Each person needs a dashboard profile, which a lead can add with `POST /api/people`.
6. **Turn on real-time updates.** Deploy somewhere Monday can reach over https. Set `MONDAY_WEBHOOK_SECRET`, then on the Monday board page enter the public address and click **Register webhooks**.
   - This subscribes to item created, column changed, archived and deleted.
   - Instead, you can add "send a webhook" automations in Monday's Automations Center that point at `https://<your-host>/api/monday/webhook?secret=<secret>`.

**How the sync behaves**
- A full sync runs every `MONDAY_SYNC_MINUTES` minutes as a safety net.
- Each webhook re-reads its item from the API rather than trusting the event body.
- Monday owns: projects, status, timeline, and who is assigned (the People column).
- The dashboard owns: skills, availability, interests, goals and interest windows.
- Write-back merges into the People column. It replaces only dashboard engineers and keeps anyone else on the item (PMs, teams).

## Production checklist

- **Sign-in.** Set `AUTH_MODE=proxy` and put an SSO proxy in front of the web tier, such as IBM App ID or oauth2-proxy. The proxy must set `X-Forwarded-Email` (or whatever `AUTH_HEADER` names) and strip any value the browser sends.
  - Never expose the API directly; it trusts that header.
  - Dev mode trusts whoever the browser claims to be.
- **Real data.**
  - Turn `SEED_DEMO` off.
  - Edit `db/migrations/002_reference_data.sql`, or add a `003_*.sql`, with your real skills, product types, roles and learning paths.
  - Add people with `POST /api/people`.
- **Database.** Use a managed Postgres, such as IBM Cloud Databases for PostgreSQL, with `DB_SSL=true`.
- **Slack.** Set `SLACK_WEBHOOK_URL` to an incoming webhook for placement notices.

### Deploying to IBM Cloud Code Engine

```bash
ibmcloud cr login
docker build -f backend/Dockerfile -t us.icr.io/<namespace>/delegation-api .
docker build -t us.icr.io/<namespace>/delegation-web frontend
docker push us.icr.io/<namespace>/delegation-api && docker push us.icr.io/<namespace>/delegation-web

ibmcloud ce project create --name work-delegation
ibmcloud ce secret create --name delegation-env --from-env-file .env      # include DATABASE_URL and DB_SSL=true
ibmcloud ce app create --name delegation-api --image us.icr.io/<namespace>/delegation-api --port 8080 --min-scale 1 \
  --env-from-secret delegation-env --visibility project
ibmcloud ce app get --name delegation-api        # note its internal (project) URL
ibmcloud ce app create --name delegation-web --image us.icr.io/<namespace>/delegation-web --port 8080 \
  --env API_URL=<internal URL of delegation-api>
```

Notes:
- Keep `--min-scale 1` on the API so the scheduled Monday sync keeps running.
- Images in a private registry need a registry access secret (`ibmcloud ce registry create --help`).
- Check flags against `ibmcloud ce app create --help` for your CLI version.

## API

Every route except health, the webhook and dev users needs a signed-in user. "Lead" means only leads and managers can call it.

| Method & path | Who | Purpose |
|---|---|---|
| `GET /api/me` | anyone | Your full profile |
| `GET /api/engineers` | anyone | Engineers with load and check-in status. Others' skills are hidden unless allowed. |
| `GET /api/engineers/:id` | anyone | One profile |
| `PATCH /api/engineers/:id` | self or lead | `availability` (counts as a check-in), `goals`, `onboarded` |
| `POST /api/engineers/:id/checkin` | self or lead | Check in without changes |
| `PUT /api/engineers/:id/skills/:skill` | self or lead | `rating`, `kind`, `badge`, `evidence` |
| `DELETE /api/engineers/:id/skills/:skill` | self or lead | Remove a skill |
| `POST /api/engineers/:id/skills/:skill/confirm` | lead | Manager review |
| `PUT /api/engineers/:id/interests` | self or lead | Replace product interests with an array |
| `PUT /api/engineers/:id/growth` | self or lead | Replace growth areas with an array |
| `POST /api/people` | lead | Add a person (`email`, `name`, `role`, `isLead`, `isEngineer`) |
| `GET /api/projects?status=` | anyone | Projects with team, required skills and raised hands |
| `PATCH /api/projects/:id` | lead | `seatCap`, `requiredSkills`, `resetSkills` |
| `GET /api/projects/:id/candidates` | lead | Ranked by fit. Filters: `minRating`, `minAvailability`, `raisedHandOnly` |
| `POST /api/projects/:id/assignments` | lead | Place someone: `{ personId, kind: "resource" \| "shadow" }`. Enforces the seat cap. |
| `DELETE /api/projects/:id/assignments/:personId` | lead | Remove from the team |
| `POST` / `DELETE /api/projects/:id/interest` | engineer | Raise or withdraw a hand |
| `GET /api/projects/:id/notice` | lead | Preview the Slack message |
| `POST /api/projects/:id/notify` | lead | Post to Slack and optionally write back to Monday (`writeBack`) |
| `GET /api/reference` | anyone | Skills, product types, role requirements |
| `GET` / `PATCH /api/settings` | anyone / lead | `skill_visibility`, `checkin_days`, `interest_window_hours`, `default_seat_cap` |
| `GET /api/monday/status`, `GET /api/monday/events` | anyone | Connection state and activity log |
| `POST /api/monday/sync` | lead | Full sync now |
| `GET /api/monday/columns` | lead | Board column IDs |
| `POST /api/monday/webhooks/register` | lead | Subscribe board events to `publicUrl` |
| `POST /api/monday/webhook` | Monday | Webhook receiver (answers Monday's challenge) |

## Project layout

```
db/
  migrations/001_init.sql            schema
  migrations/002_reference_data.sql  skills, product types, roles, learning paths
  seed/demo.sql                      fictional demo data (SEED_DEMO=true)
backend/src/
  index.js        server, startup migrations, scheduled sync
  auth.js         identity (dev or proxy), lead checks
  routes/         people.js, projects.js, admin.js (reference, settings, Monday, webhook)
  services/       monday.js, scoring.js, people.js, projects.js, notify.js
frontend/src/
  App.jsx         Carbon UI shell, navigation by role
  pages/          Team, StaffProject, Projects, MondayBoard, MyProfile, OpenProjects, EngineerModal
  components.jsx  availability meter, rating input, stats, tags
```

## Still open (from the meetings)

- Who can see skill ratings. This is a setting today, defaulting to leads only.
- How often engineers check in. Also a setting today.
- Slack bot or email for new-project alerts. Only Slack placement notices are built so far; there are no new-project alerts yet.
- One Slack channel per project or individual messages. Today it posts one message through the incoming webhook.
- Link to Squad 2's skills assessment tool. Ceasar was going to find it; its rubric could replace the reference data.
