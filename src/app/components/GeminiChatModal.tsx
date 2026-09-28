import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles, Send, X, Key, ShieldAlert, CheckCircle2, RefreshCw,
  HelpCircle, Bot, User, ExternalLink, Info, AlertTriangle, AlertCircle
} from "lucide-react";
import {
  getGeminiApiKey,
  saveGeminiApiKey,
  isGeminiConfigured,
  askGeminiAI,
  ChatMessage
} from "../../services/geminiService";

interface GeminiChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: string;
}

const SUGGESTIONS = [
  { icon: "💊", label: "Check medication side effects", prompt: "What are common side effects and safety precautions I should know about Paracetamol & Ibuprofen?" },
  { icon: "⏰", label: "What to do if I miss a dose?", prompt: "General medical rule of thumb: What should I do if I miss taking my prescribed morning medicine by 4 hours?" },
  { icon: "🥗", label: "Foods to avoid with meds", prompt: "What foods, beverages, or supplements commonly interact negatively with blood pressure and cholesterol medications?" },
  { icon: "🌿", label: "Daily wellness & hydration", prompt: "Give me 4 simple, practical wellness tips for better sleep hygiene, hydration, and adherence to my medication routine." },
];

export const GeminiChatModal: React.FC<GeminiChatModalProps> = ({
  isOpen,
  onClose,
  language = "English",
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [configured, setConfigured] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isConfig = isGeminiConfigured();
    setConfigured(isConfig);
    setApiKeyInput(getGeminiApiKey());

    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: "welcome-1",
          role: "assistant",
          text: `Hello! 👋 I'm **Nunu AI** powered by Google Gemini.\n\nHow can I help you today with your medications, dosage questions, side effects, or general health guidance?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, isOpen]);

  const handleSaveApiKey = () => {
    saveGeminiApiKey(apiKeyInput);
    const hasKey = isGeminiConfigured();
    setConfigured(hasKey);
    setShowKeyModal(false);
    setErrorMessage(null);
  };

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    if (!isGeminiConfigured()) {
      setShowKeyModal(true);
      return;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    if (!textToSend) setInput("");
    setLoading(true);
    setErrorMessage(null);

    try {
      const aiReplyText = await askGeminiAI(updatedHistory, language);

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: aiReplyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorStr = err?.message || "Failed to communicate with Gemini AI.";
      setErrorMessage(errorStr);

      if (errorStr.toLowerCase().includes("key") || errorStr.toLowerCase().includes("401") || errorStr.toLowerCase().includes("403")) {
        setShowKeyModal(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-3 sm:p-4">
      {/* Main Chat Modal */}
      <div className="relative flex flex-col w-full max-w-2xl h-[88vh] max-h-[720px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden font-sans">

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 text-emerald-100">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white tracking-wide">Nunu AI</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-950/40 text-emerald-200 border border-emerald-400/30">
                  Gemini AI
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 font-medium">
                Medication advice, side effects & health guidance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowKeyModal(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition-all shadow-sm ${
                configured
                  ? "bg-white/20 hover:bg-white/30 text-white border border-white/30"
                  : "bg-amber-500 hover:bg-amber-600 text-white border border-amber-300 animate-bounce"
              }`}
              title="Configure Gemini API Key"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{configured ? "API Key Set" : "Setup Key"}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Key Warning Banner if Not Configured */}
        {!configured && (
          <div className="bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-900/60 px-4 py-2.5 flex items-center justify-between text-xs text-amber-800 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Google Gemini API Key is required to ask questions.</span>
            </div>
            <button
              onClick={() => setShowKeyModal(true)}
              className="font-bold text-amber-900 dark:text-amber-100 underline hover:text-amber-700 ml-2"
            >
              Enter Key
            </button>
          </div>
        )}

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">

          {/* Quick Suggestions Cards (Only shown if 1 welcome msg) */}
          {messages.length <= 1 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
                Suggested Topics
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SUGGESTIONS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(item.prompt)}
                    className="flex items-start gap-3 p-3 text-left bg-white dark:bg-slate-800/90 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm transition-all hover:border-emerald-300 group"
                  >
                    <span className="text-xl p-1 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl group-hover:scale-110 transition-transform">
                      {item.icon}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {item.prompt}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat Messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[82%] sm:max-w-[75%] rounded-3xl px-4 py-3 text-sm shadow-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-emerald-600 text-white rounded-br-none"
                    : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-none"
                }`}
              >
                <div className="whitespace-pre-wrap font-sans">
                  {msg.text}
                </div>
                <div
                  className={`text-[10px] mt-1.5 text-right ${
                    msg.role === "user"
                      ? "text-emerald-200"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>

              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center shadow-md flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {/* Loading state */}
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md flex-shrink-0 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl rounded-bl-none px-4 py-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 shadow-sm">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                <span>Consulting Gemini AI...</span>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Error:</span> {errorMessage}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Medical Disclaimer Footer */}
        <div className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 text-[10px] text-slate-500 dark:text-slate-400 text-center flex items-center justify-center gap-1">
          <Info className="w-3 h-3 text-slate-400 flex-shrink-0" />
          <span>AI suggestions are for informational reference only. Always consult your doctor or pharmacist for medical decisions.</span>
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={configured ? "Ask about side effects, dosage, food interactions..." : "Please configure Gemini API Key first..."}
              disabled={loading}
              className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 border border-transparent dark:border-slate-700 transition-all placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Gemini API Key Configuration Sub-Modal */}
      {showKeyModal && (
        <div className="absolute inset-0 z-60 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 rounded-xl text-emerald-600">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">Gemini API Key</h4>
                  <p className="text-xs text-slate-500">Configure Google AI Studio Key</p>
                </div>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              To use AI medication guidance and side-effect queries, enter your free <strong>Google Gemini API Key</strong> below.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                API Key:
              </label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Don't have a key?</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 font-semibold flex items-center gap-1 hover:underline"
              >
                Get free key from Google AI Studio <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              {apiKeyInput && (
                <button
                  onClick={() => {
                    setApiKeyInput("");
                    saveGeminiApiKey("");
                    setConfigured(false);
                  }}
                  className="px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all"
                >
                  Clear Key
                </button>
              )}
              <button
                onClick={handleSaveApiKey}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all"
              >
                Save & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
