# FindX.AI — Backend

Node.js + Express + MongoDB (Mongoose). Handles the `lost-items` flow end to end:
`Frontend form -> POST /api/lost-items -> validate -> insert into MongoDB -> return ID`

## 1. Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` — at minimum set `MONGODB_URI` (a local `mongod`, Docker container, or
MongoDB Atlas connection string all work).

## 2. Run the server

```bash
npm run dev      # auto-restarts on file changes
# or
npm start
```

Mongoose creates the `findx_ai` database and its collections automatically the
first time you write to them — no separate migration step needed.

Check it's alive: `curl http://localhost:5000/api/health`

## 3. Test the endpoint

```bash
curl -X POST http://localhost:5000/api/lost-items \
  -H "Content-Type: application/json" \
  -d '{
    "contact_email": "student@example.com",
    "description": "Black leather wallet with a red stripe",
    "last_seen_location": "Library, 2nd floor",
    "last_seen_lat": 17.4123,
    "last_seen_lng": 78.4456,
    "discovered_lost_at": "2026-09-04T10:30:00Z",
    "travel_path": [
      { "location": "Hostel", "time": "2026-09-04T09:00:00Z" },
      { "location": "Canteen", "time": "2026-09-04T09:30:00Z" },
      { "location": "Library", "time": "2026-09-04T10:00:00Z" }
    ]
  }'
```

## 4. Project layout

```
backend/
├── server.js                       # entry point — connects Mongo, mounts routes
├── package.json
├── .env.example
├── models/
│   ├── User.js                     # reporter/security identity (by email)
│   ├── LostItem.js                 # Search Item page reports
│   ├── FoundItem.js                # Found Items page reports
│   ├── Match.js                    # written by the matching AI / CCTV module
│   └── MailLog.js                  # audit trail, prevents duplicate emails
├── controllers/
│   └── lostItemsController.js
├── routes/
│   └── lostItems.js
└── middleware/
    ├── validateLostItem.js         # request validation, runs before the controller
    └── errorHandler.js             # catches unhandled errors -> clean JSON response
```

## 5. API surface (current)

| Method | Route                  | Purpose                                 |
|--------|-------------------------|------------------------------------------|
| GET    | `/api/health`           | Liveness + DB connection check           |
| POST   | `/api/lost-items`       | Create a lost item report                |
| GET    | `/api/lost-items`       | List items (optional `?status=active`)   |
| GET    | `/api/lost-items/:id`   | Fetch one item by ID                     |

## 6. How your teammates plug in

- **Found Items page teammate**: copy `models/FoundItem.js` (already scaffolded),
  `routes/lostItems.js` and `controllers/lostItemsController.js` as a template,
  rename to `foundItems.js` / `foundItemsController.js`, and mount it in
  `server.js` as `/api/found-items`.

- **Matching AI / CCTV teammate**: give them `GET /api/lost-items?status=active`
  and `GET /api/found-items?status=active` to pull the current queues, plus a
  `POST /api/matches` endpoint (add it the same way, using the `Match` model
  already scaffolded in `models/Match.js`) that they call with
  `{ lost_item, found_item, image_similarity_score, match_source }` whenever
  their model finds a hit.

- **Mail service**: watch the `Match` collection for new `pending` docs
  (`Match.find({ match_status: 'pending' })` on a simple polling interval is
  enough for a hackathon), send email using `EMAIL_USER` / `EMAIL_PASSWORD`
  via Nodemailer, then update `match_status` and write a `MailLog` entry so
  nothing gets emailed twice.

- **Frontend teammate**: just needs the routes table above and the JSON shape
  in step 3 — no MongoDB knowledge required.

## 7. Notes

- No authentication yet — the reporter is identified purely by email, and a
  `User` document is auto-created (via an atomic upsert) the first time that
  email is seen. Fine for a hackathon demo; flag it as a known limitation if
  judges ask.
- The project previously used a PostgreSQL `schema.sql`. This has been fully
  replaced by the Mongoose models above per the MongoDB stack in the main
  project README — the old `database/schema.sql` file can be archived or
  removed.
