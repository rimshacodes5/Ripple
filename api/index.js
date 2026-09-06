require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenAI, Type } = require('@google/genai');

const app = express();

app.use(cors());
app.use(express.json());

const missionSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Short, inspiring title for the act of generosity." },
    estimatedTime: { type: Type.STRING, description: "e.g., '30 minutes' or '15-20 mins'" },
    cost: { type: Type.STRING, description: "e.g., '$0' or minimal cost" },
    whyItFits: { type: Type.STRING, description: "1-2 sentence concise explanation connecting user input to this act." },
    steps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3 clear, practical, immediate action steps."
    }
  },
  required: ["title", "estimatedTime", "cost", "whyItFits", "steps"]
};

app.post('/api/generate-mission', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        success: false, 
        error: "GEMINI_API_KEY environment variable is not set on Vercel." 
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const { availableTime, skills, resources, cause, budget, preference } = req.body;

    const prompt = `
      You are the backend engine for "Ripple", an application that transforms a user's current resources into small, tangible acts of generosity.
      Create a realistic, actionable micro-mission based on these constraints:
      - Available Time: ${availableTime || 'Any'}
      - Skills/Abilities: ${skills || 'General helping'}
      - Belongings/Resources: ${resources || 'None specified'}
      - Cause/Interest: ${cause || 'Community / General'}
      - Budget: ${budget || '$0'}
      - Location Preference: ${preference || 'Online/Flexible'}

      Rules:
      1. Do NOT suggest simply donating money to large national charities unless specifically requested.
      2. Keep steps focused on realistic micro-actions the user can start TODAY.
      3. Focus on quality, non-overwhelming, warm micro-tasks.
    `;

    let response;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: missionSchema,
            temperature: 0.7
          }
        });
        break; 

      } catch (err) {
        const is503 = err.status === 503 || (err.message && err.message.includes('503'));
        if (is503 && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        } else {
          throw err;
        }
      }
    }

    const missionData = JSON.parse(response.text);
    res.json({ success: true, mission: missionData });

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to generate mission." });
  }
});

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Ripple Server Active on http://localhost:${PORT}`);
  });
}