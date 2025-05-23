"use client";

import { motion } from "framer-motion";
import { Sparkles, Brain, Heart } from "lucide-react";
import { useState } from "react";

export function HeroAppPreview() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.6 }}
      className="relative"
    >
      {/* Desktop app preview */}
      <div className="relative max-w-lg mx-auto">
        {/* Desktop browser frame */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-1 shadow-2xl shadow-purple-500/20">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-t-xl border-b border-white/10">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 bg-red-400 rounded-full"></div>
              <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full"></div>
              <div className="w-2.5 h-2.5 bg-green-400 rounded-full"></div>
            </div>
            <div className="flex-1 mx-3">
              <div className="bg-white/10 rounded-md px-2 py-1 text-xs text-white/60">
                lucidrem.com/journal
              </div>
            </div>
          </div>

          {/* App interface mockup */}
          <div className="bg-gradient-to-br from-[#1a0b2e] to-[#2d1b4e] rounded-b-xl overflow-hidden">
            <div className="p-4">
              {/* Header */}
              <div className="flex justify-between items-center mb-4">
                <h1 className="text-lg font-bold text-white">Dream Journal</h1>
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium">
                  + Record
                </div>
              </div>

              {/* Dream entries mockup */}
              <div className="space-y-3">
                {/* Dream card 1 */}
                <motion.div
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 cursor-pointer transition-all duration-300"
                  whileHover={{
                    scale: 1.02,
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                  }}
                  onHoverStart={() => setHoveredCard(1)}
                  onHoverEnd={() => setHoveredCard(null)}
                  onClick={() => setShowAnalysis(!showAnalysis)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-white font-medium mb-1 text-sm">
                        Flying Through Clouds
                      </h3>
                      <div className="flex gap-1">
                        <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full text-xs">
                          lucid
                        </span>
                        <span className="bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full text-xs">
                          joy
                        </span>
                      </div>
                    </div>
                    <div className="text-white/60 text-xs">2h ago</div>
                  </div>
                  <p className="text-white/80 text-xs leading-relaxed mb-2">
                    Soaring above cotton-like clouds, feeling completely free
                    and weightless. The sky was painted in brilliant shades...
                  </p>
                  <div className="flex gap-1.5">
                    <motion.div
                      className="bg-purple-600/20 text-purple-300 px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1"
                      whileHover={{
                        scale: 1.05,
                        backgroundColor: "rgba(147, 51, 234, 0.3)",
                      }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Brain className="w-2.5 h-2.5" />
                      Analyze
                    </motion.div>
                    <motion.div
                      className="bg-green-600/20 text-green-300 px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1"
                      whileHover={{
                        scale: 1.05,
                        backgroundColor: "rgba(34, 197, 94, 0.3)",
                      }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      Image
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
                    <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/20 rounded-md p-2 mt-2">
                      <div className="text-blue-300 text-xs font-medium mb-1 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        AI Analysis
                      </div>
                      <p className="text-white/80 text-xs">
                        Flying dreams represent freedom and transcendence. The
                        vivid colors suggest positive creativity...
                      </p>
                    </div>
                  </motion.div>
                </motion.div>

                {/* Dream card 2 */}
                <motion.div
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 cursor-pointer transition-all duration-300"
                  whileHover={{
                    scale: 1.02,
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                  }}
                  onHoverStart={() => setHoveredCard(2)}
                  onHoverEnd={() => setHoveredCard(null)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-white font-medium mb-1 text-sm">
                        The Endless Library
                      </h3>
                      <div className="flex gap-1">
                        <span className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full text-xs">
                          normal
                        </span>
                        <span className="bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full text-xs">
                          curious
                        </span>
                      </div>
                    </div>
                    <div className="text-white/60 text-xs">1d ago</div>
                  </div>
                  <p className="text-white/80 text-xs leading-relaxed mb-2">
                    Wandering through infinite halls of books, each volume
                    glowing with mysterious inner light...
                  </p>
                  <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/20 rounded-md p-2">
                    <div className="text-blue-300 text-xs font-medium mb-1 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      AI Analysis
                    </div>
                    <p className="text-white/80 text-xs">
                      Libraries symbolize knowledge and growth. This reflects
                      your quest for understanding...
                    </p>
                  </div>

                  {/* Interactive elements that appear on hover */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: hoveredCard === 2 ? 1 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex gap-1.5 mt-2"
                  >
                    <motion.div
                      className="bg-red-500/20 text-red-300 px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1"
                      whileHover={{ scale: 1.05 }}
                    >
                      <Heart className="w-2.5 h-2.5" />
                      Like
                    </motion.div>
                    <motion.div
                      className="bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded-md text-xs font-medium"
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

      {/* Floating elements for visual interest */}
      <motion.div
        animate={{
          y: [0, -10, 0],
          opacity: [0.4, 0.8, 0.4],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -top-4 -right-4 bg-purple-500/20 backdrop-blur-sm border border-purple-400/30 rounded-full p-2"
      >
        <Sparkles className="w-4 h-4 text-purple-300" />
      </motion.div>

      <motion.div
        animate={{
          y: [0, 10, 0],
          opacity: [0.3, 0.7, 0.3],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
        className="absolute -bottom-6 -left-6 bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 rounded-full p-2"
      >
        <Brain className="w-4 h-4 text-blue-300" />
      </motion.div>
    </motion.div>
  );
}
