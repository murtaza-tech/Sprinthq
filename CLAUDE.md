# Sprint Planner - Project Instructions

## Frontend Design Rule
**ALWAYS use the `frontend-design` skill when creating or modifying any frontend file.** This includes:
- Any file inside `client/src/` (pages, components, styles, utilities)
- Any `.jsx`, `.css`, `.html` file
- Any UI-related code changes, no matter how small

Invoke the skill via: `Skill: frontend-design` before writing any frontend code.

## Tech Stack
- **Frontend:** React (Vite) + React Router — `client/`
- **Backend:** Node.js + Express — `server/`
- **Database:** SQLite via `better-sqlite3`
- **Auth:** `iron-session` + `bcrypt`
- **Styling:** Plain CSS with CSS custom properties (dark theme)

## Design System
- **Fonts:** Sora (headings), JetBrains Mono (data/numbers)
- **Theme:** Dark navy palette — backgrounds `#060a14` → `#0f1628`, primary accent `#22d3ee` (cyan)
- **Colors:** Cyan (primary), Green (success/done), Blue (in-progress), Purple (in-review), Amber (warning), Red (danger)
- **All CSS variables are defined in `client/src/index.css` under `:root`**

## Project Structure
```
client/src/
  ├── App.jsx              # Router + auth state
  ├── main.jsx             # Entry point
  ├── index.css            # Global styles + design tokens
  ├── pages/               # Route-level components
  ├── components/          # Shared UI components
  └── utils/               # Helpers, mock data
server/
  ├── index.js             # Express entry
  ├── db.js                # SQLite setup
  ├── session.js           # iron-session config
  └── routes/              # API route handlers
```

## Key Files
- Scope document: `SCOPE.md`
- Mock data (to be replaced by API): `client/src/utils/mockData.js`
- Design tokens / CSS variables: `client/src/index.css`

## Dev Workflow
- `npm run dev` from root starts both client (5173) and server (3001)
- Vite proxies `/api` requests to the backend
