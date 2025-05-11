"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sparkles, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export function DreamImageGenerator() {
  const dreamText =
    "I found myself running across a bridge made of glass, " +
    "chasing a glowing fox that whispered secrets only I could hear."

  type Phase = "typing" | "generating" | "show"
  const [phase, setPhase]         = useState<Phase>("typing")
  const [typingText, setTypingText] = useState("")
  const [showCursor, setShowCursor] = useState(true)

  // 1) Blink the cursor while typing
  useEffect(() => {
    const iv = setInterval(() => setShowCursor((v) => !v), 500)
    return () => clearInterval(iv)
  }, [])

  // 2) When we enter "typing", start a simple character interval
  useEffect(() => {
    if (phase !== "typing") return
    setTypingText("")
    let i = 0
    const interval = setInterval(() => {
      i++
      if (i <= dreamText.length) {
        setTypingText(dreamText.slice(0, i))
      } else {
        clearInterval(interval)
        setTimeout(() => setPhase("generating"), 800)
      }
    }, 40 + Math.random() * 30)
    return () => clearInterval(interval)
  }, [phase])

  // 3) When we enter "generating", fake an API call
  useEffect(() => {
    if (phase !== "generating") return
    const t = setTimeout(() => setPhase("show"), 2000)
    return () => clearTimeout(t)
  }, [phase])

  // 4) When we enter "show", show for 5s and then loop back
  useEffect(() => {
    if (phase !== "show") return
    const t = setTimeout(() => setPhase("typing"), 5000)
    return () => clearTimeout(t)
  }, [phase])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden relative"
    >
      {/* Live Demo Indicator */}
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 border border-white/10">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-white/70">Auto Demo</span>
        </div>
      </div>
      
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Dream Visualizer</h2>
          <div className="bg-white/10 px-3 py-1 rounded-full text-xs flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> AI Powered
          </div>
        </div>

        {/* Typing area */}
        <div className="mb-6">
          <label className="block text-sm text-white/70 mb-2">Dream Description</label>
          <div className="min-h-[72px] bg-white/5 border border-white/10 rounded-lg p-3 text-white">
            {typingText}
            {phase === "typing" && showCursor && (
              <span className="inline-block w-[2px] h-[1em] bg-white ml-1 animate-pulse" />
            )}
          </div>
        </div>

        {/* Style buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          {["Surreal", "Mystical", "Dark", "Vibrant", "Abstract"].map((style) => (
            <button
              key={style}
              className={`px-3 py-1.5 ${style === "Mystical" ? "bg-white/20" : "bg-white/10"} rounded-full text-sm transition-colors`}
            >
              {style}
            </button>
          ))}
        </div>

        {/* Generate button */}
        <Button
          disabled
          className={`w-full flex justify-center items-center gap-2 mb-6
            bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600
            ${phase === "generating" ? "animate-pulse" : ""}
          `}
        >
          {phase === "generating" ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" /> Generate Dream Image
            </>
          )}
        </Button>

        {/* Result */}
        <AnimatePresence>
          {phase === "show" && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", damping: 20 }}
            >
              <div className="relative aspect-square bg-black/20 rounded-lg overflow-hidden mb-4">
                <motion.div
                  initial={{ scale: 1.1, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.7 }}
                >
                  <img
                    src="https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=500&h=500&fit=crop"
                    alt="Generated dream visualization"
                    className="w-full h-full object-cover"
                  />
                </motion.div>
                
                {/* Overlay with shimmering effect */}
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-blue-500/30"
                  initial={{ opacity: 0.8 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 1.5 }}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 border-white/10 text-white hover:bg-white/10">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Save
                </Button>
                <Button variant="outline" className="flex-1 border-white/10 text-white hover:bg-white/10">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <circle cx="18" cy="5" r="3"></circle>
                    <circle cx="6" cy="12" r="3"></circle>
                    <circle cx="18" cy="19" r="3"></circle>
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                  </svg>
                  Share
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
