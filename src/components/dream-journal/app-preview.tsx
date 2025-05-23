"use client";

import { motion } from "framer-motion";
import {
  Smartphone,
  Monitor,
  Tablet,
  Sparkles,
  Brain,
  Heart,
} from "lucide-react";
import { useState } from "react";

export function AppPreview() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showCTA, setShowCTA] = useState(false);

  return (
    <div className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-purple-900/20 blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-blue-300">
            Experience the Magic
          </h2>
          <p className="text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
            Discover how thousands of dreamers are already unlocking insights
            into their subconscious minds with our beautifully designed
            interface.
          </p>
        </motion.div>

        {/* Desktop and Mobile Preview Layout */}
        <div className="grid lg:grid-cols-12 gap-8 items-center">
          {/* Left side - Desktop app preview */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="lg:col-span-8"
          >
            <div className="relative">
              {/* Desktop browser frame */}
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-1 shadow-2xl">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 px-4 py-3 bg-white/5 rounded-t-xl border-b border-white/10">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-white/10 rounded-md px-3 py-1 text-sm text-white/60">
                      lucidrem.com/journal
                    </div>
                  </div>
                </div>

                {/* App interface mockup */}
                <div className="bg-gradient-to-br from-[#1a0b2e] to-[#2d1b4e] rounded-b-xl overflow-hidden">
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                      <h1 className="text-2xl font-bold text-white">
                        Dream Journal
                      </h1>
                      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                        + Record Dream
                      </div>
                    </div>

                    {/* Dream entries mockup */}
                    <div className="space-y-4">
                      {/* Dream card 1 */}
                      <motion.div
                        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 cursor-pointer transition-all duration-300"
                        whileHover={{
                          scale: 1.02,
                          backgroundColor: "rgba(255, 255, 255, 0.08)",
                        }}
                        onHoverStart={() => setHoveredCard(1)}
                        onHoverEnd={() => setHoveredCard(null)}
                        onClick={() => {
                          setShowAnalysis(!showAnalysis);
                          setShowCTA(true);
                          setTimeout(() => setShowCTA(false), 3000);
                        }}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-white font-semibold mb-1">
                              Flying Through Clouds
                            </h3>
                            <div className="flex gap-2">
                              <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full text-xs">
                                lucid
                              </span>
                              <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded-full text-xs">
                                joy
                              </span>
                            </div>
                          </div>
                          <div className="text-white/60 text-sm">
                            2 hours ago
                          </div>
                        </div>
                        <p className="text-white/80 text-sm leading-relaxed mb-3">
                          I found myself soaring above cotton-like clouds,
                          feeling completely free and weightless. The sky was
                          painted in brilliant shades of orange and pink...
                        </p>
                        <div className="flex gap-2">
                          <motion.div
                            className="bg-purple-600/20 text-purple-300 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1"
                            whileHover={{
                              scale: 1.05,
                              backgroundColor: "rgba(147, 51, 234, 0.3)",
                            }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Brain className="w-3 h-3" />
                            Analyze
                          </motion.div>
                          <motion.div
                            className="bg-green-600/20 text-green-300 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1"
                            whileHover={{
                              scale: 1.05,
                              backgroundColor: "rgba(34, 197, 94, 0.3)",
                            }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Sparkles className="w-3 h-3" />
                            Generate Image
                          </motion.div>
                        </div>

                        {/* Animated AI Analysis that appears */}
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{
                            opacity: showAnalysis ? 1 : 0,
                            height: showAnalysis ? "auto" : 0,
                          }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/20 rounded-lg p-3 mt-3">
                            <div className="text-blue-300 text-xs font-medium mb-1 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              AI Analysis
                            </div>
                            <p className="text-white/80 text-xs">
                              Flying dreams often represent a desire for freedom
                              and transcendence. The vivid colors suggest a
                              positive emotional state and creative potential...
                            </p>
                          </div>
                        </motion.div>
                      </motion.div>

                      {/* Dream card 2 */}
                      <motion.div
                        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 cursor-pointer transition-all duration-300"
                        whileHover={{
                          scale: 1.02,
                          backgroundColor: "rgba(255, 255, 255, 0.08)",
                        }}
                        onHoverStart={() => setHoveredCard(2)}
                        onHoverEnd={() => setHoveredCard(null)}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-white font-semibold mb-1">
                              The Endless Library
                            </h3>
                            <div className="flex gap-2">
                              <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full text-xs">
                                normal
                              </span>
                              <span className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full text-xs">
                                curiosity
                              </span>
                            </div>
                          </div>
                          <div className="text-white/60 text-sm">1 day ago</div>
                        </div>
                        <p className="text-white/80 text-sm leading-relaxed mb-3">
                          Wandering through infinite halls of books that
                          stretched beyond sight, each volume glowing with a
                          mysterious inner light...
                        </p>
                        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/20 rounded-lg p-3 mt-3">
                          <div className="text-blue-300 text-xs font-medium mb-1 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            AI Analysis
                          </div>
                          <p className="text-white/80 text-xs">
                            This dream may reflect your thirst for knowledge and
                            personal growth. Libraries often symbolize...
                          </p>
                        </div>

                        {/* Interactive elements that appear on hover */}
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: hoveredCard === 2 ? 1 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex gap-2 mt-3"
                        >
                          <motion.div
                            className="bg-red-500/20 text-red-300 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1"
                            whileHover={{ scale: 1.05 }}
                          >
                            <Heart className="w-3 h-3" />
                            Like
                          </motion.div>
                          <motion.div
                            className="bg-cyan-500/20 text-cyan-300 px-3 py-1.5 rounded-lg text-xs font-medium"
                            whileHover={{ scale: 1.05 }}
                          >
                            Share
                          </motion.div>
                        </motion.div>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right side - Mobile and features */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
            className="lg:col-span-4 space-y-8"
          >
            {/* Mobile preview */}
            <div className="relative mx-auto w-64">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-2 shadow-2xl">
                {/* Mobile frame */}
                <div className="bg-gradient-to-br from-[#1a0b2e] to-[#2d1b4e] rounded-3xl overflow-hidden">
                  <div className="h-1 bg-white/20 rounded-full w-16 mx-auto mt-3"></div>
                  <div className="p-4 pt-6">
                    <div className="text-center mb-6">
                      <h2 className="text-white font-bold text-lg mb-2">
                        Dream Community
                      </h2>
                      <p className="text-white/60 text-sm">
                        Discover amazing dreams
                      </p>
                    </div>

                    {/* Mobile dream feed */}
                    <div className="space-y-3">
                      <motion.div
                        className="bg-white/5 rounded-xl p-3 cursor-pointer"
                        whileHover={{
                          scale: 1.02,
                          backgroundColor: "rgba(255, 255, 255, 0.08)",
                        }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full"></div>
                          <span className="text-white text-sm font-medium">
                            @dreamer92
                          </span>
                        </div>
                        <p className="text-white/80 text-xs mb-2">
                          Flying over a crystal city with rainbow bridges
                          connecting floating islands...
                        </p>
                        <div className="flex gap-2 text-white/60 text-xs">
                          <motion.span
                            className="flex items-center gap-1"
                            whileHover={{ scale: 1.1 }}
                          >
                            ❤️ 24
                          </motion.span>
                          <motion.span
                            className="flex items-center gap-1"
                            whileHover={{ scale: 1.1 }}
                          >
                            💬 5
                          </motion.span>
                        </div>
                      </motion.div>

                      <motion.div
                        className="bg-white/5 rounded-xl p-3 cursor-pointer"
                        whileHover={{
                          scale: 1.02,
                          backgroundColor: "rgba(255, 255, 255, 0.08)",
                        }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 bg-gradient-to-r from-green-400 to-blue-400 rounded-full"></div>
                          <span className="text-white text-sm font-medium">
                            @augustus
                          </span>
                        </div>
                        <p className="text-white/80 text-xs mb-2">
                          Walking through a forest where the trees whispered
                          ancient secrets...
                        </p>
                        <div className="flex gap-2 text-white/60 text-xs">
                          <motion.span
                            className="flex items-center gap-1"
                            whileHover={{ scale: 1.1 }}
                          >
                            ❤️ 18
                          </motion.span>
                          <motion.span
                            className="flex items-center gap-1"
                            whileHover={{ scale: 1.1 }}
                          >
                            💬 3
                          </motion.span>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature highlights */}
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                viewport={{ once: true }}
                className="flex items-center gap-3 p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl"
              >
                <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-2 rounded-lg">
                  <Monitor className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-white font-medium text-sm">
                    Beautiful Interface
                  </h4>
                  <p className="text-white/60 text-xs">
                    Intuitive design that makes journaling a joy
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                viewport={{ once: true }}
                className="flex items-center gap-3 p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl"
              >
                <div className="bg-gradient-to-r from-green-500 to-blue-500 p-2 rounded-lg">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-white font-medium text-sm">
                    Mobile Optimized
                  </h4>
                  <p className="text-white/60 text-xs">
                    Record dreams on-the-go with voice input
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                viewport={{ once: true }}
                className="flex items-center gap-3 p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl"
              >
                <div className="bg-gradient-to-r from-cyan-500 to-purple-500 p-2 rounded-lg">
                  <Tablet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-white font-medium text-sm">
                    Cross-Platform
                  </h4>
                  <p className="text-white/60 text-xs">
                    Sync across all your devices seamlessly
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Bottom stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          viewport={{ once: true }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-2">10K+</div>
            <div className="text-white/60 text-sm">Active Dreamers</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-2">50K+</div>
            <div className="text-white/60 text-sm">Dreams Recorded</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-2">25K+</div>
            <div className="text-white/60 text-sm">AI Analyses</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-2">4.8★</div>
            <div className="text-white/60 text-sm">User Rating</div>
          </div>
        </motion.div>
      </div>

      {/* Floating CTA that appears on interaction */}
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{
          opacity: showCTA ? 1 : 0,
          y: showCTA ? 0 : 50,
          scale: showCTA ? 1 : 0.9,
        }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="fixed bottom-8 right-8 z-50 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 rounded-xl shadow-2xl border border-white/20 backdrop-blur-sm"
      >
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5" />
          <div>
            <div className="font-semibold text-sm">Like what you see?</div>
            <div className="text-white/80 text-xs">
              Start your dream journal today!
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              const authMode = sessionStorage.setItem("auth-mode", "signup");
              window.location.href = "/auth";
            }}
            className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          >
            Try Now
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
