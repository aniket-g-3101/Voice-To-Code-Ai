import { useState } from "react";

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [isDark, setIsDark] = useState(false);
  

  const generateCode = async (inputPrompt) => {
    const finalPrompt = inputPrompt ?? prompt;
    if (!finalPrompt.trim()) return;

    setLoading(true);
    setCode("");

    try {
      const res = await fetch("http://localhost:5000/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt }),
      });

      const data = await res.json();
      setCode(data.code || "");
    } catch (err) {
      setCode("// Error generating code");
    }

    setLoading(false);
  };

  const startRecording = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Voice not supported");

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    setPrompt("Listening...");
    setListening(true);
    recognition.start();

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setPrompt(text);
      generateCode(text);
    };

    recognition.onerror = () => setPrompt("");
    recognition.onend = () => setListening(false);
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-white'} transition-colors duration-300`}>
      {/* Header */}
      <header className={`border-b ${isDark ? 'border-gray-800' : 'border-gray-200'} backdrop-blur-xl bg-opacity-80 sticky top-0 z-10 transition-colors duration-300`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`w-8 h-8 sm:w-9 sm:h-9 ${isDark ? 'bg-white' : 'bg-gray-900'} rounded-xl flex items-center justify-center shadow-lg transform transition-transform duration-300 hover:scale-105`}>
              <span className={`${isDark ? 'text-gray-900' : 'text-white'} text-xs sm:text-sm font-bold`}>AI</span>
            </div>
            <h1 className={`text-base sm:text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'} transition-colors duration-300`}>Code Generator</h1>
          </div>
          <button
            onClick={() => setIsDark(!isDark)}
            className={`relative p-2 sm:p-2.5 rounded-xl ${isDark ? 'bg-gradient-to-br from-indigo-600 to-blue-600 shadow-lg hover:shadow-xl' : 'bg-gradient-to-br from-orange-400 to-yellow-400 shadow-lg hover:shadow-xl'} hover:scale-105 transition-all duration-500 group overflow-hidden`}
          >
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
            {isDark ? (
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white transition-all duration-500 relative z-10 group-hover:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white transition-all duration-500 relative z-10 group-hover:rotate-90" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
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
      </header>

      {/* Main Content Area - ChatGPT Style */}
      <main className="flex flex-col h-[calc(100vh-57px)] sm:h-[calc(100vh-73px)]">
        {/* Messages/Output Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
            {!code && !loading && (
              <div className={`text-center py-12 sm:py-20 transition-opacity duration-500 ${code || loading ? 'opacity-0' : 'opacity-100'}`}>
                <div className={`w-12 h-12 sm:w-16 sm:h-16 ${isDark ? 'bg-gray-800' : 'bg-gray-100'} rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg transform transition-all duration-500 hover:scale-110`}>
                  <svg className={`w-6 h-6 sm:w-8 sm:h-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <h2 className={`text-xl sm:text-2xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-2 sm:mb-3 transition-colors duration-300 px-4`}>
                  Start generating code
                </h2>
                <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} transition-colors duration-300 text-sm sm:text-base px-4`}>
                  Describe what you want to build below
                </p>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="animate-fadeIn">
                <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-4 border transition-all duration-300`}>
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 ${isDark ? 'bg-gray-700' : 'bg-white'} rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <span className={`${isDark ? 'text-white' : 'text-gray-900'} text-xs font-bold`}>AI</span>
                    </div>
                    <div className="flex-1 space-y-3 pt-1">
                      <div className={`h-3 sm:h-4 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded animate-pulse w-3/4 transition-colors duration-300`}></div>
                      <div className={`h-3 sm:h-4 ${isDark ? 'bg-gray-700' : 'bg-gray-200'} rounded animate-pulse w-1/2 transition-colors duration-300`}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Code Output */}
            {code && !loading && (
              <div className="animate-fadeIn space-y-4">
                {/* AI Response Header */}
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 ${isDark ? 'bg-gradient-to-br from-blue-600 to-indigo-600' : 'bg-gradient-to-br from-blue-500 to-indigo-500'} rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg`}>
                    <span className="text-white text-xs font-bold">AI</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-3 sm:mb-4 leading-relaxed`}>
                      Here's the generated code based on your request:
                    </p>
                    
                    {/* Code Block */}
                    <div className={`${isDark ? 'bg-[#1e1e1e]' : 'bg-[#f5f5f5]'} rounded-lg sm:rounded-xl overflow-hidden border ${isDark ? 'border-gray-700' : 'border-gray-300'} shadow-2xl transition-all duration-500`}>
                      {/* Desktop Header */}
                      <div className={`hidden sm:flex items-center justify-between px-4 sm:px-5 py-2.5 sm:py-3 ${isDark ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200'} backdrop-blur-sm border-b transition-all duration-300`}>
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                          </div>
                          <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'} transition-colors duration-300`}>generated_code.txt</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => navigator.clipboard.writeText(code)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs ${isDark ? 'text-gray-300 hover:text-white hover:bg-gray-700/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'} rounded-lg transition-all duration-200`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy
                          </button>

                          <button
                            onClick={() => {
                              const blob = new Blob([code], { type: "text/plain" });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = "generated_code.txt";
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs ${isDark ? 'text-gray-300 hover:text-white hover:bg-gray-700/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'} rounded-lg transition-all duration-200`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download
                          </button>

                          <button
                            onClick={() => setCode("")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs ${isDark ? 'text-gray-300 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-600 hover:text-red-600 hover:bg-red-50'} rounded-lg transition-all duration-200`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Clear
                          </button>
                        </div>
                      </div>
                      

                      {/* Mobile Header */}
                      <div className={`flex sm:hidden items-center justify-between px-3 py-2 ${isDark ? 'bg-[#2d2d2d] border-gray-700' : 'bg-white border-gray-200'} backdrop-blur-sm border-b transition-all duration-300`}>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          </div>
                          <span className={`text-[10px] font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'} transition-colors duration-300`}>code.txt</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => navigator.clipboard.writeText(code)}
                            className={`p-1.5 ${isDark ? 'text-gray-300 hover:text-white hover:bg-gray-700/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'} rounded-lg transition-all duration-200`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>

                          <button
                            onClick={() => {
                              const blob = new Blob([code], { type: "text/plain" });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = "generated_code.txt";
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                            className={`p-1.5 ${isDark ? 'text-gray-300 hover:text-white hover:bg-gray-700/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'} rounded-lg transition-all duration-200`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>

                          <button
                            onClick={() => setCode("")}
                            className={`p-1.5 ${isDark ? 'text-gray-300 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-600 hover:text-red-600 hover:bg-red-50'} rounded-lg transition-all duration-200`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <div className="relative overflow-x-auto">
                        <pre className={`p-4 sm:p-6 text-[13px] sm:text-[15px] leading-[2] sm:leading-[2.2] font-mono min-w-full ${isDark ? 'text-[#e8e8e8]' : 'text-[#24292f]'} transition-colors duration-300`} style={{ fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Consolas', monospace", whiteSpace: 'pre', letterSpacing: '0.3px' }}>
{code}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Area - Fixed at Bottom */}
        <div className={`border-t ${isDark ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'} backdrop-blur-xl bg-opacity-95 transition-colors duration-300 safe-bottom`}>
          <div className="max-w-3xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
            <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-xl border p-2 sm:p-3 transition-all duration-300 hover:shadow-lg flex items-end gap-2 sm:gap-3`}>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    generateCode();
                  }
                }}
                placeholder="Message AI Code Generator..."
                className={`flex-1 p-2 ${isDark ? 'bg-transparent text-white placeholder-gray-500' : 'bg-transparent text-gray-900 placeholder-gray-400'} focus:outline-none resize-none transition-colors duration-300 max-h-32 text-sm sm:text-base`}
                rows="1"
              />

              <div className="flex items-center gap-1 sm:gap-2 pb-1">
                <button
                  onClick={startRecording}
                  disabled={listening}
                  className={`p-1.5 sm:p-2 rounded-lg transition-all duration-300 transform hover:scale-110 ${
                    listening
                      ? "bg-red-500 text-white"
                      : isDark
                      ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  }`}
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>

                <button
                  onClick={() => generateCode()}
                  disabled={loading || !prompt.trim()}
                  className={`p-1.5 sm:p-2 rounded-lg transition-all duration-300 transform hover:scale-110 ${
                    loading || !prompt.trim()
                      ? isDark
                        ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                  }`}
                >
                  {loading ? (
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            
            <p className={`text-[10px] sm:text-xs text-center mt-1.5 sm:mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'} transition-colors duration-300`}>
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
    </div>
  );
}