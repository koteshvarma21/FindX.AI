# FindX.AI — Image Generation + Auth/DB Additions

Drop these into your existing repo, matching the folder paths shown.

## 1. Install backend packages
```
cd backend
npm install openai mongoose bcryptjs jsonwebtoken cors dotenv express
```

## 2. Set environment variables
Copy `backend/.env.example` to `backend/.env` and fill in:
- `MONGODB_URI` — from MongoDB Atlas (or local MongoDB)
- `OPENAI_API_KEY` — from https://platform.openai.com/api-keys
- `JWT_SECRET` — any long random string

## 3. Wire up server.js
If you already have `backend/server.js`, add these lines instead of replacing your file:
```js
const authRoutes = require("./routes/auth");
const imageRoutes = require("./routes/images");
app.use("/api/auth", authRoutes);
app.use("/api/images", imageRoutes);
```
Make sure `express.json({ limit: "10mb" })` is used (generated images are base64 and need a bigger body limit than the default).

## 4. Frontend
```
cd frontend
```
No extra npm packages needed — `client.js` uses the built-in `fetch`.
Add a route to `GenerateImagePage` and `AuthPage` in your router (e.g. React Router):
```jsx
<Route path="/generate" element={<GenerateImagePage />} />
<Route path="/auth" element={<AuthPage onAuthSuccess={(user) => console.log(user)} />} />
```
Optionally set `REACT_APP_API_URL` in a frontend `.env` if your backend isn't on `localhost:5000`.

## How the accuracy flow works
1. User types a description → `POST /api/images/generate` → OpenAI (`gpt-image-1`) returns an image.
2. User rates accuracy 0–100 on a slider.
3. If **< 60**: user is asked what to improve → the feedback is appended to the prompt and a new image is generated (loops back to step 2).
4. If **>= 60**: `POST /api/images/confirm` saves the description, image, accuracy, and feedback history to MongoDB via the `GeneratedImage` model.

## Security notes
- Passwords are hashed with bcrypt before being saved — the raw password is never stored.
- `.env` is where all secrets (Mongo URI, OpenAI key, JWT secret) live — make sure it's in `.gitignore` and never committed.
- Auth is optional on the image routes (so anonymous users can still try it) but required to be logged in for the image to be linked to a specific account.
