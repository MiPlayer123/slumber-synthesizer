"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Trophy,
  Sparkles,
  Lightbulb,
  TrendingUp,
  Calendar,
  BarChart3,
} from "lucide-react";

export function DreamAnalysis() {
  const [activeTab, setActiveTab] = useState("analysis");

  const dreamAnalysis = {
    summary:
      "You know that feeling when you're caught off guard in a place where you feel safe? Your dream captures something we all experience—the fear of being exposed when we least expect it. Libraries represent your personal growth space, somewhere you go to better yourself. But even in these safe spaces, you worry about judgment. The technology mishap shows how quickly our private world can become public. Your mind is working through the tension between wanting to grow and fearing that others might see you as inadequate. This dream reflects your very human need for both authenticity and acceptance.",
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
    achievements: [
      {
        id: "first_dream",
        title: "Dream Keeper",
        description: "Record your first dream",
        icon: "🌙",
        unlocked: true,
        progress: 1,
        maxProgress: 1,
      },
      {
        id: "week_streak",
        title: "Dream Warrior",
        description: "Record dreams for 7 consecutive days",
        icon: "🔥",
        unlocked: true,
        progress: 12,
        maxProgress: 7,
      },
      {
        id: "lucid_explorer",
        title: "Lucid Explorer",
        description: "Record 5 lucid dreams",
        icon: "✨",
        unlocked: false,
        progress: 2,
        maxProgress: 5,
      },
      {
        id: "deep_thinker",
        title: "Deep Thinker",
        description: "Get 10 dream analyses",
        icon: "🧠",
        unlocked: false,
        progress: 4,
        maxProgress: 10,
      },
      {
        id: "symbol_seeker",
        title: "Symbol Seeker",
        description: "Discover 20 unique symbols",
        icon: "🔍",
        unlocked: false,
        progress: 8,
        maxProgress: 20,
      },
      {
        id: "emotion_explorer",
        title: "Emotion Explorer",
        description: "Experience 5 different emotions",
        icon: "❤️",
        unlocked: true,
        progress: 6,
        maxProgress: 5,
      },
    ],
    patterns: {
      sleepQuality: {
        score: 82,
        trend: "improving",
        insight: "Your dream clarity has increased 23% this month",
      },
      frequency: {
        weeklyAverage: 4.2,
        trend: "stable",
        insight: "Consistent dream recall indicates healthy REM sleep",
      },
      themes: [
        { name: "Growth & Learning", percentage: 34, color: "emerald" },
        { name: "Social Anxiety", percentage: 28, color: "red" },
        { name: "Technology", percentage: 19, color: "blue" },
        { name: "Safe Spaces", percentage: 19, color: "purple" },
      ],
      timeline: [
        { day: "Mon", dreams: 1, quality: 7 },
        { day: "Tue", dreams: 0, quality: 0 },
        { day: "Wed", dreams: 2, quality: 8 },
        { day: "Thu", dreams: 1, quality: 6 },
        { day: "Fri", dreams: 1, quality: 9 },
        { day: "Sat", dreams: 2, quality: 8 },
        { day: "Sun", dreams: 1, quality: 7 },
      ],
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative bg-gradient-to-br from-slate-900/95 via-purple-900/20 to-slate-900/95 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
    >
      {/* Optimized animated background elements - prevent layout shifts */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full blur-3xl will-change-[opacity]"
          style={{ transform: "translate3d(0, 0, 0)" }}
        />
        <motion.div
          animate={{
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute -bottom-32 -left-32 w-80 h-80 bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 rounded-full blur-3xl will-change-[opacity]"
          style={{ transform: "translate3d(0, 0, 0)" }}
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
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="will-change-transform"
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
              id: "achievements",
              label: "Achievements",
              icon: Trophy,
              gradient: "from-amber-500 to-orange-500",
            },
            {
              id: "patterns",
              label: "Patterns",
              icon: TrendingUp,
              gradient: "from-emerald-500 to-teal-500",
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

        {/* Content - Fixed minimum height to prevent jumping */}
        <div className="min-h-[500px] will-change-contents">
          <AnimatePresence mode="wait">
            {activeTab === "analysis" && (
              <motion.div
                key="analysis"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
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

            {activeTab === "achievements" && (
              <motion.div
                key="achievements"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="space-y-6"
              >
                {/* Achievements Header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-white flex items-center gap-3">
                    <div className="w-1 h-6 bg-gradient-to-b from-amber-400 to-orange-400 rounded-full"></div>
                    Achievements Preview
                  </h3>
                  <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-3 py-1 rounded-full text-xs font-medium text-amber-200">
                    {
                      dreamAnalysis.achievements.filter((a) => a.unlocked)
                        .length
                    }
                    /{dreamAnalysis.achievements.length} Unlocked
                  </div>
                </div>

                {/* Achievements Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dreamAnalysis.achievements.map((achievement, i) => {
                    const progressRatio = achievement.maxProgress
                      ? Math.min(
                          achievement.progress / achievement.maxProgress,
                          1,
                        )
                      : 0;
                    return (
                      <motion.div
                        key={achievement.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={{ scale: 1.02, y: -2 }}
                        className={`relative p-4 rounded-xl border transition-all duration-300 h-32 ${
                          achievement.unlocked
                            ? "bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-amber-400/40 shadow-lg shadow-amber-500/10"
                            : "bg-gradient-to-br from-white/5 to-white/2 border-white/10 hover:border-white/20"
                        }`}
                      >
                        {/* Achievement Icon */}
                        <div className="flex items-center gap-3 mb-3">
                          <div
                            className={`text-2xl ${achievement.unlocked ? "filter-none" : "grayscale opacity-50"}`}
                          >
                            {achievement.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4
                              className={`font-medium text-sm ${achievement.unlocked ? "text-white" : "text-white/60"}`}
                            >
                              {achievement.title}
                            </h4>
                            <p
                              className={`text-xs ${achievement.unlocked ? "text-white/80" : "text-white/40"}`}
                            >
                              {achievement.description}
                            </p>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        {achievement.maxProgress && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-white/60">Progress</span>
                              <span
                                className={`font-medium ${achievement.unlocked ? "text-amber-300" : "text-white/70"}`}
                              >
                                {achievement.progress}/{achievement.maxProgress}
                                {achievement.unlocked && " ✓"}
                              </span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: progressRatio }}
                                transition={{
                                  delay: i * 0.05 + 0.3,
                                  duration: 0.8,
                                  ease: "easeOut",
                                }}
                                style={{ originX: 0 }}
                                className={`h-full w-full rounded-full ${achievement.unlocked ? "bg-gradient-to-r from-amber-500 to-orange-500" : "bg-gradient-to-r from-white/30 to-white/10"}`}
                              />
                            </div>
                          </div>
                        )}

                        {/* Unlocked indicator */}
                        {achievement.unlocked && (
                          <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                            ✓
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Call to Action */}
                <div className="mt-6 p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/20">
                  <div className="text-center">
                    <p className="text-white/80 text-sm mb-2">
                      🏆 Ready to unlock more achievements?
                    </p>
                    <p className="text-white/60 text-xs">
                      Sign up to track your progress and discover all the
                      achievements waiting for you!
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "patterns" && (
              <motion.div
                key="patterns"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="space-y-6"
              >
                {/* Sleep Quality & Frequency */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sleep Quality */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 backdrop-blur-sm p-6 rounded-xl border border-emerald-500/20 min-h-[160px] md:h-40"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-emerald-500/20 p-2 rounded-lg">
                        <BarChart3 className="w-5 h-5 text-emerald-300" />
                      </div>
                      <h4 className="font-semibold text-white">
                        Sleep Quality
                      </h4>
                    </div>
                    <div className="mb-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-emerald-300">
                          {dreamAnalysis.patterns.sleepQuality.score}%
                        </span>
                        <span className="text-emerald-400 text-sm font-medium">
                          ↗ improving
                        </span>
                      </div>
                    </div>
                    <p className="text-white/70 text-sm leading-relaxed">
                      {dreamAnalysis.patterns.sleepQuality.insight}
                    </p>
                  </motion.div>

                  {/* Dream Frequency */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 backdrop-blur-sm p-6 rounded-xl border border-blue-500/20 min-h-[160px] md:h-40"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-blue-500/20 p-2 rounded-lg">
                        <Calendar className="w-5 h-5 text-blue-300" />
                      </div>
                      <h4 className="font-semibold text-white">
                        Dream Frequency
                      </h4>
                    </div>
                    <div className="mb-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-blue-300">
                          {dreamAnalysis.patterns.frequency.weeklyAverage}
                        </span>
                        <span className="text-blue-400 text-sm">
                          dreams/week
                        </span>
                      </div>
                    </div>
                    <p className="text-white/70 text-sm leading-relaxed">
                      {dreamAnalysis.patterns.frequency.insight}
                    </p>
                  </motion.div>
                </div>

                {/* Dream Themes */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10"
                >
                  <h4 className="font-semibold text-white mb-6 flex items-center gap-3">
                    <div className="w-1 h-6 bg-gradient-to-b from-emerald-400 to-teal-400 rounded-full"></div>
                    Recurring Themes
                  </h4>
                  <div className="space-y-4">
                    {dreamAnalysis.patterns.themes.map((theme, i) => {
                      const ratio = theme.percentage / 100;
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 + 0.4 }}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-3 h-3 rounded-full bg-${theme.color}-400`}
                            ></div>
                            <span className="text-white/90 font-medium">
                              {theme.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: ratio }}
                                transition={{
                                  delay: i * 0.1 + 0.6,
                                  duration: 0.8,
                                  ease: "easeOut",
                                }}
                                style={{ originX: 0 }}
                                className={`h-full bg-${theme.color}-400 rounded-full`}
                              />
                            </div>
                            <span className="text-white/70 text-sm font-medium min-w-[3rem] text-right">
                              {theme.percentage}%
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>

                {/* Weekly Timeline */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10"
                >
                  <h4 className="font-semibold text-white mb-6 flex items-center gap-3">
                    <div className="w-1 h-6 bg-gradient-to-b from-teal-400 to-cyan-400 rounded-full"></div>
                    This Week's Activity
                  </h4>
                  <div className="h-24 flex items-end justify-between gap-2">
                    {dreamAnalysis.patterns.timeline.map((day, i) => (
                      <div
                        key={i}
                        className="flex flex-col items-center gap-2 flex-1"
                      >
                        <div className="w-full max-w-8 bg-white/10 rounded-lg overflow-hidden h-16 flex items-end">
                          <motion.div
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: day.dreams / 2 }}
                            transition={{
                              delay: i * 0.1 + 0.7,
                              duration: 0.6,
                              ease: "easeOut",
                            }}
                            style={{ originY: 1 }}
                            className={`w-full h-full bg-gradient-to-t from-teal-500 to-cyan-400 rounded-sm ${day.dreams === 0 ? "opacity-30" : ""}`}
                          />
                        </div>
                        <span className="text-white/60 text-xs font-medium">
                          {day.day}
                        </span>
                        <span className="text-white/40 text-xs">
                          {day.dreams}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
