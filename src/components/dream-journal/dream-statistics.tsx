"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { BarChart3, CalendarDays, Hash, LineChart, PieChart, Sparkles, TrendingUp } from "lucide-react"

export function DreamStatistics() {
  const [activeTab, setActiveTab] = useState("overview")

  // Sample data - in a real app this would come from API/props
  const statsData = {
    overview: {
      totalDreams: 142,
      avgLength: 320,
      mostCommonTheme: "adventure",
      mostCommonEmotion: "excitement",
      completionRate: 78,
    },
    patterns: {
      monthlyDreams: [4, 8, 12, 15, 10, 18, 20, 22, 14, 9, 5, 5],
      weekdayDistribution: [14, 18, 22, 28, 24, 20, 16], // Sun-Sat
      timeDistribution: {
        night: 62,
        earlyMorning: 28,
        morning: 10,
      },
    },
    themes: [
      { name: "adventure", count: 42, percentage: 30 },
      { name: "falling", count: 28, percentage: 20 },
      { name: "flying", count: 21, percentage: 15 },
      { name: "being chased", count: 18, percentage: 13 },
      { name: "loved ones", count: 14, percentage: 10 },
      { name: "other", count: 19, percentage: 12 },
    ],
    symbols: [
      { name: "water", count: 35, percentage: 25 },
      { name: "doors", count: 28, percentage: 20 },
      { name: "animals", count: 24, percentage: 17 },
      { name: "vehicles", count: 15, percentage: 11 },
      { name: "family members", count: 19, percentage: 13 },
      { name: "other", count: 21, percentage: 14 },
    ],
    calendar: {
      // This would be populated with actual dates and dream counts
      // Format: { date: "YYYY-MM-DD", count: number, emotion: "string" }
      entries: [
        { date: "2023-08-01", count: 1, emotion: "happy" },
        { date: "2023-08-03", count: 2, emotion: "anxious" },
        { date: "2023-08-07", count: 1, emotion: "neutral" },
        { date: "2023-08-10", count: 1, emotion: "excited" },
        { date: "2023-08-12", count: 1, emotion: "sad" },
        { date: "2023-08-15", count: 2, emotion: "confused" },
        { date: "2023-08-20", count: 1, emotion: "peaceful" },
        { date: "2023-08-23", count: 1, emotion: "scared" },
        { date: "2023-08-28", count: 1, emotion: "happy" },
        { date: "2023-08-30", count: 1, emotion: "anxious" },
    ],
    }
  }

  // Generate the month names for the chart
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  
  // Generate weekday names
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-gradient-to-br from-black/70 to-black/40 backdrop-blur-md border border-white/15 rounded-xl overflow-hidden shadow-xl"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-blue-300 to-teal-400">Dream Statistics</h2>
          <div className="bg-gradient-to-r from-indigo-500/20 to-teal-500/20 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-inner shadow-white/5 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span className="text-white/90">Personalized</span>
          </div>
        </div>

        <div className="flex overflow-x-auto gap-2 pb-4 mb-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-300 focus:outline-none focus-visible:ring-0 focus:ring-0 outline-none ${
              activeTab === "overview" 
                ? "bg-gradient-to-r from-indigo-500/30 to-blue-500/30 text-white shadow-md shadow-indigo-500/10 border border-white/10" 
                : "text-white/60 hover:text-white/90 hover:bg-white/5"
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>Overview</span>
          </button>
          <button
            onClick={() => setActiveTab("patterns")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-300 focus:outline-none focus-visible:ring-0 focus:ring-0 outline-none ${
              activeTab === "patterns" 
                ? "bg-gradient-to-r from-blue-500/30 to-cyan-500/30 text-white shadow-md shadow-blue-500/10 border border-white/10" 
                : "text-white/60 hover:text-white/90 hover:bg-white/5"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Patterns & Trends</span>
          </button>
          <button
            onClick={() => setActiveTab("themes")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-300 focus:outline-none focus-visible:ring-0 focus:ring-0 outline-none ${
              activeTab === "themes" 
                ? "bg-gradient-to-r from-cyan-500/30 to-teal-500/30 text-white shadow-md shadow-cyan-500/10 border border-white/10" 
                : "text-white/60 hover:text-white/90 hover:bg-white/5"
            }`}
          >
            <Hash className="w-4 h-4" />
            <span>Themes & Symbols</span>
          </button>
            <button
            onClick={() => setActiveTab("calendar")}
            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-300 focus:outline-none focus-visible:ring-0 focus:ring-0 outline-none ${
              activeTab === "calendar" 
                ? "bg-gradient-to-r from-teal-500/30 to-green-500/30 text-white shadow-md shadow-teal-500/10 border border-white/10" 
                : "text-white/60 hover:text-white/90 hover:bg-white/5"
              }`}
            >
            <CalendarDays className="w-4 h-4" />
            <span>Calendar View</span>
            </button>
        </div>

        <AnimatePresence mode="wait">
        {activeTab === "overview" && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 p-5 rounded-lg border border-indigo-500/20 backdrop-blur-sm"
                >
                  <h3 className="text-sm font-medium text-white/70 mb-1">Total Dreams</h3>
                  <p className="text-3xl font-bold text-white">{statsData.overview.totalDreams}</p>
                  <p className="text-xs text-white/50 mt-1">Dreams recorded</p>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-5 rounded-lg border border-blue-500/20 backdrop-blur-sm"
                >
                  <h3 className="text-sm font-medium text-white/70 mb-1">Avg. Words per Dream</h3>
                  <p className="text-3xl font-bold text-white">{statsData.overview.avgLength}</p>
                  <p className="text-xs text-white/50 mt-1">Words per entry</p>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 p-5 rounded-lg border border-cyan-500/20 backdrop-blur-sm"
                >
                  <h3 className="text-sm font-medium text-white/70 mb-1">Completion Rate</h3>
                  <p className="text-3xl font-bold text-white">{statsData.overview.completionRate}%</p>
                  <p className="text-xs text-white/50 mt-1">Dream journal consistency</p>
                </motion.div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-gradient-to-br from-indigo-500/10 to-blue-500/5 p-5 rounded-lg border border-indigo-500/20 backdrop-blur-sm"
                >
                  <h3 className="text-sm font-medium text-white/70 mb-3">Most Common Dream Themes</h3>
                  <div className="space-y-2">
                    {statsData.themes.slice(0, 3).map((theme, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-white/80 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                          {theme.name}
                        </span>
                        <span className="text-sm font-medium text-white/90">{theme.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-gradient-to-br from-blue-500/10 to-cyan-500/5 p-5 rounded-lg border border-blue-500/20 backdrop-blur-sm"
                >
                  <h3 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
                    <LineChart className="w-4 h-4 text-blue-400" />
                    <span>Dream Time Distribution</span>
                  </h3>
                  
                  {/* Dream Time Distribution Chart */}
                  <div className="mt-4 h-40 relative">
                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-white/50">
                      <span>100%</span>
                      <span>75%</span>
                      <span>50%</span>
                      <span>25%</span>
                      <span>0%</span>
                    </div>
                    
                    {/* Chart area */}
                    <div className="absolute left-8 right-0 top-0 bottom-0">
                      {/* Horizontal grid lines */}
                      <div className="absolute inset-0 flex flex-col justify-between">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <div key={i} className="border-t border-white/10 w-full h-0"></div>
                        ))}
                      </div>
                      
                      {/* Line chart */}
                      <svg className="absolute inset-0" viewBox="0 0 300 300" preserveAspectRatio="none">
                        {/* Data points coordinates calculation */}
                        {(() => {
                          const timeData = Object.entries(statsData.patterns.timeDistribution);
                          const points = timeData.map(([time, value], i) => ({
                            x: (i * 300) / (timeData.length - 1),
                            y: 300 - value * 3,
                            value,
                            label: time.replace(/([A-Z])/g, ' $1').trim()
                          }));
                          
                          return (
                            <>
                              {/* Line */}
                              <motion.path
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 1 }}
                                transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
                                d={`M ${points[0].x},${points[0].y} ${points.slice(1).map(p => `L ${p.x},${p.y}`).join(' ')}`}
                                fill="none"
                                stroke="url(#timeGradient)"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              
                              {/* Gradient for time distribution line */}
                              <defs>
                                <linearGradient id="timeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor="#3b82f6" />
                                  <stop offset="100%" stopColor="#06b6d4" />
                                </linearGradient>
                                <linearGradient id="timeAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.05" />
                                </linearGradient>
                              </defs>
                              
                              {/* Area under the line */}
                              <motion.path
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 1.5, delay: 0.7 }}
                                d={`M ${points[0].x},${points[0].y} ${points.slice(1).map(p => `L ${p.x},${p.y}`).join(' ')} L ${points[points.length-1].x},300 L ${points[0].x},300 Z`}
                                fill="url(#timeAreaGradient)"
                              />
                              
                              {/* Data points */}
                              {points.map((point, i) => (
                                <motion.circle
                                  key={i}
                                  initial={{ r: 0, opacity: 0 }}
                                  animate={{ r: 5, opacity: 1 }}
                                  transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                                  cx={point.x}
                                  cy={point.y}
                                  fill="#3b82f6"
                                  stroke="#fff"
                                  strokeWidth="2"
                                />
                              ))}
                            </>
                          );
                        })()}
                      </svg>
                    </div>
                    
                    {/* X-axis labels */}
                    <div className="absolute left-8 right-0 bottom-0 translate-y-6 flex justify-between text-xs text-white/50">
                      {Object.entries(statsData.patterns.timeDistribution).map(([time], i) => (
                        <span key={i} className="capitalize">{time.replace(/([A-Z])/g, ' $1').trim()}</span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
        )}

        {activeTab === "patterns" && (
            <motion.div 
              key="patterns"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
                    <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-5 rounded-lg border border-blue-500/20 backdrop-blur-sm"
              >
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-300">
                  <LineChart className="w-5 h-5 text-blue-400" />
                  <span>Dreams Over Time</span>
                </h3>
                
                {/* Dreams Over Time Chart */}
                <div className="mt-4 h-60 relative">
                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-white/50">
                    <span>25</span>
                    <span>20</span>
                    <span>15</span>
                    <span>10</span>
                    <span>5</span>
                    <span>0</span>
                  </div>
                  
                  {/* Chart area */}
                  <div className="absolute left-8 right-0 top-0 bottom-0">
                    {/* Horizontal grid lines */}
                    <div className="absolute inset-0 flex flex-col justify-between">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="border-t border-white/10 w-full h-0"></div>
                      ))}
                    </div>
                    
                    {/* Line chart */}
                    <svg className="absolute inset-0" viewBox="0 0 1200 300" preserveAspectRatio="none">
                      {/* Dreams line */}
                      <motion.path
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
                        d={`M 0,${300 - statsData.patterns.monthlyDreams[0] * 12} ${statsData.patterns.monthlyDreams.map((val, i) => 
                          `L ${(i * 1200) / (statsData.patterns.monthlyDreams.length - 1)},${300 - val * 12}`
                        ).join(' ')}`}
                        fill="none"
                        stroke="url(#lineGradient)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      
                      {/* Gradient for the line */}
                      <defs>
                        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#60a5fa" />
                          <stop offset="100%" stopColor="#22d3ee" />
                        </linearGradient>
                        <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.05" />
                        </linearGradient>
                      </defs>
                      
                      {/* Area under the line */}
                      <motion.path
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1.5, delay: 0.7 }}
                        d={`M 0,${300 - statsData.patterns.monthlyDreams[0] * 12} ${statsData.patterns.monthlyDreams.map((val, i) => 
                          `L ${(i * 1200) / (statsData.patterns.monthlyDreams.length - 1)},${300 - val * 12}`
                        ).join(' ')} L ${1200},300 L 0,300 Z`}
                        fill="url(#areaGradient)"
                      />
                      
                      {/* Data points */}
                      {statsData.patterns.monthlyDreams.map((val, i) => (
                        <motion.circle
                          key={i}
                          initial={{ r: 0, opacity: 0 }}
                          animate={{ r: 5, opacity: 1 }}
                          transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                          cx={(i * 1200) / (statsData.patterns.monthlyDreams.length - 1)}
                          cy={300 - val * 12}
                          fill="#60a5fa"
                          stroke="#fff"
                          strokeWidth="2"
                        />
                      ))}
                    </svg>
                  </div>
                  
                  {/* X-axis labels */}
                  <div className="absolute left-8 right-0 bottom-0 translate-y-6 flex justify-between text-xs text-white/50">
                    {months.map((month, i) => (
                      <span key={i}>{month}</span>
                ))}
              </div>
            </div>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 p-5 rounded-lg border border-cyan-500/20 backdrop-blur-sm"
                >
                  <h3 className="text-sm font-medium mb-4 flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-300">
                    <LineChart className="w-5 h-5 text-cyan-400" />
                    <span>Dreams by Day of Week</span>
                  </h3>
                  
                  {/* Dreams by Day of Week Chart */}
                  <div className="mt-2 h-40 relative">
                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-white/50">
                      <span>30</span>
                      <span>20</span>
                      <span>10</span>
                      <span>0</span>
                    </div>
                    
                    {/* Chart area */}
                    <div className="absolute left-8 right-0 top-0 bottom-0">
                      {/* Horizontal grid lines */}
                      <div className="absolute inset-0 flex flex-col justify-between">
                        {[0, 1, 2, 3].map((i) => (
                          <div key={i} className="border-t border-white/10 w-full h-0"></div>
                        ))}
                      </div>
                      
                      {/* Line chart */}
                      <svg className="absolute inset-0" viewBox="0 0 600 300" preserveAspectRatio="none">
                        {/* Weekday line */}
                        <motion.path
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 1 }}
                          transition={{ duration: 1.5, delay: 0.3, ease: "easeInOut" }}
                          d={`M 0,${300 - statsData.patterns.weekdayDistribution[0] * 10} ${statsData.patterns.weekdayDistribution.map((val, i) => 
                            `L ${(i * 600) / (statsData.patterns.weekdayDistribution.length - 1)},${300 - val * 10}`
                          ).join(' ')}`}
                          fill="none"
                          stroke="url(#weekdayGradient)"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        
                        {/* Gradient for the weekday line */}
                        <defs>
                          <linearGradient id="weekdayGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#22d3ee" />
                            <stop offset="100%" stopColor="#14b8a6" />
                          </linearGradient>
                          <linearGradient id="weekdayAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.05" />
                          </linearGradient>
                        </defs>
                        
                        {/* Area under the weekday line */}
                        <motion.path
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 1.5, delay: 0.5 }}
                          d={`M 0,${300 - statsData.patterns.weekdayDistribution[0] * 10} ${statsData.patterns.weekdayDistribution.map((val, i) => 
                            `L ${(i * 600) / (statsData.patterns.weekdayDistribution.length - 1)},${300 - val * 10}`
                          ).join(' ')} L ${600},300 L 0,300 Z`}
                          fill="url(#weekdayAreaGradient)"
                        />
                        
                        {/* Data points */}
                        {statsData.patterns.weekdayDistribution.map((val, i) => (
                          <motion.circle
                            key={i}
                            initial={{ r: 0, opacity: 0 }}
                            animate={{ r: 5, opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
                            cx={(i * 600) / (statsData.patterns.weekdayDistribution.length - 1)}
                            cy={300 - val * 10}
                            fill="#22d3ee"
                            stroke="#fff"
                            strokeWidth="2"
                          />
                        ))}
                      </svg>
                    </div>
                    
                    {/* X-axis labels */}
                    <div className="absolute left-8 right-0 bottom-0 translate-y-6 flex justify-between text-xs text-white/50">
                      {weekdays.map((day, i) => (
                        <span key={i}>{day}</span>
                      ))}
                    </div>
                  </div>
                </motion.div>
                
                  <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-gradient-to-br from-teal-500/10 to-teal-500/5 p-5 rounded-lg border border-teal-500/20 backdrop-blur-sm"
                >
                  <h3 className="text-sm font-medium mb-3 text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-teal-300">Pattern Insights</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <div className="mt-1 bg-teal-500/20 p-1 rounded-full">
                        <Sparkles className="w-3 h-3 text-teal-300" />
                      </div>
                      <span className="text-sm text-white/80">You have more vivid dreams on Wednesdays and Thursdays</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="mt-1 bg-teal-500/20 p-1 rounded-full">
                        <Sparkles className="w-3 h-3 text-teal-300" />
                      </div>
                      <span className="text-sm text-white/80">Your dream recall has improved by 32% in the last 3 months</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="mt-1 bg-teal-500/20 p-1 rounded-full">
                        <Sparkles className="w-3 h-3 text-teal-300" />
                      </div>
                      <span className="text-sm text-white/80">Dreams recorded in summer tend to be more positive</span>
                    </li>
                  </ul>
                  </motion.div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium mb-3 flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-teal-300">
                    <Hash className="w-5 h-5 text-cyan-400" />
                    <span>Top Themes</span>
                  </h3>
                  
                  <div className="space-y-3">
                    {statsData.themes.map((theme, i) => (
                      <motion.div 
                        key={i}
                        initial={{ width: "0%", opacity: 0 }}
                        animate={{ width: "100%", opacity: 1 }}
                        transition={{ duration: 0.5, delay: i * 0.1 }}
                        className="bg-gradient-to-r from-cyan-500/10 to-cyan-500/5 rounded-lg p-3 border border-cyan-500/20"
                      >
                        <div className="flex justify-between mb-1.5">
                          <span className="text-sm font-medium text-white/90 flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                            {theme.name}
                          </span>
                          <span className="text-xs text-white/60">{theme.count} dreams</span>
                    </div>
                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                            animate={{ width: `${theme.percentage}%` }}
                            transition={{ duration: 0.8, delay: 0.5 + i * 0.1 }}
                            className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full"
                          ></motion.div>
                        </div>
                        <div className="text-right mt-1">
                          <span className="text-xs text-white/60">{theme.percentage}%</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium mb-3 flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-green-300">
                    <Hash className="w-5 h-5 text-teal-400" />
                    <span>Top Symbols</span>
                  </h3>
                  
                  <div className="space-y-3">
                    {statsData.symbols.map((symbol, i) => (
                      <motion.div 
                        key={i}
                        initial={{ width: "0%", opacity: 0 }}
                        animate={{ width: "100%", opacity: 1 }}
                        transition={{ duration: 0.5, delay: i * 0.1 }}
                        className="bg-gradient-to-r from-teal-500/10 to-teal-500/5 rounded-lg p-3 border border-teal-500/20"
                      >
                        <div className="flex justify-between mb-1.5">
                          <span className="text-sm font-medium text-white/90 flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-teal-400"></div>
                            {symbol.name}
                          </span>
                          <span className="text-xs text-white/60">{symbol.count} dreams</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${symbol.percentage}%` }}
                            transition={{ duration: 0.8, delay: 0.5 + i * 0.1 }}
                            className="h-full bg-gradient-to-r from-teal-500 to-green-400 rounded-full"
                          ></motion.div>
                        </div>
                        <div className="text-right mt-1">
                          <span className="text-xs text-white/60">{symbol.percentage}%</span>
                    </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
              
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-br from-cyan-500/10 to-teal-500/10 p-5 rounded-lg border border-cyan-500/20 backdrop-blur-sm mt-4"
              >
                <h3 className="text-sm font-medium mb-3 text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-teal-300">Theme Insights</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <div className="mt-1 bg-teal-500/20 p-1 rounded-full">
                      <Sparkles className="w-3 h-3 text-teal-300" />
            </div>
                    <span className="text-sm text-white/80">Adventure dreams tend to occur more often on weekends</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-1 bg-teal-500/20 p-1 rounded-full">
                      <Sparkles className="w-3 h-3 text-teal-300" />
                    </div>
                    <span className="text-sm text-white/80">Water symbols are most common during stressful periods</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="mt-1 bg-teal-500/20 p-1 rounded-full">
                      <Sparkles className="w-3 h-3 text-teal-300" />
                    </div>
                    <span className="text-sm text-white/80">Flying dreams correlate with your reported feelings of freedom and joy</span>
                  </li>
                </ul>
              </motion.div>
            </motion.div>
          )}

          {activeTab === "calendar" && (
            <motion.div 
              key="calendar"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <h3 className="text-lg font-medium mb-1 flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-green-300">
                <CalendarDays className="w-5 h-5 text-teal-400" />
                <span>August 2023</span>
              </h3>
              
              {/* Calendar header */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {weekdays.map((day, i) => (
                  <div key={i} className="text-center py-2 text-xs font-medium text-white/60">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar grid - constrain width on larger screens */}
              <div className="mx-auto w-full max-w-lg lg:max-w-2xl grid grid-cols-7 gap-1.5">
                {/* Empty cells for days before the 1st */}
                {[...Array(2)].map((_, i) => (
                  <div key={`empty-start-${i}`} className="aspect-square"></div>
                ))}
                
                {/* Calendar days */}
                {[...Array(31)].map((_, i) => {
                  const date = `2023-08-${String(i+1).padStart(2, '0')}`;
                  const dayEntry = statsData.calendar.entries.find(entry => entry.date === date);
                  const hasDream = Boolean(dayEntry);
                  
                  return (
                    <motion.div 
                      key={i}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3, delay: 0.1 + i * 0.01 }}
                      className={`aspect-square rounded-lg p-1 backdrop-blur-sm flex flex-col items-center justify-center relative border ${
                        hasDream 
                          ? "bg-gradient-to-br from-teal-500/20 to-teal-500/5 border-teal-500/30 shadow-sm shadow-teal-500/10" 
                          : "border-white/5 bg-white/5"
                      }`}
                    >
                      <span className={`text-sm ${hasDream ? "font-medium text-white" : "text-white/60"}`}>{i+1}</span>
                      {hasDream && (
                        <div className="mt-1 flex items-center justify-center">
                          {[...Array(dayEntry.count)].map((_, dotIndex) => (
                            <div 
                              key={dotIndex}
                              className={`w-1.5 h-1.5 mx-0.5 rounded-full ${
                                dayEntry.emotion === "happy" ? "bg-green-400" :
                                dayEntry.emotion === "anxious" ? "bg-yellow-400" :
                                dayEntry.emotion === "sad" ? "bg-blue-400" :
                                dayEntry.emotion === "scared" ? "bg-red-400" :
                                dayEntry.emotion === "excited" ? "bg-purple-400" :
                                dayEntry.emotion === "confused" ? "bg-orange-400" :
                                dayEntry.emotion === "peaceful" ? "bg-cyan-400" :
                                "bg-gray-400"
                              }`}
                            ></div>
                          ))}
          </div>
        )}
                    </motion.div>
                  );
                })}
                
                {/* Empty cells for days after the 31st */}
                {[...Array(4)].map((_, i) => (
                  <div key={`empty-end-${i}`} className="aspect-square"></div>
                ))}
              </div>
              
              {/* Legend */}
              <div className="mt-6 bg-gradient-to-br from-teal-500/10 to-green-500/5 p-4 rounded-lg border border-teal-500/20">
                <h4 className="text-sm font-medium mb-3 text-white/90">Legend</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    <span className="text-xs text-white/70">Happy</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <span className="text-xs text-white/70">Anxious</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                    <span className="text-xs text-white/70">Sad</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <span className="text-xs text-white/70">Scared</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-400"></div>
                    <span className="text-xs text-white/70">Excited</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                    <span className="text-xs text-white/70">Confused</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
                    <span className="text-xs text-white/70">Peaceful</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                    <span className="text-xs text-white/70">Neutral</span>
                  </div>
          </div>
      </div>
    </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
