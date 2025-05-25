"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  Hash,
  LineChart,
  PieChart,
  Sparkles,
  TrendingUp,
  Activity,
  BarChart3,
  Clock,
  Target,
} from "lucide-react";

export function DreamStatistics() {
  const [activeTab, setActiveTab] = useState("overview");

  // Sample data - in a real app this would come from API/props
  const statsData = {
    overview: {
      totalDreams: 142,
      avgLength: 320,
      completionRate: 78,
      streakDays: 12,
    },
    themes: [
      { name: "adventure", count: 42, percentage: 30 },
      { name: "falling", count: 28, percentage: 20 },
      { name: "flying", count: 21, percentage: 15 },
      { name: "being chased", count: 18, percentage: 13 },
      { name: "loved ones", count: 14, percentage: 10 },
    ],
    symbols: [
      { name: "water", count: 35, percentage: 25, description: "Rivers, oceans, rain" },
      { name: "doors", count: 28, percentage: 20, description: "Entrances, exits, passages" },
      { name: "animals", count: 24, percentage: 17, description: "Dogs, cats, wild animals" },
      { name: "vehicles", count: 19, percentage: 13, description: "Cars, planes, trains" },
      { name: "family", count: 18, percentage: 12, description: "Parents, siblings, relatives" },
    ],
    monthlyDreams: [
      { month: "Jan", dreams: 8, year: 2024 },
      { month: "Feb", dreams: 12, year: 2024 },
      { month: "Mar", dreams: 15, year: 2024 },
      { month: "Apr", dreams: 18, year: 2024 },
      { month: "May", dreams: 22, year: 2024 },
      { month: "Jun", dreams: 19, year: 2024 },
      { month: "Jul", dreams: 25, year: 2024 },
      { month: "Aug", dreams: 28, year: 2024 },
      { month: "Sep", dreams: 24, year: 2024 },
      { month: "Oct", dreams: 20, year: 2024 },
      { month: "Nov", dreams: 16, year: 2024 },
      { month: "Dec", dreams: 14, year: 2024 },
    ],
    timeDistribution: [
      { period: "Night", value: 62, color: "#3b82f6" },
      { period: "Morning", value: 28, color: "#06b6d4" },
      { period: "Afternoon", value: 10, color: "#8b5cf6" },
    ],
    calendar: {
      // Sample calendar data for the current month
      entries: generateCalendarData(),
    },
  };

  function generateCalendarData() {
    const entries = [];
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const hasEntry = Math.random() > 0.7; // 30% chance of having a dream entry
      const dreamCount = hasEntry ? Math.floor(Math.random() * 3) + 1 : 0;
      const intensity = dreamCount > 2 ? 'high' : dreamCount > 1 ? 'medium' : dreamCount > 0 ? 'low' : 'none';
      
      entries.push({
        day: day,
        date: date.toISOString().split('T')[0],
        dreams: dreamCount,
        intensity: intensity,
      });
    }
    
    return entries;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative bg-gradient-to-br from-slate-900/95 via-indigo-900/20 to-slate-900/95 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
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
          className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-indigo-500/15 to-blue-500/15 rounded-full blur-3xl"
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
          className="absolute -bottom-32 -left-32 w-80 h-80 bg-gradient-to-tr from-blue-500/15 to-cyan-500/15 rounded-full blur-3xl"
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
              className="bg-gradient-to-br from-indigo-500/30 to-blue-500/30 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl backdrop-blur-sm border border-white/10"
            >
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-indigo-300" />
            </motion.div>
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white via-indigo-200 to-blue-200 bg-clip-text text-transparent">
                Dream Statistics
              </h2>
              <p className="text-white/60 text-xs sm:text-sm mt-0.5 sm:mt-1 leading-relaxed">Track your dream patterns and insights</p>
            </div>
          </div>
          
          {/* Personalized Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.05 }}
            className="bg-gradient-to-r from-indigo-500/20 to-blue-500/20 px-4 py-2 rounded-2xl text-xs font-medium flex items-center gap-2 backdrop-blur-sm border border-white/10 w-fit"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-4 h-4 text-indigo-300" />
            </motion.div>
            <span className="text-white/90">Personalized</span>
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
            { id: "overview", label: "Overview", icon: Activity, gradient: "from-indigo-500 to-blue-500" },
            { id: "patterns", label: "Patterns", icon: TrendingUp, gradient: "from-blue-500 to-cyan-500" },
            { id: "themes", label: "Themes", icon: Hash, gradient: "from-cyan-500 to-teal-500" },
            { id: "calendar", label: "Calendar", icon: CalendarDays, gradient: "from-teal-500 to-green-500" }
          ].map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-3.5 rounded-lg sm:rounded-xl font-medium transition-all duration-300 whitespace-nowrap text-sm sm:text-base flex-1 sm:flex-initial ${
                activeTab === tab.id
                  ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg shadow-indigo-500/20`
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
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="space-y-8"
            >
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: "Total Dreams",
                    value: statsData.overview.totalDreams,
                    subtitle: "Dreams recorded",
                    icon: Activity,
                    color: "indigo",
                    delay: 0.1
                  },
                  {
                    label: "Avg. Words per Dream",
                    value: statsData.overview.avgLength,
                    subtitle: "Words per entry",
                    icon: PieChart,
                    color: "blue",
                    delay: 0.2
                  },
                  {
                    label: "Completion Rate",
                    value: `${statsData.overview.completionRate}%`,
                    subtitle: "Dream journal consistency",
                    icon: Target,
                    color: "cyan",
                    delay: 0.3
                  },
                  {
                    label: "Current Streak",
                    value: `${statsData.overview.streakDays} days`,
                    subtitle: "Consecutive entries",
                    icon: TrendingUp,
                    color: "teal",
                    delay: 0.4
                  }
                ].map((metric, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: metric.delay }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    className={`bg-gradient-to-br from-${metric.color}-500/15 to-${metric.color}-500/5 backdrop-blur-sm p-6 rounded-2xl border border-${metric.color}-500/20 hover:border-${metric.color}-500/40 transition-all duration-300`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className={`bg-${metric.color}-500/20 p-2 rounded-lg`}
                      >
                        <metric.icon className={`w-5 h-5 text-${metric.color}-300`} />
                      </motion.div>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white mb-1">{metric.value}</p>
                      <p className="text-sm font-medium text-white/70 mb-1">{metric.label}</p>
                      <p className="text-xs text-white/50">{metric.subtitle}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Most Common Dream Themes */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/10"
              >
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6 flex items-center gap-3">
                  <div className="w-1 h-6 bg-gradient-to-b from-indigo-400 to-blue-400 rounded-full"></div>
                  Most Common Dream Themes
                </h3>
                <div className="space-y-3 sm:space-y-4">
                  {statsData.themes.slice(0, 3).map((theme, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.1 }}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          i === 0 ? 'bg-indigo-400' : 
                          i === 1 ? 'bg-blue-400' : 'bg-cyan-400'
                        }`} />
                        <span className="text-white/90 capitalize font-medium text-sm sm:text-base">{theme.name}</span>
                      </div>
                      <div className="flex items-center gap-3 ml-6 sm:ml-0">
                        <div className="flex-1 sm:w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${theme.percentage}%` }}
                            transition={{ delay: 0.8 + i * 0.1, duration: 0.8 }}
                            className={`h-full ${
                              i === 0 ? 'bg-gradient-to-r from-indigo-500 to-indigo-400' : 
                              i === 1 ? 'bg-gradient-to-r from-blue-500 to-blue-400' : 
                              'bg-gradient-to-r from-cyan-500 to-cyan-400'
                            }`}
                          />
                        </div>
                        <span className="text-white/70 font-mono text-xs sm:text-sm min-w-[2.5rem] text-right">
                          {theme.percentage}%
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {activeTab === "patterns" && (
            <motion.div
              key="patterns"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="space-y-8"
            >
              {/* Monthly Dreams Line Graph */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/10"
              >
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6 flex items-center gap-3">
                  <div className="w-1 h-6 bg-gradient-to-b from-purple-400 to-pink-400 rounded-full"></div>
                  Dreams Per Month
                </h3>
                
                <div className="h-48 sm:h-64 relative overflow-x-auto">
                  <svg className="w-full h-full min-w-[600px]" viewBox="0 0 600 200">
                    {/* Grid lines */}
                    {[0, 1, 2, 3].map((i) => (
                      <line
                        key={i}
                        x1="50"
                        y1={50 + i * 40}
                        x2="550"
                        y2={50 + i * 40}
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="1"
                      />
                    ))}
                    
                    {/* Y-axis labels */}
                    {[30, 20, 10, 0].map((value, i) => (
                      <text
                        key={i}
                        x="40"
                        y={55 + i * 40}
                        fill="rgba(255,255,255,0.6)"
                        fontSize="12"
                        textAnchor="end"
                      >
                        {value}
                      </text>
                    ))}
                    
                    {/* Line path */}
                    <motion.path
                      d={`M ${statsData.monthlyDreams.map((data, i) => 
                        `${70 + i * 40} ${170 - (data.dreams / 30) * 120}`
                      ).join(' L ')}`}
                      fill="none"
                      stroke="url(#lineGradient)"
                      strokeWidth="3"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 2, delay: 0.5 }}
                    />
                    
                    {/* Area under curve */}
                    <motion.path
                      d={`M 70 170 L ${statsData.monthlyDreams.map((data, i) => 
                        `${70 + i * 40} ${170 - (data.dreams / 30) * 120}`
                      ).join(' L ')} L 550 170 Z`}
                      fill="url(#areaGradient)"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 1, delay: 1 }}
                    />
                    
                    {/* Data points */}
                    {statsData.monthlyDreams.map((data, i) => (
                      <motion.circle
                        key={i}
                        cx={70 + i * 40}
                        cy={170 - (data.dreams / 30) * 120}
                        r="4"
                        fill="white"
                        stroke="url(#lineGradient)"
                        strokeWidth="2"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.7 + i * 0.1 }}
                      />
                    ))}
                    
                    {/* Month labels */}
                    {statsData.monthlyDreams.map((data, i) => (
                      <text
                        key={i}
                        x={70 + i * 40}
                        y="190"
                        fill="rgba(255,255,255,0.6)"
                        fontSize="10"
                        textAnchor="middle"
                      >
                        {data.month.slice(0, 3)}
                      </text>
                    ))}
                    
                    {/* Gradients */}
                    <defs>
                      <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#8B5CF6" />
                        <stop offset="50%" stopColor="#06B6D4" />
                        <stop offset="100%" stopColor="#10B981" />
                      </linearGradient>
                      <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="rgba(139, 92, 246, 0.3)" />
                        <stop offset="100%" stopColor="rgba(139, 92, 246, 0.05)" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                
                {/* Stats Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-4 sm:mt-6">
                  <div className="bg-purple-500/10 rounded-lg p-3 text-center">
                    <p className="text-lg sm:text-xl font-bold text-purple-300">
                      {Math.max(...statsData.monthlyDreams.map(d => d.dreams))}
                    </p>
                    <p className="text-xs text-white/60">Peak Month</p>
                  </div>
                  <div className="bg-cyan-500/10 rounded-lg p-3 text-center">
                    <p className="text-lg sm:text-xl font-bold text-cyan-300">
                      {Math.round(statsData.monthlyDreams.reduce((sum, d) => sum + d.dreams, 0) / 12)}
                    </p>
                    <p className="text-xs text-white/60">Avg/Month</p>
                  </div>
                  <div className="bg-blue-500/10 rounded-lg p-3 text-center">
                    <p className="text-lg sm:text-xl font-bold text-blue-300">
                      {statsData.monthlyDreams.reduce((sum, d) => sum + d.dreams, 0)}
                    </p>
                    <p className="text-xs text-white/60">Total</p>
                  </div>
                  <div className="bg-teal-500/10 rounded-lg p-3 text-center">
                    <p className="text-lg sm:text-xl font-bold text-teal-300">
                      {((statsData.monthlyDreams[statsData.monthlyDreams.length - 1].dreams - statsData.monthlyDreams[0].dreams) > 0 ? '+' : '')}
                      {statsData.monthlyDreams[statsData.monthlyDreams.length - 1].dreams - statsData.monthlyDreams[0].dreams}
                    </p>
                    <p className="text-xs text-white/60">Growth</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {activeTab === "themes" && (
            <motion.div
              key="themes"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="space-y-6 sm:space-y-8"
            >
              {/* Dream Themes */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/10"
              >
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6 flex items-center gap-3">
                  <div className="w-1 h-6 bg-gradient-to-b from-cyan-400 to-teal-400 rounded-full"></div>
                  Dream Themes
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {statsData.themes.map((theme, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + i * 0.05 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      className="bg-gradient-to-br from-cyan-500/15 to-cyan-500/5 backdrop-blur-sm p-4 rounded-xl border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-white capitalize text-sm sm:text-base">{theme.name}</h4>
                        <span className="text-cyan-300 font-mono text-xs sm:text-sm">{theme.percentage}%</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${theme.percentage}%` }}
                            transition={{ delay: 0.4 + i * 0.05, duration: 0.8 }}
                            className="h-full bg-gradient-to-r from-cyan-500 to-teal-500"
                          />
                        </div>
                        <span className="text-white/60 text-xs">{theme.count}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Dream Symbols */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-white/10"
              >
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6 flex items-center gap-3">
                  <div className="w-1 h-6 bg-gradient-to-b from-purple-400 to-pink-400 rounded-full"></div>
                  Common Symbols
                </h3>
                <div className="space-y-3 sm:space-y-4">
                  {statsData.symbols.map((symbol, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.05 }}
                      className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            i === 0 ? 'bg-purple-400' : 
                            i === 1 ? 'bg-pink-400' : 
                            i === 2 ? 'bg-violet-400' :
                            i === 3 ? 'bg-fuchsia-400' :
                            i === 4 ? 'bg-rose-400' :
                            i === 5 ? 'bg-indigo-400' : 'bg-purple-300'
                          }`} />
                          <div>
                            <span className="text-white/90 capitalize font-medium text-sm sm:text-base">{symbol.name}</span>
                            <p className="text-white/50 text-xs mt-1">{symbol.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 min-w-0 sm:min-w-[120px]">
                          <div className="flex-1 sm:w-20 h-2 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${symbol.percentage}%` }}
                              transition={{ delay: 0.6 + i * 0.05, duration: 0.8 }}
                              className={`h-full ${
                                i === 0 ? 'bg-gradient-to-r from-purple-500 to-purple-400' : 
                                i === 1 ? 'bg-gradient-to-r from-pink-500 to-pink-400' : 
                                i === 2 ? 'bg-gradient-to-r from-violet-500 to-violet-400' :
                                i === 3 ? 'bg-gradient-to-r from-fuchsia-500 to-fuchsia-400' :
                                i === 4 ? 'bg-gradient-to-r from-rose-500 to-rose-400' :
                                i === 5 ? 'bg-gradient-to-r from-indigo-500 to-indigo-400' : 
                                'bg-gradient-to-r from-purple-500 to-purple-300'
                              }`}
                            />
                          </div>
                          <span className="text-white/70 font-mono text-xs min-w-[2.5rem] text-right">
                            {symbol.percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-white/50 text-xs">{symbol.count} appearances</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {activeTab === "calendar" && (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="space-y-4 sm:space-y-6"
            >
              {/* Calendar View */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-3 sm:p-4 lg:p-5 border border-white/10"
              >
                <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-white mb-2 sm:mb-3 lg:mb-4 flex items-center gap-2 lg:gap-3">
                  <div className="w-1 h-4 lg:h-6 bg-gradient-to-b from-emerald-400 to-teal-400 rounded-full"></div>
                  Calendar View
                </h3>
                
                <div className="space-y-2 lg:space-y-3">
                  {/* Calendar Header */}
                  <div className="flex items-center justify-between mb-2 lg:mb-3">
                    <h4 className="text-sm sm:text-base lg:text-lg font-medium text-white/90">December 2024</h4>
                    <div className="flex items-center gap-1 lg:gap-2 text-xs text-white/60">
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-emerald-400 rounded-full"></div>
                        <span>Dreams</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Day Headers */}
                  <div className="grid grid-cols-7 gap-0.5 lg:gap-1 mb-1 lg:mb-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
                      <div key={day} className="text-center text-xs font-medium text-white/50 py-0.5 lg:py-1">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* Calendar Days */}
                  <div className="grid grid-cols-7 gap-0.5 lg:gap-1 max-w-sm lg:max-w-md mx-auto">
                    {statsData.calendar.entries.map((day, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.8 + i * 0.005 }}
                        className={`
                          w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center text-xs relative rounded-md lg:rounded-lg
                          transition-all duration-200 cursor-pointer
                          ${day.dreams > 0 
                            ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-white border border-emerald-400/30 hover:scale-105 hover:from-emerald-500/30 hover:to-teal-500/30' 
                            : 'text-white/40 hover:bg-white/5'
                          }
                        `}
                      >
                        <span className="font-medium text-xs">{day.day}</span>
                        {day.dreams > 0 && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 1 + i * 0.005 }}
                            className={`
                              absolute -top-0.5 -right-0.5 lg:-top-1 lg:-right-1 w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full text-[7px] lg:text-[8px] flex items-center justify-center font-bold
                              ${day.intensity === 'high' ? 'bg-emerald-400 text-emerald-900' :
                                day.intensity === 'medium' ? 'bg-teal-400 text-teal-900' :
                                'bg-cyan-400 text-cyan-900'
                              }
                            `}
                          >
                            {day.dreams}
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                  
                  {/* Calendar Stats */}
                  <div className="grid grid-cols-3 gap-2 lg:gap-3 mt-3 lg:mt-4 pt-3 lg:pt-4 border-t border-white/10">
                    <div className="text-center">
                      <p className="text-base lg:text-lg font-bold text-emerald-300">
                        {statsData.calendar.entries.filter(d => d.dreams > 0).length}
                      </p>
                      <p className="text-xs text-white/60">Dreams This Month</p>
                    </div>
                    <div className="text-center">
                      <p className="text-base lg:text-lg font-bold text-teal-300">
                        {Math.round((statsData.calendar.entries.filter(d => d.dreams > 0).length / statsData.calendar.entries.length) * 100)}%
                      </p>
                      <p className="text-xs text-white/60">Completion</p>
                    </div>
                    <div className="text-center">
                      <p className="text-base lg:text-lg font-bold text-cyan-300">
                        {statsData.overview.streakDays}
                      </p>
                      <p className="text-xs text-white/60">Current Streak</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
