import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";

dotenv.config();

const app = express();

/* =========================
   BASIC MIDDLEWARE
========================= */

app.use(express.json());

/* =========================
   CORS (REQUIRED FOR COOKIES)
========================= */

app.use(
  cors({
    origin: process.env.FRONTEND_URL, // Vercel frontend
    credentials: true,
  })
);

/* =========================
   SESSION CONFIG
========================= */

app.use(
  session({
    name: "voice-to-code-session",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,        // HTTPS only (Render + Vercel)
      httpOnly: true,
      sameSite: "none",    // REQUIRED for cross-domain cookies
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

/* =========================
   PASSPORT SETUP
========================= */

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL}/auth/google/callback`,
    },
    (accessToken, refreshToken, profile, done) => {
      const user = {
        id: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        picture: profile.photos[0].value,
      };
      return done(null, user);
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

/* =========================
   GROQ SETUP
========================= */

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/* =========================
   IN-MEMORY STORES (DEMO)
========================= */

const chatHistories = new Map();

/* =========================
   AUTH MIDDLEWARE
========================= */

const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: "Unauthorized" });
};

/* =========================
   AUTH ROUTES
========================= */

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: process.env.FRONTEND_URL }),
  (req, res) => {
    res.redirect(process.env.FRONTEND_URL);
  }
);

app.get("/auth/user", (req, res) => {
  res.json({ user: req.user || null });
});

app.post("/auth/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.clearCookie("voice-to-code-session");
      res.json({ message: "Logged out" });
    });
  });
});

/* =========================
   AI GENERATION ROUTE
========================= */

app.post("/generate", isAuthenticated, async (req, res) => {
  try {
    const { prompt, sessionId = "default" } = req.body;

    if (!prompt?.trim()) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const userSessionId = `${req.user.id}_${sessionId}`;

    if (!chatHistories.has(userSessionId)) {
      chatHistories.set(userSessionId, []);
    }

    const history = chatHistories.get(userSessionId);

    history.push({ role: "user", content: prompt });

    const messages = [
      {
        role: "system",
        content:
          "You are a coding assistant. Generate clean beginner-friendly code only. No explanation unless asked.",
      },
      ...history,
    ];

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages,
      temperature: 0.1,
    });

    const code = completion.choices[0].message.content;

    history.push({ role: "assistant", content: code });

    if (history.length > 20) history.splice(0, history.length - 20);

    res.json({ code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI generation failed" });
  }
});

/* =========================
   CHAT HISTORY ROUTES
========================= */

app.get("/history/:sessionId", isAuthenticated, (req, res) => {
  const key = `${req.user.id}_${req.params.sessionId}`;
  res.json({ history: chatHistories.get(key) || [] });
});

app.delete("/history/:sessionId", isAuthenticated, (req, res) => {
  const key = `${req.user.id}_${req.params.sessionId}`;
  chatHistories.delete(key);
  res.json({ message: "History cleared" });
});

/* =========================
   HEALTH CHECK
========================= */

app.get("/", (req, res) => {
  res.send("Voice-to-Code backend is running");
});

/* =========================
   START SERVER (RENDER)
========================= */

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
