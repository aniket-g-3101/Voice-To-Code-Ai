import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();

// CORS configuration - allow credentials
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Allow anyway for development
    }
  },
  credentials: true
}));

app.use(express.json());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || "your-secret-key-change-this",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' // Important for OAuth redirects
  }
}));

app.use(passport.initialize());
app.use(passport.session());

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Store users (in production, use a proper database)
const users = new Map();

// Store chat histories per user
const chatHistories = new Map();

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:5000/auth/google/callback"
  },
  (accessToken, refreshToken, profile, done) => {
    // Store user info
    const user = {
      id: profile.id,
      email: profile.emails[0].value,
      name: profile.displayName,
      picture: profile.photos[0].value
    };
    
    users.set(profile.id, user);
    return done(null, user);
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  const user = users.get(id);
  done(null, user);
});

// Middleware to check authentication
const isAuthenticated = (req, res, next) => {
  console.log('Auth check - Session:', req.session);
  console.log('Auth check - User:', req.user);
  console.log('Auth check - isAuthenticated:', req.isAuthenticated());
  
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized - Please log in" });
};

// Auth routes
app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "http://localhost:5173" }),
  (req, res) => {
    // Successful authentication
    res.redirect("http://localhost:5173");
  }
);

app.get("/auth/user", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.json({ user: null });
  }
});

app.post("/auth/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }
    res.json({ message: "Logged out successfully" });
  });
});

// Protected generate endpoint
app.post("/generate", isAuthenticated, async (req, res) => {
  try {
    const { prompt, sessionId = "default" } = req.body;
    const userId = req.user.id;

    if (!prompt || prompt.trim() === "") {
      return res.status(400).json({ error: "Prompt is required" });
    }

    // Use user-specific session ID
    const userSessionId = `${userId}_${sessionId}`;

    // Get or create chat history for this user session
    if (!chatHistories.has(userSessionId)) {
      chatHistories.set(userSessionId, []);
    }
    const history = chatHistories.get(userSessionId);

    // Add user message to history
    history.push({
      role: "user",
      content: prompt,
    });

    // Build messages array with system prompt + history
    const messages = [
      {
        role: "system",
        content:
          "You are a coding assistant. Generate simple beginner-friendly code. \
           No explanations unless the user asks. \
           If the user asks questions like 'who made you', 'who developed you', or 'who is your master', \
           then respond with: 'I was created by developer named Aniket Gavali.' \
           For all other prompts, do not mention Aniket Gavali."
      },
      ...history
    ];

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: messages,
      temperature: 0.1,
    });

    const code = completion.choices[0].message.content;

    // Add assistant response to history
    history.push({
      role: "assistant",
      content: code,
    });

    // Keep only last 20 messages to avoid context length issues
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    return res.json({ 
      code,
      history: history
    });
  } catch (err) {
    console.error("Groq error:", err);
    return res.status(500).json({
      error: "Groq API error",
      details: err.error?.error?.message || err.message,
    });
  }
});

// Get chat history for a user session
app.get("/history/:sessionId", isAuthenticated, (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;
  const userSessionId = `${userId}_${sessionId}`;
  const history = chatHistories.get(userSessionId) || [];
  res.json({ history });
});

// Clear chat history for a user session
app.delete("/history/:sessionId", isAuthenticated, (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user.id;
  const userSessionId = `${userId}_${sessionId}`;
  chatHistories.delete(userSessionId);
  res.json({ message: "History cleared" });
});

app.get("/", (req, res) => {
  res.send("Groq backend with Google Auth is running successfully");
});

app.listen(5000, () => console.log("Backend running on port 5000"));