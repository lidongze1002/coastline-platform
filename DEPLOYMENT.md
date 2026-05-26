## Runtime Requirements
- Node.js: 22.x (recommended)
- MongoDB: 6.x / 7.x / 8.x (local install or Docker)

## Project Structure
- `backend/` — Express + MongoDB (users, auth, datasets, GeoJSON upload)
- `frontend/` — Vue 3 + Element Plus + ArcGIS Maps SDK for JS (`@arcgis/core` 5.0.x)
- `data/` — Sample coastline GeoJSON files (used for seeding)

## 1. Start MongoDB
Make sure `mongodb://127.0.0.1:27017` is available.

Docker example:

```bash
docker run -d --name mongo -p 27017:27017 mongo:7
```

## 2. Start the Backend (port 3001)
Inside `backend/`:

1) Copy and configure the environment file:
   - Copy `backend/.env.example` to `backend/.env`

2) Install dependencies:

```bash
npm install
```

3) Seed the database and start:

```bash
npm run seed
npm run dev
```

Health check: `GET http://localhost:3001/api/health`

## 3. Start the Frontend (port 5173)
Inside `frontend/`:

1) Copy `frontend/.env.example` to `frontend/.env`
2) Install dependencies and start:

```bash
npm install
npm run dev
```

Open: `http://localhost:5173`

### What each command does?
- **`npm install`** — Installs all dependencies listed in `package.json` (required on first setup or when dependencies change)
- **`npm run seed`** — Writes demo accounts + demo data to MongoDB (coastlines, global reference coastlines, monitoring stations and historical records)
- **`npm run dev`**:
  - Backend: Starts the Express server (provides APIs for login, datasets, comments, monitoring stations)
  - Frontend: Starts the Vite dev server (hot-reload, easy debugging)

## 4. Test Accounts
After running `npm run seed` in `backend/`, the following accounts are created:

- Admin: `admin / admin123`
