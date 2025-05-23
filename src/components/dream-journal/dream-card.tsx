"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export function DreamCard({ dream, index }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true }}
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${dream.color} rounded-xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-300`}
      ></div>
      <motion.div
        className="relative bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden h-full"
        animate={{
          scale: isHovered ? 1.02 : 1,
          y: isHovered ? -5 : 0,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-medium">{dream.title}</h3>
            <span className="text-xs text-white/50">{dream.date}</span>
          </div>
          <p className="text-white/70 mb-6">{dream.excerpt}</p>
          <div className="flex flex-wrap gap-2">
            {dream.tags.map((tag, i) => (
              <span
                key={i}
                className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/70"
              >
                #{tag}
              </span>
            ))}
          </div>
          <motion.div
            className="mt-6 flex items-center gap-2 text-sm text-white/50 cursor-pointer"
            whileHover={{ color: "rgba(255, 255, 255, 0.9)" }}
          >
            <span>Read more</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
