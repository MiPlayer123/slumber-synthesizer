"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  Star,
  Hash,
  Sparkles,
  ChevronRight,
  HeartPulse,
} from "lucide-react";

export function DreamAnalysis() {
  const [activeTab, setActiveTab] = useState("analysis");

  const dreamAnalysis = {
    summary:
      "This dream reflects a sense of vulnerability in a public space, symbolized by the library and the accidental sharing of your screen. The incident of being kicked out may represent your fear of not meeting expectations, especially in an academic setting. The use of technology indicates a clash between your personal interests (Reddit) and societal or institutional pressures. Overall, the dream may suggest an internal struggle between wanting to explore your interests freely while feeling constrained by external judgments.",
    themes: [
      { name: "embarrassment", rating: 3 },
      { name: "public scrutiny", rating: 4 },
      { name: "technology and connectivity", rating: 3 },
      { name: "academic pressure", rating: 5 },
    ],
    symbols: [
      {
        name: "Library",
        description: "Represents knowledge, order, and academic expectations",
      },
      {
        name: "Screen sharing",
        description: "Symbolizes unwanted exposure of private thoughts",
      },
      {
        name: "Reddit",
        description: "Represents personal interests and online community",
      },
    ],
    emotions: [
      { name: "embarrassment", intensity: 80 },
      { name: "anxiety", intensity: 65 },
      { name: "confusion", intensity: 40 },
    ],
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-xl"
    >
      <div className="relative">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full filter blur-3xl -translate-y-1/2 translate-x-1/2 z-0"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full filter blur-3xl translate-y-1/2 -translate-x-1/2 z-0"></div>

        <div className="relative z-10 p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 p-2 rounded-lg">
                <Brain className="w-6 h-6 text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-white/80 text-transparent bg-clip-text">
                Dream Analysis
              </h2>
            </div>
            <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-300" />
              <span>AI Powered</span>
            </div>
          </div>

          <div className="flex overflow-x-auto gap-2 pb-4 mb-8 scrollbar-hide">
            <button
              onClick={() => setActiveTab("analysis")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full whitespace-nowrap transition-all duration-300 focus:outline-none focus-visible:ring-0 focus:ring-0 outline-none ${
                activeTab === "analysis"
                  ? "bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white shadow-lg border border-white/10"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Brain className="w-4 h-4" />
              <span>Analysis</span>
            </button>
            <button
              onClick={() => setActiveTab("themes")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full whitespace-nowrap transition-all duration-300 focus:outline-none focus-visible:ring-0 focus:ring-0 outline-none ${
                activeTab === "themes"
                  ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-white shadow-lg border border-white/10"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Hash className="w-4 h-4" />
              <span>Themes & Symbols</span>
            </button>
            <button
              onClick={() => setActiveTab("emotions")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full whitespace-nowrap transition-all duration-300 focus:outline-none focus-visible:ring-0 focus:ring-0 outline-none ${
                activeTab === "emotions"
                  ? "bg-gradient-to-r from-cyan-500/20 to-green-500/20 text-white shadow-lg border border-white/10"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <HeartPulse className="w-4 h-4" />
              <span>Emotional Landscape</span>
            </button>
          </div>

          {activeTab === "analysis" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              <div className="p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/5 shadow-inner">
                <p className="text-white/90 leading-relaxed">
                  {dreamAnalysis.summary}
                </p>
              </div>

              <div className="mt-6">
                <div className="flex items-center gap-3 mb-5">
                  <h3 className="text-xl font-medium">Key Insights</h3>
                  <div className="h-px flex-grow bg-gradient-to-r from-purple-500/30 to-transparent"></div>
                </div>
                <ul className="space-y-4">
                  <motion.li
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-start gap-3 bg-gradient-to-r from-purple-500/10 to-transparent p-4 rounded-lg"
                  >
                    <div className="shrink-0 mt-1 bg-purple-500/20 p-1.5 rounded-full">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                    </div>
                    <span className="text-white/90">
                      Your feelings of embarrassment may be connected to deeper
                      concerns about how others perceive you.
                    </span>
                  </motion.li>
                  <motion.li
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-start gap-3 bg-gradient-to-r from-blue-500/10 to-transparent p-4 rounded-lg"
                  >
                    <div className="shrink-0 mt-1 bg-blue-500/20 p-1.5 rounded-full">
                      <Sparkles className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="text-white/90">
                      The library setting suggests you value knowledge but feel
                      pressure to meet academic standards.
                    </span>
                  </motion.li>
                  <motion.li
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-start gap-3 bg-gradient-to-r from-cyan-500/10 to-transparent p-4 rounded-lg"
                  >
                    <div className="shrink-0 mt-1 bg-cyan-500/20 p-1.5 rounded-full">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                    </div>
                    <span className="text-white/90">
                      Consider how you balance personal interests with external
                      expectations in your waking life.
                    </span>
                  </motion.li>
                </ul>
              </div>
            </motion.div>
          )}

          {activeTab === "themes" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-8"
            >
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <h3 className="text-xl font-medium">Themes</h3>
                  <div className="h-px flex-grow bg-gradient-to-r from-blue-500/30 to-transparent"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dreamAnalysis.themes.map((theme, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10 hover:border-white/20 transition-all hover:shadow-lg group"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-white/90 group-hover:text-white transition-colors">
                          #{theme.name}
                        </span>
                        <div className="flex">
                          {[...Array(5)].map((_, starIndex) => (
                            <Star
                              key={starIndex}
                              className={`w-4 h-4 ${
                                starIndex < theme.rating
                                  ? "text-purple-400 fill-purple-400"
                                  : "text-white/20"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="mt-3 h-1 bg-gradient-to-r from-purple-500/40 to-blue-500/40 rounded-full"></div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-5">
                  <h3 className="text-xl font-medium">Symbols</h3>
                  <div className="h-px flex-grow bg-gradient-to-r from-blue-500/30 to-transparent"></div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {dreamAnalysis.symbols.map((symbol, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="bg-gradient-to-br from-white/10 to-white/5 p-5 rounded-xl border border-white/10 hover:border-white/20 transition-all hover:shadow-lg"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="bg-gradient-to-r from-purple-500/30 to-blue-500/30 p-2 rounded-lg shadow-sm">
                          <Hash className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-medium text-lg text-white">
                          {symbol.name}
                        </span>
                      </div>
                      <p className="text-sm text-white/80 ml-9">
                        {symbol.description}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "emotions" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-8"
            >
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <h3 className="text-xl font-medium">Emotional Landscape</h3>
                  <div className="h-px flex-grow bg-gradient-to-r from-cyan-500/30 to-transparent"></div>
                </div>
                <div className="space-y-6 p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/5">
                  {dreamAnalysis.emotions.map((emotion, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="space-y-2"
                    >
                      <div className="flex justify-between text-sm items-center">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              emotion.name === "embarrassment"
                                ? "bg-red-400"
                                : emotion.name === "anxiety"
                                  ? "bg-yellow-400"
                                  : "bg-blue-400"
                            }`}
                          ></div>
                          <span className="font-medium text-white">
                            {emotion.name}
                          </span>
                        </div>
                        <span className="text-white/70 font-mono bg-white/5 px-2 py-0.5 rounded">
                          {emotion.intensity}%
                        </span>
                      </div>
                      <div className="h-3 bg-white/10 rounded-full overflow-hidden shadow-inner">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${emotion.intensity}%` }}
                          transition={{
                            duration: 1,
                            delay: 0.2 + i * 0.1,
                            ease: "easeOut",
                          }}
                          className={`h-full ${
                            emotion.name === "embarrassment"
                              ? "bg-gradient-to-r from-red-500 to-red-400"
                              : emotion.name === "anxiety"
                                ? "bg-gradient-to-r from-yellow-500 to-yellow-400"
                                : "bg-gradient-to-r from-blue-500 to-blue-400"
                          }`}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-br from-white/10 to-white/5 p-6 rounded-xl border border-white/10 shadow-lg"
              >
                <div className="flex items-center gap-3 mb-3">
                  <HeartPulse className="w-5 h-5 text-cyan-400" />
                  <h4 className="text-lg font-medium">Emotional Insights</h4>
                </div>
                <div className="pl-8">
                  <p className="text-white/80 leading-relaxed">
                    Your dream reveals significant emotional intensity around
                    embarrassment and anxiety. These emotions may be connected
                    to real-life situations where you feel exposed or judged.
                    Consider journaling about times when you've felt similar
                    emotions in your waking life.
                  </p>
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <a
                      href="#"
                      className="text-cyan-400 flex items-center gap-2 hover:text-cyan-300 transition-colors group"
                    >
                      <span>Explore related dream entries</span>
                      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </a>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
