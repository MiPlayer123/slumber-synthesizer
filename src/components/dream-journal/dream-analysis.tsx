"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Brain, Star, Hash, Sparkles } from "lucide-react"

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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Dream Analysis</h2>
          <div className="bg-white/10 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>AI Powered</span>
          </div>
        </div>

        <div className="flex overflow-x-auto gap-2 pb-4 mb-6">
          <button
            onClick={() => setActiveTab("analysis")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
              activeTab === "analysis" ? "bg-white/10 text-white" : "text-white/60 hover:text-white/80"
            }`}
          >
            <Brain className="w-4 h-4" />
            <span>Analysis</span>
          </button>
          <button
            onClick={() => setActiveTab("themes")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
              activeTab === "themes" ? "bg-white/10 text-white" : "text-white/60 hover:text-white/80"
            }`}
          >
            <Hash className="w-4 h-4" />
            <span>Themes & Symbols</span>
          </button>
          <button
            onClick={() => setActiveTab("emotions")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
              activeTab === "emotions" ? "bg-white/10 text-white" : "text-white/60 hover:text-white/80"
            }`}
          >
            <Star className="w-4 h-4" />
            <span>Emotional Landscape</span>
          </button>
        </div>

        {activeTab === "analysis" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <p className="text-white/80 leading-relaxed">{dreamAnalysis.summary}</p>

            <div className="mt-6">
              <h3 className="text-lg font-medium mb-3">Key Insights</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <div className="mt-1 bg-purple-500/20 p-1 rounded-full">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                  </div>
                  <span>
                    Your feelings of embarrassment may be connected to deeper concerns about how others perceive you.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1 bg-blue-500/20 p-1 rounded-full">
                    <Sparkles className="w-3 h-3 text-blue-400" />
                  </div>
                  <span>
                    The library setting suggests you value knowledge but feel pressure to meet academic standards.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1 bg-cyan-500/20 p-1 rounded-full">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                  </div>
                  <span>
                    Consider how you balance personal interests with external expectations in your waking life.
                  </span>
                </li>
              </ul>
            </div>
          </motion.div>
        )}

        {activeTab === "themes" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-3">Themes</h3>
              <div className="space-y-3">
                {dreamAnalysis.themes.map((theme, i) => (
                  <div key={i} className="bg-white/5 p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">#{theme.name}</span>
                      <div className="flex">
                        {[...Array(5)].map((_, starIndex) => (
                          <Star
                            key={starIndex}
                            className={`w-4 h-4 ${
                              starIndex < theme.rating ? "text-purple-400 fill-purple-400" : "text-white/20"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3">Symbols</h3>
              <div className="space-y-3">
                {dreamAnalysis.symbols.map((symbol, i) => (
                  <div key={i} className="bg-white/5 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="bg-gradient-to-r from-purple-500/30 to-blue-500/30 p-1.5 rounded-full">
                        <Hash className="w-3 h-3 text-white" />
                      </div>
                      <span className="font-medium">{symbol.name}</span>
                    </div>
                    <p className="text-sm text-white/70 pl-7">{symbol.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "emotions" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h3 className="text-lg font-medium mb-3">Emotional Landscape</h3>
            <div className="space-y-4">
              {dreamAnalysis.emotions.map((emotion, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{emotion.name}</span>
                    <span>{emotion.intensity}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${emotion.intensity}%` }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      className={`h-full ${
                        emotion.name === "embarrassment"
                          ? "bg-red-400"
                          : emotion.name === "anxiety"
                            ? "bg-yellow-400"
                            : "bg-blue-400"
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white/5 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Emotional Insights</h4>
              <p className="text-sm text-white/70">
                Your dream reveals significant emotional intensity around embarrassment and anxiety. These emotions may
                be connected to real-life situations where you feel exposed or judged. Consider journaling about times
                when you've felt similar emotions in your waking life.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
