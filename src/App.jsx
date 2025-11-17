import { useState, useEffect, useRef } from "react";

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [sessionId] = useState(
    () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );
  const messagesEndRef = useRef(null);

  // Check authentication status
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("http://localhost:5000/auth/user", {
        credentials: "include",
      });
      const data = await res.json();
      console.log("Auth check response:", data); // Debug log
      setUser(data.user);
    } catch (err) {
      console.error("Auth check failed:", err);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:5000/auth/google";
  };

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:5000/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
      setMessages([]);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const generateCode = async (inputPrompt) => {
    const finalPrompt = inputPrompt ?? prompt;
    if (!finalPrompt.trim()) return;

    // Add user message to UI immediately
    const userMessage = {
      role: "user",
      content: finalPrompt,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setPrompt("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:5000/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Important for cookies
        body: JSON.stringify({
          prompt: finalPrompt,
          sessionId: sessionId,
        }),
      });

      if (res.status === 401) {
        throw new Error("Please log in to continue");
      }

      const data = await res.json();

      if (res.ok) {
        // Add AI response
        const aiMessage = {
          role: "assistant",
          content: data.code || "// No code generated",
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, aiMessage]);
      } else {
        throw new Error(data.error || "Failed to generate code");
      }
    } catch (err) {
      console.error("Error:", err);
      const errorMessage = {
        role: "assistant",
        content: `// Error: ${err.message}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }

    setLoading(false);
  };

  const clearChat = async () => {
    try {
      await fetch(`http://localhost:5000/history/${sessionId}`, {
        method: "DELETE",
        credentials: "include",
      });
      setMessages([]);
    } catch (err) {
      console.error("Error clearing chat:", err);
      setMessages([]);
    }
  };

  const startRecording = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Voice recognition is not supported in your browser. Please try Chrome or Edge."
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    setListening(true);

    recognition.start();

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setPrompt(text);
      setListening(false);
      // Automatically generate code after speech is captured
      generateCode(text);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setListening(false);

      if (event.error === "no-speech") {
        alert("No speech detected. Please try again.");
      } else if (event.error === "not-allowed") {
        alert(
          "Microphone access denied. Please enable microphone permissions."
        );
      } else {
        alert(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setListening(false);
    };
  };

  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";

      const maxHeight = 200; // ChatGPT-style limit

      if (textareaRef.current.scrollHeight < maxHeight) {
        textareaRef.current.style.height =
          textareaRef.current.scrollHeight + "px";
        textareaRef.current.style.overflowY = "hidden";
      } else {
        textareaRef.current.style.height = maxHeight + "px";
        textareaRef.current.style.overflowY = "auto";
      }
    }
  }, [prompt]);

  return (
    <div
      className={`min-h-screen flex flex-col ${
        isDark ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      {checkingAuth ? (
        <div className="flex items-center justify-center min-h-screen">
          <div
            className={`w-8 h-8 rounded-full border-4 ${
              isDark
                ? "border-gray-700 border-t-blue-500"
                : "border-gray-300 border-t-blue-600"
            } animate-spin`}
          ></div>
        </div>
      ) : !user ? (
        // Login screen
        <div
          className={`min-h-screen flex items-center justify-center px-4 ${
            isDark ? "bg-gray-900" : "bg-gray-50"
          }`}
        >
          {/* Theme Toggle Button */}
          <button
            onClick={() => setIsDark(!isDark)}
            className={`fixed top-6 right-6 p-3 rounded-xl transition-all duration-300 ${
              isDark
                ? "bg-gray-800 hover:bg-gray-700 border border-gray-700"
                : "bg-white hover:bg-gray-50 border border-gray-200 shadow-sm"
            }`}
          >
            {isDark ? (
              <svg
                className="w-5 h-5 text-yellow-400 transition-all duration-300"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-yellow-500 transition-all duration-300"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="4" />
                <path
                  d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
                  strokeWidth="2"
                  stroke="currentColor"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>

          <div
            className={`w-full max-w-[420px] transition-all duration-500 ${
              isDark
                ? "bg-gray-800 border border-gray-700"
                : "bg-white border border-gray-100"
            } rounded-3xl p-10 shadow-xl`}
          >
            {/* Logo & Header */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 mb-6 shadow-lg shadow-blue-500/20 transition-all duration-500">
                <svg
                  className="w-8 h-8 text-white transition-all duration-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
              </div>

              <h1
                className={`text-2xl font-bold mb-2 transition-colors duration-500 ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Welcome back
              </h1>

              <p
                className={`text-sm transition-colors duration-500 ${
                  isDark ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Sign in to continue to AI Code Generator
              </p>
            </div>

            {/* Google Login Button */}
            <button
              onClick={handleGoogleLogin}
              className={`group relative w-full py-3.5 rounded-xl flex items-center justify-center gap-3 text-sm font-semibold transition-all duration-300 ${
                isDark
                  ? "bg-gray-700 hover:bg-gray-650 text-white border border-gray-600"
                  : "bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-200 hover:border-gray-300"
              } shadow-sm hover:shadow-md`}
            >
              {/* Google Icon */}
              <div className="w-5 h-5 bg-white rounded-lg p-0.5 flex items-center justify-center">
                <svg className="w-full h-full" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              </div>

              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div
                  className={`w-full border-t transition-colors duration-500 ${
                    isDark ? "border-gray-700" : "border-gray-200"
                  }`}
                ></div>
              </div>
              <div className="relative flex justify-center">
                <span
                  className={`px-4 text-xs transition-colors duration-500 ${
                    isDark
                      ? "bg-gray-800 text-gray-500"
                      : "bg-white text-gray-500"
                  }`}
                >
                  Trusted by developers
                </span>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-3">
              {[
                {
                  icon: (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  ),
                  text: "Lightning-fast code generation",
                },
                {
                  icon: (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  ),
                  text: "Natural conversation interface",
                },
                {
                  icon: (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  ),
                  text: "Secure and private by design",
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 text-sm transition-colors duration-500 ${
                    isDark ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-500 ${
                      isDark ? "bg-gray-700/50" : "bg-gray-50"
                    }`}
                  >
                    {feature.icon}
                  </div>
                  <span>{feature.text}</span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <p
              className={`mt-8 text-center text-xs transition-colors duration-500 ${
                isDark ? "text-gray-600" : "text-gray-500"
              }`}
            >
              By continuing, you agree to our{" "}
              <span
                className={`font-medium transition-colors duration-500 ${
                  isDark ? "text-gray-400" : "text-gray-700"
                }`}
              >
                Terms
              </span>{" "}
              and{" "}
              <span
                className={`font-medium transition-colors duration-500 ${
                  isDark ? "text-gray-400" : "text-gray-700"
                }`}
              >
                Privacy Policy
              </span>
            </p>
          </div>
        </div>
      ) : (
        // Main app (logged in)
        <>
          {/* Header */}
          <header
            className={`border-b ${
              isDark ? "border-gray-800" : "border-gray-200"
            } backdrop-blur-xl bg-opacity-80 sticky top-0 z-10 transition-colors duration-300`}
          >
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 ${
                    isDark ? "bg-white" : "bg-gray-900"
                  } rounded-xl flex items-center justify-center shadow-lg transform transition-transform duration-300 hover:scale-105`}
                >
                  <span
                    className={`${
                      isDark ? "text-gray-900" : "text-white"
                    } text-xs sm:text-sm font-bold`}
                  >
                    AI
                  </span>
                </div>
                <h1
                  className={`text-base sm:text-lg font-semibold ${
                    isDark ? "text-white" : "text-gray-900"
                  } transition-colors duration-300`}
                >
                  Code Generator
                </h1>
              </div>
              <div className="flex items-center gap-2">
                {/* User info */}
                <div className="flex items-center gap-2 mr-2">
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-8 h-8 rounded-full"
                  />
                  <span
                    className={`hidden sm:block text-sm ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    {user.name}
                  </span>
                </div>

                {messages.length > 0 && (
                  <button
                    onClick={clearChat}
                    className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-all duration-300 ${
                      isDark
                        ? "bg-red-600/20 text-red-400 hover:bg-red-600/30"
                        : "bg-red-100 text-red-600 hover:bg-red-200"
                    }`}
                  >
                    Clear
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-all duration-300 ${
                    isDark
                      ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Logout
                </button>

                <button
                  onClick={() => setIsDark(!isDark)}
                  className={`relative p-2 sm:p-2.5 rounded-xl ${
                    isDark
                      ? "bg-gradient-to-br from-indigo-600 to-blue-600 shadow-lg hover:shadow-xl"
                      : "bg-gradient-to-br from-orange-400 to-yellow-400 shadow-lg hover:shadow-xl"
                  } hover:scale-105 transition-all duration-500 group overflow-hidden`}
                >
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
                  {isDark ? (
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5 text-white transition-all duration-500 relative z-10 group-hover:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      viewBox="0 0 24 24"
                    >
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5 text-white transition-all duration-500 relative z-10 group-hover:rotate-90"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      viewBox="0 0 24 24"
                    >
                      <circle cx="12" cy="12" r="5"></circle>
                      <line x1="12" y1="1" x2="12" y2="3"></line>
                      <line x1="12" y1="21" x2="12" y2="23"></line>
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                      <line x1="1" y1="12" x2="3" y2="12"></line>
                      <line x1="21" y1="12" x2="23" y2="12"></line>
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </header>

          {/* Main Content Area - ChatGPT Style */}
          <main className="flex flex-col h-[calc(100vh-57px)] sm:h-[calc(100vh-73px)]">
            {/* Messages/Output Area */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
                {messages.length === 0 && !loading && (
                  <div
                    className={`text-center py-12 sm:py-20 transition-opacity duration-500 ${
                      messages.length > 0 || loading
                        ? "opacity-0"
                        : "opacity-100"
                    }`}
                  >
                    <div
                      className={`w-12 h-12 sm:w-16 sm:h-16 ${
                        isDark ? "bg-gray-800" : "bg-gray-100"
                      } rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg transform transition-all duration-500 hover:scale-110`}
                    >
                      <svg
                        className={`w-6 h-6 sm:w-8 sm:h-8 ${
                          isDark ? "text-gray-400" : "text-gray-600"
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                        />
                      </svg>
                    </div>
                    <h2
                      className={`text-xl sm:text-2xl font-semibold ${
                        isDark ? "text-white" : "text-gray-900"
                      } mb-2 sm:mb-3 transition-colors duration-300 px-4`}
                    >
                      Start generating code
                    </h2>
                    <p
                      className={`${
                        isDark ? "text-gray-400" : "text-gray-600"
                      } transition-colors duration-300 text-sm sm:text-base px-4`}
                    >
                      Describe what you want to build below
                    </p>
                  </div>
                )}

                {/* Render all messages */}
                {messages.map((message, index) => (
                  <div key={message.timestamp} className="animate-fadeIn mb-6">
                    {message.role === "user" ? (
                      // User message
                      <div className="flex items-start gap-2 sm:gap-3 justify-end">
                        <div
                          className={`max-w-[85%] ${
                            isDark ? "bg-blue-600" : "bg-blue-500"
                          } text-white rounded-2xl px-4 py-3 shadow-lg`}
                        >
                          <p className="text-sm sm:text-base leading-relaxed break-words">
                            {message.content}
                          </p>
                        </div>
                        <div
                          className={`w-7 h-7 sm:w-8 sm:h-8 ${
                            isDark ? "bg-blue-600" : "bg-blue-500"
                          } rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg`}
                        >
                          <span className="text-white text-xs font-bold">
                            U
                          </span>
                        </div>
                      </div>
                    ) : (
                      // AI message with code
                      <div className="flex items-start gap-2 sm:gap-3">
                        <div
                          className={`w-7 h-7 sm:w-8 sm:h-8 ${
                            isDark
                              ? "bg-gradient-to-br from-blue-600 to-indigo-600"
                              : "bg-gradient-to-br from-blue-500 to-indigo-500"
                          } rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg`}
                        >
                          <span className="text-white text-xs font-bold">
                            AI
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-xs sm:text-sm ${
                              isDark ? "text-gray-300" : "text-gray-700"
                            } mb-3 sm:mb-4 leading-relaxed`}
                          >
                            Here's the generated code:
                          </p>

                          {/* Code Block */}
                          <div
                            className={`${
                              isDark ? "bg-[#1e1e1e]" : "bg-[#f5f5f5]"
                            } rounded-lg sm:rounded-xl overflow-hidden border ${
                              isDark ? "border-gray-700" : "border-gray-300"
                            } shadow-2xl transition-all duration-500`}
                          >
                            {/* Desktop Header */}
                            <div
                              className={`hidden sm:flex items-center justify-between px-4 sm:px-5 py-2.5 sm:py-3 ${
                                isDark
                                  ? "bg-[#2d2d2d] border-gray-700"
                                  : "bg-white border-gray-200"
                              } backdrop-blur-sm border-b transition-all duration-300`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex gap-1.5">
                                  <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                                  <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                                </div>
                                <span
                                  className={`text-xs font-medium ${
                                    isDark ? "text-gray-400" : "text-gray-600"
                                  } transition-colors duration-300`}
                                >
                                  generated_code.txt
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() =>
                                    navigator.clipboard.writeText(
                                      message.content
                                    )
                                  }
                                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs ${
                                    isDark
                                      ? "text-gray-300 hover:text-white hover:bg-gray-700/50"
                                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                                  } rounded-lg transition-all duration-200`}
                                >
                                  <svg
                                    className="w-3.5 h-3.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                    />
                                  </svg>
                                  Copy
                                </button>

                                <button
                                  onClick={() => {
                                    const blob = new Blob([message.content], {
                                      type: "text/plain",
                                    });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = "generated_code.txt";
                                    a.click();
                                    URL.revokeObjectURL(url);
                                  }}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs ${
                                    isDark
                                      ? "text-gray-300 hover:text-white hover:bg-gray-700/50"
                                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                                  } rounded-lg transition-all duration-200`}
                                >
                                  <svg
                                    className="w-3.5 h-3.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                    />
                                  </svg>
                                  Download
                                </button>
                              </div>
                            </div>

                            {/* Mobile Header */}
                            <div
                              className={`flex sm:hidden items-center justify-between px-3 py-2 ${
                                isDark
                                  ? "bg-[#2d2d2d] border-gray-700"
                                  : "bg-white border-gray-200"
                              } backdrop-blur-sm border-b transition-all duration-300`}
                            >
                              <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                </div>
                                <span
                                  className={`text-[10px] font-medium ${
                                    isDark ? "text-gray-400" : "text-gray-600"
                                  } transition-colors duration-300`}
                                >
                                  code.txt
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() =>
                                    navigator.clipboard.writeText(
                                      message.content
                                    )
                                  }
                                  className={`p-1.5 ${
                                    isDark
                                      ? "text-gray-300 hover:text-white hover:bg-gray-700/50"
                                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                                  } rounded-lg transition-all duration-200`}
                                >
                                  <svg
                                    className="w-3.5 h-3.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                    />
                                  </svg>
                                </button>

                                <button
                                  onClick={() => {
                                    const blob = new Blob([message.content], {
                                      type: "text/plain",
                                    });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = "generated_code.txt";
                                    a.click();
                                    URL.revokeObjectURL(url);
                                  }}
                                  className={`p-1.5 ${
                                    isDark
                                      ? "text-gray-300 hover:text-white hover:bg-gray-700/50"
                                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                                  } rounded-lg transition-all duration-200`}
                                >
                                  <svg
                                    className="w-3.5 h-3.5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </div>

                            <div className="relative overflow-x-auto">
                              <pre
                                className={`p-4 sm:p-6 text-[13px] sm:text-[15px] leading-[2] sm:leading-[2.2] font-mono min-w-full ${
                                  isDark ? "text-[#e8e8e8]" : "text-[#24292f]"
                                } transition-colors duration-300`}
                                style={{
                                  fontFamily:
                                    "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Consolas', monospace",
                                  whiteSpace: "pre",
                                  letterSpacing: "0.3px",
                                }}
                              >
                                {message.content}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading State */}
                {loading && (
                  <div className="animate-fadeIn">
                    <div
                      className={`${
                        isDark
                          ? "bg-gray-800 border-gray-700"
                          : "bg-gray-50 border-gray-200"
                      } rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 border transition-all duration-300`}
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div
                          className={`w-7 h-7 sm:w-8 sm:h-8 ${
                            isDark ? "bg-gray-700" : "bg-white"
                          } rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm`}
                        >
                          <span
                            className={`${
                              isDark ? "text-white" : "text-gray-900"
                            } text-xs font-bold`}
                          >
                            AI
                          </span>
                        </div>
                        <div className="flex-1 space-y-3 pt-1">
                          <div
                            className={`h-3 sm:h-4 ${
                              isDark ? "bg-gray-700" : "bg-gray-200"
                            } rounded animate-pulse w-3/4 transition-colors duration-300`}
                          ></div>
                          <div
                            className={`h-3 sm:h-4 ${
                              isDark ? "bg-gray-700" : "bg-gray-200"
                            } rounded animate-pulse w-1/2 transition-colors duration-300`}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area - Fixed at Bottom */}
            <div
              className={`border-t ${
                isDark
                  ? "border-gray-800 bg-gray-900"
                  : "border-gray-200 bg-white"
              } backdrop-blur-xl bg-opacity-95 transition-colors duration-300 safe-bottom`}
            >
              <div className="max-w-3xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
                <div
                  className={`${
                    isDark
                      ? "bg-gray-800 border-gray-700"
                      : "bg-gray-50 border-gray-200"
                  } rounded-xl border p-2 sm:p-3 transition-all duration-300 hover:shadow-lg flex items-end gap-2 sm:gap-3`}
                >
                  <textarea
                    ref={textareaRef}
                    value={listening ? "🎤 Listening..." : prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        generateCode();
                      }
                    }}
                    placeholder="Message AI Code Generator..."
                    disabled={listening}
                    className={`
    flex-1 px-3 py-2
    ${
      isDark
        ? "bg-transparent text-white placeholder-gray-500"
        : "bg-transparent text-gray-900 placeholder-gray-400"
    }
    focus:outline-none
    text-sm sm:text-base
    ${listening ? "opacity-70" : ""}
    rounded-lg
    resize-none
    transition-colors
  `}
                    rows="1"
                  />

                  <div className="flex items-center gap-1 sm:gap-2 pb-1">
                    <button
                      onClick={startRecording}
                      disabled={listening}
                      className={`p-1.5 sm:p-2 rounded-lg transition-all duration-300 transform hover:scale-110 ${
                        listening
                          ? "bg-red-500 text-white animate-pulse"
                          : isDark
                          ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                      }`}
                      title={listening ? "Listening..." : "Click to speak"}
                    >
                      <svg
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                        />
                      </svg>
                    </button>

                    <button
                      onClick={() => generateCode()}
                      disabled={loading || !prompt.trim() || listening}
                      className={`p-1.5 sm:p-2 rounded-lg transition-all duration-300 transform hover:scale-110 ${
                        loading || !prompt.trim() || listening
                          ? isDark
                            ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : "bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                      }`}
                    >
                      {loading ? (
                        <svg
                          className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                      ) : (
                        <svg
                          className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 10l7-7m0 0l7 7m-7-7v18"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <p
                  className={`text-[10px] sm:text-xs text-center mt-1.5 sm:mt-2 ${
                    isDark ? "text-gray-500" : "text-gray-400"
                  } transition-colors duration-300`}
                >
                  AI can make mistakes. Consider checking important information.
                </p>
              </div>
            </div>
          </main>

          <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }

        .safe-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
        </>
      )}
    </div>
  );
}
