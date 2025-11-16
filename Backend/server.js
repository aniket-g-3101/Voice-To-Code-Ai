import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Store chat histories per session (in production, use a proper database)
const chatHistories = new Map();

app.post("/generate", async (req, res) => {
  try {
    const { prompt, sessionId = "default" } = req.body;

    if (!prompt || prompt.trim() === "") {
      return res.status(400).json({ error: "Prompt is required" });
    }

    // Get or create chat history for this session
    if (!chatHistories.has(sessionId)) {
      chatHistories.set(sessionId, []);
    }
    const history = chatHistories.get(sessionId);

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
      history: history // Return full conversation history
    });
  } catch (err) {
    console.error("Groq error:", err);
    return res.status(500).json({
      error: "Groq API error",
      details: err.error?.error?.message || err.message,
    });
  }
});

// Get chat history for a session
app.get("/history/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const history = chatHistories.get(sessionId) || [];
  res.json({ history });
});

// Clear chat history for a session
app.delete("/history/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  chatHistories.delete(sessionId);
  res.json({ message: "History cleared" });
});

app.get("/", (req, res) => {
  res.send("Groq backend is running successfully");
});

app.listen(5000, () => console.log("Backend running on port 5000"));