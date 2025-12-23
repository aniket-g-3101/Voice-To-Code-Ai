import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";
import Groq from "groq-sdk";

dotenv.config();

/* =========================
   ENV VALIDATION (CRITICAL)
========================= */

if (!process.env.JWT_SECRET) {
  throw new Error("❌ JWT_SECRET is missing in environment variables");
}
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("❌ Google OAuth env vars missing");
}

const app = express();

/* =========================
   BASIC MIDDLEWARE
========================= */

app.use(express.json());

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* =========================
   PASSPORT GOOGLE OAUTH
========================= */

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL}/auth/google/callback`,
    },
    (accessToken, refreshToken, profile, done) => {
      try {
        const user = {
          id: profile.id,
          email: profile.emails?.[0]?.value,
          name: profile.displayName,
          picture: profile.photos?.[0]?.value,
        };
        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

app.use(passport.initialize());

/* =========================
   JWT HELPERS
========================= */

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

/* =========================
   GROQ SETUP
========================= */

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/* =========================
   IN-MEMORY CHAT STORE
========================= */

const chatHistories = new Map();

/* =========================
   AUTH ROUTES
========================= */

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/" }),
  (req, res) => {
    const token = generateToken(req.user);
    res.redirect(`${process.env.FRONTEND_URL}?token=${token}`);
  }
);

/* =========================
   PROTECTED ROUTES
========================= */

app.post("/generate", verifyToken, async (req, res) => {
  try {
    const { prompt, sessionId = "default" } = req.body;

    if (!prompt?.trim()) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const key = `${req.user.id}_${sessionId}`;
    if (!chatHistories.has(key)) chatHistories.set(key, []);

    const history = chatHistories.get(key);
    history.push({ role: "user", content: prompt });

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content:
            "You are a coding assistant. Generate clean beginner-friendly code only.",
        },
        ...history,
      ],
      temperature: 0.1,
    });

    const code = completion.choices[0].message.content;
    history.push({ role: "assistant", content: code });

    if (history.length > 20) history.splice(0, history.length - 20);

    res.json({ code });
  } catch (err) {
    console.error("Generate error:", err);
    res.status(500).json({ error: "AI generation failed" });
  }
});

app.get("/history/:sessionId", verifyToken, (req, res) => {
  const key = `${req.user.id}_${req.params.sessionId}`;
  res.json({ history: chatHistories.get(key) || [] });
});

app.delete("/history/:sessionId", verifyToken, (req, res) => {
  const key = `${req.user.id}_${req.params.sessionId}`;
  chatHistories.delete(key);
  res.json({ message: "History cleared" });
});

/* =========================
   HEALTH CHECK
========================= */

app.get("/", (_, res) => {
  res.send("✅ Backend running with JWT auth");
});

/* =========================
   START SERVER
========================= */

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
