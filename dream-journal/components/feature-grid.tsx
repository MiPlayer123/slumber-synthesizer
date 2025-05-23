"use client";

import { motion } from "framer-motion";
import { Brain, Share2, BookOpen, Sparkles, BarChart } from "lucide-react";

const features = [
  {
    icon: <BookOpen className="text-purple-400" />,
    title: "Journal With Ease",
    description:
      "Capture rich dream details with our intuitive journaling tools designed for both quick entries and deep reflection.",
    color: "from-purple-500/20 to-blue-500/20",
    x: -1,
    y: 0,
  },
  {
    icon: <Brain className="text-blue-400" />,
    title: "AI-Powered Insights",
    description:
      "Discover patterns, symbols, and meanings in your dreams with our thoughtful AI analysis.",
    color: "from-blue-500/20 to-cyan-500/20",
    x: 1,
    y: 0,
  },
  {
    icon: <Share2 className="text-cyan-400" />,
    title: "Dream Community",
    description:
      "Share experiences and connect with fellow dreamers in a supportive, respectful environment.",
    color: "from-cyan-500/20 to-green-500/20",
    x: 0,
    y: 0.5,
  },
  {
    icon: <Sparkles className="text-green-400" />,
    title: "Dream Visualization",
    description:
      "Transform your dreams into stunning images with our AI-powered dream visualization tool.",
    color: "from-green-500/20 to-yellow-500/20",
    x: -1,
    y: 1,
  },
  {
    icon: <BarChart className="text-yellow-400" />,
    title: "Dream Statistics",
    description:
      "Track patterns, recurring symbols, and emotional trends across your dream journal entries.",
    color: "from-yellow-500/20 to-purple-500/20",
    x: 1,
    y: 1,
  },
];

export function FeatureGrid() {
  return (
    <div className="container mx-auto px-6">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          Your dream experience, evolved
        </h2>
        <div className="w-16 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 mx-auto mt-4"></div>
      </motion.div>

      {/* Desktop layout: shifted up and to the right */}
      <div className="relative h-[600px] max-w-4xl mx-0 md:ml-12 -mt-12 hidden md:block">
        <svg
          className="absolute inset-0 w-full h-full z-0"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <motion.path
            d="M50,30 L30,60 L70,60 Z"
            stroke="url(#gradient)"
            strokeWidth="0.2"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            whileInView={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.5, delay: 0.5 }}
            viewport={{ once: true }}
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
        </svg>

        {features.map((feature, i) => {
          const xPos = 50 + feature.x * 25;
          const yPos = 30 + feature.y * 30;
          return (
            <motion.div
              key={i}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${xPos}%`, top: `${yPos}%` }}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: i * 0.2 }}
              viewport={{ once: true }}
            >
              <motion.div
                className="relative cursor-pointer group"
                whileHover={{ scale: 1.05, zIndex: 10 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {/* Glow on hover only */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.color} rounded-xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
                />

                {/* Card content */}
                <div className="relative bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden p-6 w-64">
                  <div className="bg-white/5 p-3 rounded-full w-fit mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-medium mb-3">{feature.title}</h3>
                  <p className="text-white/70 text-sm">{feature.description}</p>
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* Mobile layout unchanged */}
      <div className="flex flex-col items-center space-y-6 mx-auto md:hidden px-4">
        {features.map((feature, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            viewport={{ once: true }}
          >
            <motion.div
              className="relative cursor-pointer group w-full max-w-sm"
              whileHover={{ scale: 1.05, zIndex: 10 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${feature.color} rounded-xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
              />
              <div className="relative bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden p-6">
                <div className="bg-white/5 p-3 rounded-full w-fit mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-medium mb-3">{feature.title}</h3>
                <p className="text-white/70 text-sm">{feature.description}</p>
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
