"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, RefreshCw, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DreamImageGenerator() {
  const dreamText =
    "I found myself running across a bridge made of glass, " +
    "chasing a glowing fox that whispered secrets only I could hear.";

  type Phase = "typing" | "generating" | "show";
  const [phase, setPhase] = useState<Phase>("typing");
  const [typingText, setTypingText] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  // 1) Blink the cursor while typing
  useEffect(() => {
    const iv = setInterval(() => setShowCursor((v) => !v), 500);
    return () => clearInterval(iv);
  }, []);

  // 2) When we enter "typing", start a simple character interval
  useEffect(() => {
    if (phase !== "typing") return;
    setTypingText("");
    let i = 0;
    const interval = setInterval(
      () => {
        i++;
        if (i <= dreamText.length) {
          setTypingText(dreamText.slice(0, i));
        } else {
          clearInterval(interval);
          setTimeout(() => setPhase("generating"), 800);
        }
      },
      40 + Math.random() * 30,
    );
    return () => clearInterval(interval);
  }, [phase, dreamText]);

  // 3) When we enter "generating", fake an API call
  useEffect(() => {
    if (phase !== "generating") return;
    const t = setTimeout(() => setPhase("show"), 2000);
    return () => clearTimeout(t);
  }, [phase]);

  // 4) When we enter "show", show for 5s and then loop back
  useEffect(() => {
    if (phase !== "show") return;
    const t = setTimeout(() => setPhase("typing"), 5000);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative bg-gradient-to-br from-slate-900/95 via-purple-900/20 to-slate-900/95 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 3, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-purple-500/15 to-blue-500/15 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, -2, 0],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -bottom-32 -left-32 w-80 h-80 bg-gradient-to-tr from-blue-500/15 to-indigo-500/15 rounded-full blur-3xl"
        />
      </div>

      <div className="relative z-10 p-6 sm:p-8 lg:p-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
        >
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="bg-gradient-to-br from-purple-500/30 to-blue-500/30 p-3 rounded-2xl backdrop-blur-sm border border-white/10"
            >
              <Wand2 className="w-6 h-6 sm:w-7 sm:h-7 text-purple-300" />
            </motion.div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
                Dream Visualizer
              </h2>
              <p className="text-white/60 text-sm mt-1">Transform dreams into art</p>
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.05 }}
            className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm px-4 py-2 rounded-2xl border border-purple-500/30 flex items-center gap-2 w-fit"
          >
            <Sparkles className="w-4 h-4 text-purple-300" />
            <span className="text-purple-200 text-sm font-medium">AI Powered</span>
          </motion.div>
        </motion.div>

        {/* Dream Description Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <label className="block text-lg font-semibold text-white/90 mb-4">
            Dream Description
          </label>
          <div className="relative">
            <motion.div
              className="min-h-[100px] sm:min-h-[120px] bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 sm:p-6 text-white/90 leading-relaxed text-sm sm:text-base"
              whileHover={{ borderColor: "rgba(255, 255, 255, 0.2)" }}
              transition={{ duration: 0.3 }}
            >
              {typingText}
              {phase === "typing" && showCursor && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="inline-block w-[2px] h-[1.2em] bg-purple-400 ml-1"
                />
              )}
            </motion.div>
            {phase === "typing" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-2xl pointer-events-none"
              />
            )}
          </div>
        </motion.div>

        {/* Style Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <h3 className="text-white/90 font-medium mb-4">Style Selection</h3>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {["Surreal", "Mystical", "Dark", "Vibrant", "Abstract"].map(
              (style, index) => (
                <motion.button
                  key={style}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                    style === "Mystical"
                      ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/20"
                      : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white/90 border border-white/10 hover:border-white/20"
                  }`}
                >
                  {style}
                </motion.button>
              ),
            )}
          </div>
        </motion.div>

        {/* Generate Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <Button
            disabled
            className={`w-full h-12 sm:h-14 flex justify-center items-center gap-3 text-base font-medium
              bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600
              shadow-lg shadow-purple-500/20 border-0 rounded-2xl
              ${phase === "generating" ? "animate-pulse" : ""}
            `}
          >
            {phase === "generating" ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Generating Dream...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Generate Dream Image</span>
              </>
            )}
          </Button>
        </motion.div>

        {/* Generated Image Result */}
        <AnimatePresence>
          {phase === "show" && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.9 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="relative"
            >
              <div className="relative aspect-square bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                <motion.div
                  initial={{ scale: 1.1, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="w-full h-full"
                >
                  <img
                    src="./images/e6477f41-9e85-41b4-b60f-8c257c3fca4e_1748211619250.png"
                    alt="Generated dream visualization"
                    className="w-full h-full object-cover"
                  />
                </motion.div>

                {/* Magical overlay effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-purple-500/40 via-transparent to-blue-500/40"
                  initial={{ opacity: 0.8, scale: 1.1 }}
                  animate={{ opacity: 0, scale: 1 }}
                  transition={{ duration: 2, ease: "easeOut" }}
                />

                {/* Sparkle effects */}
                <motion.div
                  className="absolute top-4 right-4"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1, duration: 0.5 }}
                >
                  <Sparkles className="w-6 h-6 text-purple-300" />
                </motion.div>
              </div>

              {/* Success message */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-4 text-center"
              >
                <p className="text-white/70 text-sm">
                  ✨ Your dream has been visualized
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
