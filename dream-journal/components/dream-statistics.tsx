"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BarChart, PieChart, Activity, Calendar } from "lucide-react";

const tabs = [
  { id: "overview", label: "Overview", icon: <Activity className="w-4 h-4" /> },
  {
    id: "patterns",
    label: "Patterns & Trends",
    icon: <BarChart className="w-4 h-4" />,
  },
  {
    id: "themes",
    label: "Themes & Symbols",
    icon: <PieChart className="w-4 h-4" />,
  },
  {
    id: "calendar",
    label: "Calendar View",
    icon: <Calendar className="w-4 h-4" />,
  },
];

export function DreamStatistics({ stats = {} }) {
  const [activeTab, setActiveTab] = useState("overview");

  const defaultStats = {
    totalDreams: 42,
    analyzedDreams: 38,
    mostCommonCategory: "Flying",
    dominantEmotion: "Wonder",
    recurringSymbols: ["Water", "Doors", "Stars"],
    dreamsByMonth: [4, 7, 5, 8, 6, 12],
    categories: [
      { name: "Flying", percentage: 35 },
      { name: "Falling", percentage: 20 },
      { name: "Chase", percentage: 15 },
      { name: "Adventure", percentage: 30 },
    ],
    emotions: [
      { name: "Wonder", percentage: 40 },
      { name: "Fear", percentage: 25 },
      { name: "Joy", percentage: 20 },
      { name: "Confusion", percentage: 15 },
    ],
    ...stats,
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden"
    >
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6">Dream Statistics</h2>

        <div className="flex overflow-x-auto gap-2 pb-4 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:text-white/80"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Total Dreams"
              value={defaultStats.totalDreams}
              subtitle="dreams recorded"
              color="from-purple-500/20 to-blue-500/20"
            />
            <StatCard
              title="Analyzed Dreams"
              value={defaultStats.analyzedDreams}
              subtitle="dreams analyzed"
              color="from-blue-500/20 to-cyan-500/20"
            />
            <StatCard
              title="Most Common Category"
              value={defaultStats.mostCommonCategory}
              subtitle="of your dreams"
              color="from-cyan-500/20 to-green-500/20"
            />
            <StatCard
              title="Dominant Emotion"
              value={defaultStats.dominantEmotion}
              subtitle="across dreams"
              color="from-green-500/20 to-purple-500/20"
            />
          </div>
        )}

        {activeTab === "patterns" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-3">Dreams Over Time</h3>
              <div className="h-40 bg-white/5 rounded-lg flex items-end p-4">
                {defaultStats.dreamsByMonth.map((count, i) => (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center justify-end"
                  >
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(count / 12) * 100}%` }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      className="w-4 bg-gradient-to-t from-purple-500 to-blue-500 rounded-t-sm"
                    />
                    <span className="text-xs mt-2 text-white/60">{`M${i + 1}`}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3">Recurring Symbols</h3>
              <div className="flex flex-wrap gap-2">
                {defaultStats.recurringSymbols.map((symbol, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: i * 0.1 }}
                    className="px-3 py-1.5 bg-white/10 rounded-full text-sm"
                  >
                    {symbol}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "themes" && (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-3">Dream Categories</h3>
              <div className="bg-white/5 rounded-lg p-4">
                {defaultStats.categories.map((category, i) => (
                  <div key={i} className="mb-3 last:mb-0">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{category.name}</span>
                      <span>{category.percentage}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${category.percentage}%` }}
                        transition={{ duration: 0.5, delay: i * 0.1 }}
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3">Emotional Landscape</h3>
              <div className="bg-white/5 rounded-lg p-4">
                {defaultStats.emotions.map((emotion, i) => (
                  <div key={i} className="mb-3 last:mb-0">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{emotion.name}</span>
                      <span>{emotion.percentage}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${emotion.percentage}%` }}
                        transition={{ duration: 0.5, delay: i * 0.1 }}
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "calendar" && (
          <div className="bg-white/5 rounded-lg p-4 h-64 flex items-center justify-center">
            <p className="text-white/60">Calendar view coming soon</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function StatCard({ title, value, subtitle, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative group"
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${color} rounded-xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-300`}
      ></div>
      <div className="relative bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden p-4">
        <h3 className="text-sm text-white/70 mb-1">{title}</h3>
        <div className="text-2xl font-bold mb-1">{value}</div>
        <div className="text-xs text-white/50">{subtitle}</div>
      </div>
    </motion.div>
  );
}
