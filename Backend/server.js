import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";

dotenv.config();

const app = express();
app.set("trust proxy", 1); // 🔴 REQUIRED FOR RENDER

/* =========================
   BASIC MIDDLEWARE
========================= */

app.use(express.json());

/* =========================
   CORS
========================= */

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
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
    proxy: true, // 🔴 REQUIRED
    cookie: {
      secure: true,
      httpOnly: true,
      sameSite: "none",
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
      done(null, user);
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

/* =========================
   GROQ
========================= */

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/* =========================
   MEMORY STORE (DEMO)
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
  passport.authenticate("google", {
    failureRedirect: process.env.FRONTEND_URL,
  }),
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
   AI GENERATION
========================= */

app.post("/generate", isAuthenticated, async (req, res) => {
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
    console.error(err);
    res.status(500).json({ error: "AI generation failed" });
  }
});

/* =========================
   HISTORY
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
   HEALTH
========================= */

app.get("/", (req, res) => {
  res.send("Voice-to-Code backend is running");
});

/* =========================
   START SERVER
========================= */

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
