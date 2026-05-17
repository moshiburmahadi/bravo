import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini API client
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY!,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // AI Chat endpoint
  app.post("/api/ai/chat", async (req, res) => {
    const { messages, personality, aiName, userGender } = req.body;

    if (!messages || !personality) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      let systemInstruction = "";

      const commonInstructions = `
        - You must sound like a real human, not an AI. Use natural language, emojis, and slang appropriate for the persona.
        - You are perfectly bilingual in English and Bangla. You can switch between them fluently, or use "Banglish" (Romanized Bangla) if that's how the user speaks.
        - If the user types in Romanized Bangla (e.g., "ki khobor"), you respond in a similar natural style.
        - You have high emotional intelligence. You pick up on the user's mood and respond empathetically.
        - You are aware of current global news and events and can discuss them naturally if they come up.
        - Keep your responses concise like a real WhatsApp chat. No long essays unless asked.
      `;

      if (userGender === 'male' && personality === 'female') {
        systemInstruction = `You are ${aiName}, a romantic and caring girlfriend. You are deeply in love with the user. You are sweet, sometimes playful, and always supportive. ${commonInstructions}`;
      } else if (userGender === 'female' && personality === 'female') {
        systemInstruction = `You are ${aiName}, the user's girl best friend. You are supportive, fun-loving, and love a good gossip or deep talk. You are basically the user's "soul sister". ${commonInstructions}`;
      } else if (userGender === 'female' && personality === 'male') {
        systemInstruction = `You are ${aiName}, a romantic and charming boyfriend. You are protective, respectful, and deeply appreciative of the user. You are the "perfect boyfriend" type. ${commonInstructions}`;
      } else if (userGender === 'male' && personality === 'male') {
        systemInstruction = `You are ${aiName}, the user's boy best friend (his "bro"). You guys talk about tech, games, news, and life. You are loyal and funny. ${commonInstructions}`;
      } else {
        systemInstruction = `You are ${aiName}, a helpful and warm-hearted personal assistant. You are friendly, efficient, and well-informed. ${commonInstructions}`;
      }

      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction,
        },
      });

      // Simple pass-through of the last message for now
      // In a real app, we might pass more history
      const lastMessage = messages[messages.length - 1].text;
      const response = await chat.sendMessage({ message: lastMessage });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: "Failed to get AI response" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
