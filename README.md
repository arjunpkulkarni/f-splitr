# f-splitr

React Native (Expo) client for the SPLTR / WealthSplit bill-splitting app. It talks to the Python API in [B-SPLTR](https://github.com/arjunpkulkarni/B-SPLTR) (FastAPI).

## What is in this repository

- **`ReactNativeApp/`** — Expo app: `App.js` (navigation stacks), `src/contexts/AuthContext.js` (session + phone/email auth), `src/services/api.js` (axios client, interceptors, `auth`, `dashboard`, `bills`, `notifications`, etc.), and screens under `src/screens/` (e.g. Login, Signup, Dashboard).
- **Configuration** — `ReactNativeApp/app.json`, `package.json`; dev API base URL is chosen in `api.js` (e.g. localhost / emulator hosts).
- **Relationship to backend** — Auth tokens are stored via secure storage; API responses are normalized in the axios layer (`response.data`), with `unwrap()` used where the backend returns `{ success, data, error }` envelopes.

## Recent work (main)

Single navigator entry in `App.js`, one consolidated `api.js` module, AuthContext aligned with `unwrap`/`authApi`, Login/Signup error display for `ApiError`, and `DashboardScreen.js` repaired (imports at top level, one `TopAppBar` with notifications + logout).
