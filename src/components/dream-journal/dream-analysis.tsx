"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Star,
  Hash,
  Sparkles,
  Lightbulb,
  MessageCircle,
  Layers,
} from "lucide-react";

export function DreamAnalysis() {
  const [activeTab, setActiveTab] = useState("analysis");

  const dreamAnalysis = {
    summary:
      "You know that feeling when you're caught off guard in a place where you feel safe? Your dream captures something we all experience—the fear of being exposed when we least expect it. Libraries represent your personal growth space, somewhere you go to better yourself. But even in these safe spaces, you worry about judgment. The technology mishap shows how quickly our private world can become public. Your mind is working through the tension between wanting to grow and fearing that others might see you as inadequate. This dream reflects your very human need for both authenticity and acceptance.",
    themes: [
      { name: "vulnerability in safe spaces", rating: 5 },
      { name: "fear of exposure", rating: 4 },
      { name: "growth vs. judgment", rating: 4 },
      { name: "public vs. private self", rating: 3 },
    ],
    symbols: [
      {
        name: "Library",
        description:
          "Your sanctuary for learning and self-improvement, where you expect to feel secure and focused",
      },
      {
        name: "Technology malfunction",
        description:
          "The moment when your private thoughts or actions become visible to others unexpectedly",
      },
      {
        name: "Being asked to leave",
        description:
          "Your fear that you don't belong in spaces where you're trying to grow or improve yourself",
      },
    ],
    emotions: [
      { name: "embarrassment", intensity: 85 },
      { name: "vulnerability", intensity: 70 },
      { name: "inadequacy", intensity: 60 },
    ],
  };

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
            rotate: [0, 5, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, -3, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute -bottom-32 -left-32 w-80 h-80 bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 rounded-full blur-3xl"
        />
      </div>

      <div className="relative z-10 p-4 sm:p-6 lg:p-8 xl:p-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col gap-4 mb-6 sm:mb-8"
        >
          {/* Title and Icon Row */}
          <div className="flex items-center gap-3 sm:gap-4">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="bg-gradient-to-br from-purple-500/30 to-blue-500/30 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl backdrop-blur-sm border border-white/10"
            >
              <Brain className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-purple-300" />
            </motion.div>
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent">
                Dream Analysis
              </h2>
              <p className="text-white/60 text-xs sm:text-sm mt-0.5 sm:mt-1 leading-relaxed">
                AI-powered insights into your subconscious
              </p>
            </div>
          </div>

          {/* AI Powered Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.05 }}
            className="bg-gradient-to-r from-purple-500/20 to-cyan-500/20 px-4 py-2 rounded-2xl text-xs font-medium flex items-center gap-2 backdrop-blur-sm border border-white/10 w-fit"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-4 h-4 text-purple-300" />
            </motion.div>
            <span className="text-white/90">AI Powered</span>
          </motion.div>
        </motion.div>

        {/* Navigation Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-1 sm:gap-2 p-1.5 sm:p-2 bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-white/10 mb-6 sm:mb-8 overflow-x-auto"
        >
          {[
            {
              id: "analysis",
              label: "Analysis",
              icon: Brain,
              gradient: "from-purple-500 to-blue-500",
            },
            {
              id: "themes",
              label: "Themes",
              icon: Hash,
              gradient: "from-indigo-500 to-cyan-500",
            },
            {
              id: "emotions",
              label: "Emotions",
              icon: Layers,
              gradient: "from-blue-500 to-teal-500",
            },
          ].map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-3.5 rounded-lg sm:rounded-xl font-medium transition-all duration-300 flex-1 sm:flex-initial whitespace-nowrap text-sm sm:text-base ${
                activeTab === tab.id
                  ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg shadow-purple-500/20`
                  : "text-white/60 hover:text-white/90 hover:bg-white/5"
              }`}
            >
              <tab.icon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>{tab.label}</span>
            </motion.button>
          ))}
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === "analysis" && (
            <motion.div
              key="analysis"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="space-y-6"
            >
              {/* Summary Card */}
              <motion.div
                whileHover={{ scale: 1.01 }}
                className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 shadow-lg"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-gradient-to-r from-purple-500/30 to-blue-500/30 p-2 rounded-lg">
                    <Lightbulb className="w-5 h-5 text-purple-300" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">
                    Dream Summary
                  </h3>
                </div>
                <p className="text-white/90 leading-relaxed text-base">
                  {dreamAnalysis.summary}
                </p>
              </motion.div>

              {/* Key Insights */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
                  <div className="w-1 h-6 bg-gradient-to-b from-purple-400 to-cyan-400 rounded-full"></div>
                  Key Insights
                </h3>
                <div className="grid gap-4">
                  {[
                    {
                      text: "You carry a deep fear that others will discover you're not as put-together as you appear. This dream shows how even your safe spaces can trigger anxiety about being found out.",
                      color: "purple",
                    },
                    {
                      text: "The library setting reveals your relationship with learning. You want to grow, but you also fear making mistakes in front of others who might judge your efforts.",
                      color: "blue",
                    },
                    {
                      text: "Technology represents the unpredictable moments when your private world becomes visible. You can't control everything, and that terrifies you.",
                      color: "cyan",
                    },
                  ].map((insight, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 + 0.2 }}
                      whileHover={{ scale: 1.02, x: 5 }}
                      className={`bg-gradient-to-r from-${insight.color}-500/15 to-${insight.color}-500/5 backdrop-blur-sm p-5 rounded-xl border border-${insight.color}-500/20 hover:border-${insight.color}-500/40 transition-all duration-300`}
                    >
                      <div className="flex items-start gap-4">
                        <motion.div
                          whileHover={{ rotate: 180 }}
                          transition={{ duration: 0.3 }}
                          className={`bg-${insight.color}-500/20 p-2 rounded-full mt-1`}
                        >
                          <Sparkles
                            className={`w-4 h-4 text-${insight.color}-300`}
                          />
                        </motion.div>
                        <p className="text-white/90 leading-relaxed">
                          {insight.text}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "themes" && (
            <motion.div
              key="themes"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="space-y-8"
            >
              {/* Themes */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
                  <div className="w-1 h-6 bg-gradient-to-b from-indigo-400 to-cyan-400 rounded-full"></div>
                  Themes
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dreamAnalysis.themes.map((theme, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      whileHover={{ scale: 1.03, y: -2 }}
                      className="bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 backdrop-blur-sm p-5 rounded-xl border border-indigo-500/20 hover:border-indigo-500/40 transition-all duration-300"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-medium text-white/90 text-lg">
                          #{theme.name}
                        </span>
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, starIndex) => (
                            <motion.div
                              key={starIndex}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: i * 0.1 + starIndex * 0.05 }}
                            >
                              <Star
                                className={`w-4 h-4 ${
                                  starIndex < theme.rating
                                    ? "text-indigo-400 fill-indigo-400"
                                    : "text-white/20"
                                }`}
                              />
                            </motion.div>
                          ))}
                        </div>
                      </div>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(theme.rating / 5) * 100}%` }}
                        transition={{ delay: i * 0.1 + 0.3, duration: 0.8 }}
                        className="h-2 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full"
                      />
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Symbols */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
                  <div className="w-1 h-6 bg-gradient-to-b from-cyan-400 to-teal-400 rounded-full"></div>
                  Symbols
                </h3>
                <div className="space-y-4">
                  {dreamAnalysis.symbols.map((symbol, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 + 0.2 }}
                      whileHover={{ scale: 1.02, x: 5 }}
                      className="bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 backdrop-blur-sm p-6 rounded-xl border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300"
                    >
                      <div className="flex items-start gap-4">
                        <motion.div
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.5 }}
                          className="bg-gradient-to-r from-cyan-500/30 to-teal-500/30 p-3 rounded-xl"
                        >
                          <Hash className="w-5 h-5 text-white" />
                        </motion.div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-white text-lg mb-2">
                            {symbol.name}
                          </h4>
                          <p className="text-white/70 leading-relaxed">
                            {symbol.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "emotions" && (
            <motion.div
              key="emotions"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="space-y-8"
            >
              {/* Emotional Bars */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
                  <div className="w-1 h-6 bg-gradient-to-b from-blue-400 to-teal-400 rounded-full"></div>
                  Emotional Intensity
                </h3>
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                  <div className="space-y-6">
                    {dreamAnalysis.emotions.map((emotion, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="space-y-3"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <motion.div
                              whileHover={{ scale: 1.2 }}
                              className={`w-4 h-4 rounded-full ${
                                emotion.name === "embarrassment"
                                  ? "bg-red-400"
                                  : emotion.name === "vulnerability"
                                    ? "bg-amber-400"
                                    : "bg-blue-400"
                              }`}
                            />
                            <span className="font-medium text-white capitalize text-lg">
                              {emotion.name}
                            </span>
                          </div>
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: i * 0.1 + 0.3 }}
                            className="text-white/70 font-mono bg-white/10 px-3 py-1 rounded-full text-sm"
                          >
                            {emotion.intensity}%
                          </motion.span>
                        </div>
                        <div className="h-4 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${emotion.intensity}%` }}
                            transition={{
                              duration: 1.2,
                              delay: i * 0.2 + 0.5,
                              ease: "easeOut",
                            }}
                            className={`h-full rounded-full ${
                              emotion.name === "embarrassment"
                                ? "bg-gradient-to-r from-red-500 to-red-400"
                                : emotion.name === "vulnerability"
                                  ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                                  : "bg-gradient-to-r from-blue-500 to-blue-400"
                            }`}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reflection Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                whileHover={{ scale: 1.01 }}
                className="bg-gradient-to-br from-teal-500/20 to-teal-500/5 backdrop-blur-sm p-6 rounded-2xl border border-teal-500/20"
              >
                <div className="flex items-center gap-3 mb-4">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className="bg-teal-500/20 p-2 rounded-lg"
                  >
                    <Lightbulb className="w-5 h-5 text-teal-300" />
                  </motion.div>
                  <h4 className="text-lg font-semibold text-white">
                    What This Means for You
                  </h4>
                </div>
                <p className="text-white/80 leading-relaxed">
                  You're wrestling with something most people never talk about
                  openly. The fear that you're fooling everyone around you. That
                  somehow, you've convinced people you belong in spaces where
                  you're trying to grow, but deep down you worry they'll figure
                  out you don't deserve to be there. This dream is your mind's
                  way of processing that anxiety. Here's what matters: everyone
                  feels this way sometimes. The people who seem most confident?
                  They've felt exactly what you're feeling. Your growth journey
                  is valid, even when it feels messy or imperfect.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
