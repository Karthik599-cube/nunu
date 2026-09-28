/**
 * EasyDose Google Gemini API Service
 * Handles API key management and direct communication with Google Gemini 1.5 Flash models
 */

const STORAGE_KEY = "EASYDOSE_GEMINI_API_KEY";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
}

/**
 * Retrieves the active Gemini API Key from localStorage or environment variables.
 */
export const getGeminiApiKey = (): string => {
  const localKey = localStorage.getItem(STORAGE_KEY);
  if (localKey && localKey.trim() !== "") {
    return localKey.trim();
  }
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey && typeof envKey === "string" && envKey.trim() !== "") {
    return envKey.trim();
  }
  return "";
};

/**
 * Saves a new Gemini API key to localStorage.
 */
export const saveGeminiApiKey = (key: string): void => {
  if (key && key.trim() !== "") {
    localStorage.setItem(STORAGE_KEY, key.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
};

/**
 * Returns true if an API key is configured.
 */
export const isGeminiConfigured = (): boolean => {
  return getGeminiApiKey().length > 0;
};

const SYSTEM_INSTRUCTION = `You are "Nunu AI", an expert, empathetic, and highly accurate AI healthcare and medication assistant embedded in the Nunu mobile app.
Your goals:
1. Provide accurate information about medications, dosages, potential side effects, food/drug interactions, and missed dose guidance.
2. Provide general wellness advice, hydration tips, sleep hygiene, and healthy lifestyle guidance.
3. Keep answers clear, structured, and easy to read using markdown bullet points and bold highlights.
4. If a user asks about urgent medical symptoms (e.g. chest pain, severe allergic reaction, breathing difficulty), urge them to contact emergency services (like 911/108) or consult their healthcare professional immediately.
5. Always maintain a warm, encouraging tone.
6. Provide answers in the language requested by the user or default to English.`;

/**
 * Sends a conversation history or prompt to Google Gemini API.
 */
export const askGeminiAI = async (
  promptOrHistory: string | ChatMessage[],
  language: string = "English"
): Promise<string> => {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    throw new Error("Gemini API key is not configured. Please add your API key in Settings or Chat Modal.");
  }

  // Format contents array for Gemini API
  let contents: any[] = [];

  if (typeof promptOrHistory === "string") {
    contents = [
      {
        role: "user",
        parts: [{ text: `[Language Context: Please respond in ${language}]\n\n${promptOrHistory}` }],
      },
    ];
  } else {
    contents = promptOrHistory.map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    }));

    // Append language instruction to the last message if user message
    if (contents.length > 0 && contents[contents.length - 1].role === "user") {
      const lastText = contents[contents.length - 1].parts[0].text;
      contents[contents.length - 1].parts[0].text = `[Language Preference: ${language}]\n\n${lastText}`;
    }
  }

  const requestBody = {
    system_instruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }],
    },
    contents: contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1000,
    },
  };

  // Supported model candidates order
  const modelCandidates = [
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-2.5-flash",
    "gemini-1.5-flash"
  ];

  let lastErrorMessage = "";

  for (const model of modelCandidates) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData?.error?.message || `Status ${response.status}`;

        if (response.status === 401 || response.status === 403) {
          throw new Error(`Invalid or unauthorized Gemini API Key (${response.status}). Please check your API key.`);
        }

        // If 404 model not found, try next model candidate
        if (response.status === 404) {
          lastErrorMessage = msg;
          continue;
        }

        throw new Error(msg);
      }

      const data = await response.json();
      const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!candidateText) {
        throw new Error("No text content returned from Gemini API.");
      }

      return candidateText;
    } catch (err: any) {
      if (err.message?.includes("Invalid or unauthorized")) {
        throw err;
      }
      lastErrorMessage = err.message;
    }
  }

  throw new Error(lastErrorMessage || "Failed to reach supported Gemini model endpoints.");
};
