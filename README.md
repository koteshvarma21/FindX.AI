# FindX.AI

FindX.AI is a static HTML/CSS/JavaScript lost-and-found frontend backed by Express, MongoDB, JWT authentication, and optional Featherless AI services.

## 1. Install backend packages
```
cd backend
npm install
```

## 2. Set environment variables
Copy `backend/.env.example` to `backend/.env` and fill in:
- `MONGODB_URI` — from MongoDB Atlas (or local MongoDB)
- `AI_API_KEY` — Featherless API key for chat, embeddings, and vision when supported
- `AI_BASE_URL`, `AI_MODEL`, `AI_VISION_MODEL`, `AI_EMBEDDING_MODEL` — see `backend/.env.example`
- `OPENAI_API_KEY` — optional `gpt-image-1` representative image generation
- `JWT_SECRET` — any long random string

## 3. Run the application
```bash
cd backend
node server.js
```
Serve `frontend/` with any local static server. The primary UI is not React.

## 4. Frontend
No build step is required. Open the static pages through a local web server so browser requests can reach the backend.

## How the accuracy flow works
1. User types a description → adaptive AI questions → optional `POST /api/images/generate`.
2. User rates accuracy 0–100 on a slider.
3. If **< 60**: user is asked what to improve → the feedback is appended to the prompt and a new image is generated (loops back to step 2).
4. If **>= 60**: `POST /api/images/confirm` saves the description, image, accuracy, and feedback history to MongoDB via the `GeneratedImage` model.

## Security notes
- Passwords are hashed with bcrypt before being saved — the raw password is never stored.
- `.env` is where all secrets (Mongo URI, AI key, JWT secret) live — make sure it's in `.gitignore` and never committed.
- Lost and found creation plus match status updates require JWT authentication. Confirmed images are stored as URLs rather than base64 in MongoDB.
- Uploaded-image analysis uses `AI_VISION_MODEL`; representative image generation uses OpenAI `gpt-image-1`; local image storage is isolated in `backend/services/imageStorage.js` for later Cloudinary/S3 replacement.
