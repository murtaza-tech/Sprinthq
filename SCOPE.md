# Sprint Planner - Product Scope Document

## Mission Statement

**Make sprint planning effortless, visual, and stakeholder-friendly.**

Sprint Planner transforms raw Jira CSV exports into a clean, digestible sprint dashboard that lets:
- **Business stakeholders** understand the sprint goal, progress, and risks in under 5 minutes
- **Project managers** plan sprints with capacity awareness, drill into epics/tasks, and spot risks before they become blockers

No Jira expertise required. No complex tooling. Upload a CSV, set your team's capacity, and get a dashboard that tells the story of your sprint.

---

## Problem Statement

1. **Jira is too noisy for stakeholders** - Business leaders don't need 47 filters and swimlanes. They need: what's the goal, are we on track, and what are the risks.
2. **Sprint planning is scattered** - PMs juggle Jira boards, spreadsheets, and slide decks to communicate sprint scope. There's no single, clean view.
3. **Capacity planning is manual** - Comparing total story points against team capacity requires mental math or a separate spreadsheet.
4. **Risk signals are hidden** - Unestimated tickets, unassigned work, and over-capacity situations aren't surfaced until it's too late.

---

## Core User Flows

### Flow 1: Create a Sprint
```
PM logs in
  -> Clicks "New Sprint"
  -> Enters sprint metadata:
       - Sprint name (e.g., "Sprint 24 - Q1 Launch")
       - Sprint goal (free text, one-liner)
       - Start date & end date
  -> Adds team members:
       - Name
       - Role / tech stack (Frontend, Backend, QA, etc.)
       - Capacity (in story points for this sprint)
  -> Uploads Jira CSV export
  -> Dashboard is generated
```

### Flow 2: View Sprint Dashboard (Stakeholder View)
```
User opens sprint link
  -> Sees sprint header (name, goal, date range)
  -> Sees KPI cards at a glance:
       - Total stories
       - Total story points
       - Completed points
       - Unestimated count
  -> Sees capacity bar (committed vs. available)
  -> Sees status breakdown (To Do / In Progress / In Review / Done)
  -> Sees risk signals (unestimated, unassigned, over-capacity)
  -> Sees epics listed as cards with progress
```

### Flow 3: Drill Into Epics (PM View)
```
PM clicks an epic card
  -> Sees all stories/tasks under that epic
  -> Each task shows: key, summary, assignee, status, story points
  -> Can sort/filter by status or assignee
```

---

## Dashboard Anatomy (Based on Reference)

### Header Section
| Element | Description |
|---|---|
| Sprint title | "Sprint 24 - Q1 Launch" |
| Sprint goal | One-liner describing the sprint objective |
| Date range | Start date -> End date (e.g., 2026-02-16 -> 2026-02-27) |

### KPI Cards (Row 1)
| Card | What it shows | Source |
|---|---|---|
| Total Stories | Count of all issues in CSV | Count of rows |
| Story Points | Sum of all story points | Sum of `Story Points` column |
| Completed | Points marked as Done | Sum of points where status = Done |
| Unestimated | Stories with no points | Count where story points is blank/0 |

### Insight Widgets (Row 2)

**Capacity Widget**
- Shows: committed points / total team capacity
- Progress bar (green if under, red/warning if over)
- Warning text when over capacity (e.g., "Over capacity by 2 points")

**Status Breakdown**
- Horizontal stacked bar showing proportions
- Legend: To Do, In Progress, In Review, Done (with counts)
- Colors: grey, blue, purple, green

**Risk Signals**
- Unestimated: count of stories with no story points
- Unassigned: count of stories with no assignee
- Over capacity: how many points over team capacity
- Each shown with severity coloring (yellow/red)

### Epics Section (Row 3)
- Card per epic, showing:
  - Epic key (e.g., PAY-100)
  - Epic name (e.g., "Payment Gateway")
  - Story count and total points
  - Completion percentage with progress bar
  - Color-coded status dot
- Clicking a card opens the epic detail view (list of individual tasks)

---

## Data Model

### Sprint
| Field | Type | Description |
|---|---|---|
| id | int | Primary key |
| name | string | Sprint name |
| goal | string | Sprint goal (one-liner) |
| start_date | date | Sprint start |
| end_date | date | Sprint end |
| created_by | int | FK to users |
| created_at | datetime | Timestamp |

