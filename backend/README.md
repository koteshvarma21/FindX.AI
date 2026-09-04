# FindX.AI — Backend

Node.js + Express + MongoDB (Mongoose) backend for the static HTML/CSS/JavaScript frontend:
`Frontend -> authenticated API -> MongoDB -> AI matching`

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
│   ├── Match.js                    # written by the matching service
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
| POST   | `/api/auth/register`    | Create an account and return a JWT       |
| POST   | `/api/auth/login`       | Authenticate and return a JWT            |
| GET    | `/api/auth/me`          | Fetch the authenticated user             |
| POST   | `/api/ai/follow-up`     | Get structured adaptive item questions   |
| POST   | `/api/ai/analyze-image` | Analyze an uploaded item image           |
| GET    | `/api/ai/health`        | Check Featherless chat and embeddings    |
| POST   | `/api/images/generate`  | Generate an optional item image          |
| POST   | `/api/images/confirm`   | Confirm and store a generated image      |
| POST   | `/api/images/upload`    | Store an uploaded image and return URL   |
| POST   | `/api/found-items`      | Create an authenticated found report    |
| GET    | `/api/found-items`      | List found reports                      |
| GET    | `/api/found-items/:id`  | Fetch one found report                  |
| POST   | `/api/matches/run/:lostItemId` | Run matching for an owned lost report |
| GET    | `/api/matches/lost/:lostItemId` | Get owned report matches          |
| PATCH  | `/api/matches/:matchId/status` | Confirm or reject an owned match  |

| Method | Route                  | Purpose                                 |
|--------|-------------------------|------------------------------------------|
| GET    | `/api/health`           | Liveness + DB connection check           |
| POST   | `/api/lost-items`       | Create a lost item report                |
| GET    | `/api/lost-items`       | List items (optional `?status=active`)   |
| GET    | `/api/lost-items/:id`   | Fetch one item by ID                     |

## 6. Notes

- Report creation and match updates require a JWT.

- Public GET endpoints support browsing; private report and match operations use the authenticated account.
- The project previously used a PostgreSQL `schema.sql`. This has been fully
  replaced by the Mongoose models above per the MongoDB stack in the main
  project README — the old `database/schema.sql` file can be archived or
  removed.
