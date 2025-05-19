"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Brain, Star, Hash, Sparkles, Lightbulb, MessageCircle, Layers } from "lucide-react"

export function DreamAnalysis() {
  const [activeTab, setActiveTab] = useState("analysis")

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
      { name: "Library", description: "Represents knowledge, order, and academic expectations" },
      { name: "Screen sharing", description: "Symbolizes unwanted exposure of private thoughts" },
      { name: "Reddit", description: "Represents personal interests and online community" },
    ],
    emotions: [
      { name: "embarrassment", intensity: 80 },
      { name: "anxiety", intensity: 65 },
      { name: "confusion", intensity: 40 },
    ],
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-gradient-to-br from-black/70 to-black/40 backdrop-blur-md border border-white/15 rounded-xl overflow-hidden shadow-xl"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-400">Dream Analysis</h2>
          <div className="bg-gradient-to-r from-purple-500/20 to-cyan-500/20 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-inner shadow-white/5 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-purple-300" />
            <span className="text-white/90">AI Powered</span>
          </div>
        </div>

        <div className="flex overflow-x-auto gap-2 pb-4 mb-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <button
            onClick={() => setActiveTab("analysis")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-300 ${
              activeTab === "analysis" 
                ? "bg-gradient-to-r from-purple-500/30 to-blue-500/30 text-white shadow-md shadow-purple-500/10 border border-white/10" 
                : "text-white/60 hover:text-white/90 hover:bg-white/5"
            }`}
          >
            <Brain className="w-4 h-4" />
            <span>Analysis</span>
          </button>
          <button
            onClick={() => setActiveTab("themes")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-300 ${
              activeTab === "themes" 
                ? "bg-gradient-to-r from-indigo-500/30 to-cyan-500/30 text-white shadow-md shadow-indigo-500/10 border border-white/10" 
                : "text-white/60 hover:text-white/90 hover:bg-white/5"
            }`}
          >
            <Hash className="w-4 h-4" />
            <span>Themes & Symbols</span>
          </button>
          <button
            onClick={() => setActiveTab("emotions")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-300 ${
              activeTab === "emotions" 
                ? "bg-gradient-to-r from-blue-500/30 to-teal-500/30 text-white shadow-md shadow-blue-500/10 border border-white/10" 
                : "text-white/60 hover:text-white/90 hover:bg-white/5"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Emotional Landscape</span>
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "analysis" && (
            <motion.div 
              key="analysis"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              <div className="bg-white/5 backdrop-blur-sm rounded-lg p-5 border border-white/10 shadow-inner shadow-white/5">
                <p className="text-white/90 leading-relaxed text-sm md:text-base">{dreamAnalysis.summary}</p>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-indigo-300">
                  <Lightbulb className="w-5 h-5 text-purple-400" />
                  <span>Key Insights</span>
                </h3>
                <div className="space-y-3">
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-start gap-3 bg-gradient-to-r from-purple-500/10 to-purple-500/5 p-4 rounded-lg border border-purple-500/20"
                  >
                    <div className="mt-1 bg-purple-500/20 p-1.5 rounded-full">
                      <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                    </div>
                    <span className="text-white/90 text-sm md:text-base">
                      Your feelings of embarrassment may be connected to deeper concerns about how others perceive you.
                    </span>
                  </motion.div>
                  
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-start gap-3 bg-gradient-to-r from-blue-500/10 to-blue-500/5 p-4 rounded-lg border border-blue-500/20"
                  >
                    <div className="mt-1 bg-blue-500/20 p-1.5 rounded-full">
                      <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                    </div>
                    <span className="text-white/90 text-sm md:text-base">
                      The library setting suggests you value knowledge but feel pressure to meet academic standards.
                    </span>
                  </motion.div>
                  
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-start gap-3 bg-gradient-to-r from-cyan-500/10 to-cyan-500/5 p-4 rounded-lg border border-cyan-500/20"
                  >
                    <div className="mt-1 bg-cyan-500/20 p-1.5 rounded-full">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                    </div>
                    <span className="text-white/90 text-sm md:text-base">
                      Consider how you balance personal interests with external expectations in your waking life.
                    </span>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "themes" && (
            <motion.div 
              key="themes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-cyan-300">
                  <Hash className="w-5 h-5 text-indigo-400" />
                  <span>Themes</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {dreamAnalysis.themes.map((theme, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 p-4 rounded-lg border border-indigo-500/20 backdrop-blur-sm"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-white/90">#{theme.name}</span>
                        <div className="flex">
                          {[...Array(5)].map((_, starIndex) => (
                            <Star
                              key={starIndex}
                              className={`w-4 h-4 ${
                                starIndex < theme.rating ? "text-indigo-400 fill-indigo-400" : "text-white/20"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-teal-300">
                  <MessageCircle className="w-5 h-5 text-cyan-400" />
                  <span>Symbols</span>
                </h3>
                <div className="space-y-3">
                  {dreamAnalysis.symbols.map((symbol, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 p-4 rounded-lg border border-cyan-500/20 backdrop-blur-sm"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="bg-gradient-to-r from-cyan-500/30 to-teal-500/30 p-1.5 rounded-full">
                          <Hash className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="font-medium text-white/90">{symbol.name}</span>
                      </div>
                      <p className="text-sm text-white/70 pl-7">{symbol.description}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "emotions" && (
            <motion.div 
              key="emotions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-teal-300">
                <Layers className="w-5 h-5 text-blue-400" />
                <span>Emotional Landscape</span>
              </h3>
              <div className="space-y-5 mb-6">
                {dreamAnalysis.emotions.map((emotion, i) => (
                  <motion.div key={i} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-white/90 capitalize">{emotion.name}</span>
                      <span className="text-white/70">{emotion.intensity}%</span>
                    </div>
                    <div className="h-3 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm p-0.5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${emotion.intensity}%` }}
                        transition={{ duration: 0.8, delay: i * 0.2, ease: "easeOut" }}
                        className={`h-full rounded-full ${
                          emotion.name === "embarrassment"
                            ? "bg-gradient-to-r from-red-500 to-red-400"
                            : emotion.name === "anxiety"
                              ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                              : "bg-gradient-to-r from-blue-500 to-blue-400"
                        }`}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-br from-teal-500/20 to-teal-500/5 p-5 rounded-lg border border-teal-500/20 backdrop-blur-sm"
              >
                <h4 className="font-medium mb-3 text-white/90 flex items-center gap-2">
                  <div className="bg-teal-500/20 p-1 rounded-full">
                    <Lightbulb className="w-4 h-4 text-teal-300" />
                  </div>
                  Emotional Insights
                </h4>
                <p className="text-sm text-white/80 leading-relaxed">
                  Your dream reveals significant emotional intensity around embarrassment and anxiety. These emotions may
                  be connected to real-life situations where you feel exposed or judged. Consider journaling about times
                  when you've felt similar emotions in your waking life.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