### Team Member
| Field | Type | Description |
|---|---|---|
| id | int | Primary key |
| sprint_id | int | FK to sprint |
| name | string | Member name |
| role | string | Tech stack / role (Frontend, Backend, QA, etc.) |
| capacity | int | Story points this person can handle in the sprint |

### Task (parsed from Jira CSV)
| Field | Type | Description |
|---|---|---|
| id | int | Primary key |
| sprint_id | int | FK to sprint |
| issue_key | string | Jira key (e.g., PAY-101) |
| summary | string | Task title |
| status | string | To Do / In Progress / In Review / Done |
| story_points | int | Nullable - 0 or blank means unestimated |
| assignee | string | Team member name (nullable) |
| epic_key | string | Parent epic key (e.g., PAY-100) |
| epic_name | string | Parent epic name (e.g., "Payment Gateway") |
| issue_type | string | Story / Task / Bug / Sub-task |
| priority | string | Highest / High / Medium / Low |

---

## Expected Jira CSV Columns

The CSV parser should map these standard Jira export columns:

| Jira Column | Maps To |
|---|---|
| Issue key | issue_key |
| Summary | summary |
| Status | status |
| Story Points / Story point estimate | story_points |
| Assignee | assignee |
| Custom field (Epic Link) / Epic Link | epic_key |
| Custom field (Epic Name) / Epic Name | epic_name |
| Issue Type | issue_type |
| Priority | priority |

The parser should be lenient - handle missing columns gracefully, normalize status values, and skip header variations.

---

## Computed Dashboard Metrics

All derived from stored task data + team capacity:

| Metric | Computation |
|---|---|
| Total stories | `COUNT(tasks)` |
| Total story points | `SUM(story_points)` |
| Completed points | `SUM(story_points) WHERE status = 'Done'` |
| Unestimated count | `COUNT WHERE story_points IS NULL OR story_points = 0` |
| Unassigned count | `COUNT WHERE assignee IS NULL OR assignee = ''` |
| Team capacity | `SUM(team_members.capacity)` |
| Over capacity | `total_story_points - team_capacity` (if positive) |
| Status breakdown | `GROUP BY status, COUNT + SUM(points)` |
| Per-epic stats | `GROUP BY epic_key: count, sum(points), completion %` |

---

## Pages & Navigation

| Page | URL | Purpose |
|---|---|---|
| Home | `/` | Landing page, list of sprints |
| Login | `/login` | Auth (already built) |
| New Sprint | `/sprints/new` | Multi-step sprint creation form |
| Sprint Dashboard | `/sprints/:id` | The main dashboard view |
| Epic Detail | `/sprints/:id/epics/:key` | Task-level drill-down for an epic |

---

## Scope Boundaries

### In Scope (v1)
- User authentication (login/signup) - already built
- Sprint creation with metadata + team members + CSV upload
- CSV parsing and data storage
- Sprint dashboard with all widgets from reference design
- Epic drill-down view with task list
- Multiple sprints per user
- Dark-themed UI matching the reference

### Out of Scope (v1)
- Direct Jira API integration (CSV only for now)
- Real-time sync / auto-refresh from Jira
- Sprint editing after creation (re-upload CSV to update)
- Team management across sprints (teams are per-sprint)
- Export/share dashboard as PDF or link
- Role-based access (all logged-in users can see all sprints)
- Sprint velocity tracking across multiple sprints
- Notifications or alerts

---

## Tech Stack (Already Set Up)

| Layer | Technology |
|---|---|
| Frontend | React (Vite) + React Router |
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Auth | iron-session + bcrypt |
| CSV Parsing | `papaparse` (to be added) |
| Styling | CSS (dark theme) |

---

## Success Criteria

1. A PM can go from CSV upload to a complete dashboard in under 2 minutes
2. A stakeholder can understand sprint scope, progress, and risks within 5 minutes of looking at the dashboard
3. Risk signals (unestimated, unassigned, over-capacity) are immediately visible without clicking into anything
4. Epic-level drill-down gives PMs the detail they need without leaving the app
