# MAIN-UI — Frontend + Express API

React SPA + Express backend. Frontend deployed on Vercel, backend on Render.

## Stack
- **Frontend**: React 19 + Vite 8, React Router 7, Supabase auth, Fortune Sheet, AG Grid, Recharts, Framer Motion
- **Backend**: Node.js + Express 5, MongoDB (Mongoose), Supabase, Agenda.js, Nodemailer

## Local Development
```bash
npm install        # installs frontend deps + runs postinstall for server deps
npm run dev        # starts both frontend (5173) and backend (5000) via concurrently
```

## Environment Variables

### Frontend (Vercel)
| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_API_URL` | Express backend URL (e.g. `https://your-render-app.onrender.com`) |
| `VITE_RUST_API_URL` | Rust engine URL (e.g. `https://rust-engine.onrender.com`) |

### Backend (Render)
| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `CORS_ORIGINS` | Comma-separated allowed origins (e.g. `https://your-app.vercel.app`) |
| `GOOGLE_CLIENT_ID` | For email OAuth2 (optional) |
| `GOOGLE_CLIENT_SECRET` | For email OAuth2 (optional) |
| `GOOGLE_REFRESH_TOKEN` | For email OAuth2 (optional) |
| `GOOGLE_EMAIL` | For email OAuth2 (optional) |

## Deploy
- **Frontend**: Vercel — build command `npm run build`, output `dist/`
- **Backend**: Render — start command `npm start` (runs `cd server && node index.js`)

