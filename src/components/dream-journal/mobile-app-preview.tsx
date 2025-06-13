"use client";

import { motion } from "framer-motion";

export function MobileAppPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.6 }}
      className="relative max-w-sm mx-auto"
    >
      <div className="relative">
        {/* Just the image */}
        <img
          src="/Rem_Mobile_Mockup.png"
          alt="Rem Mobile App Preview"
          className="w-full h-auto object-contain"
        />

        {/* Floating elements */}
        <motion.div
          animate={{
            y: [0, -10, 0],
            rotate: [0, 5, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-6 -right-6 w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full opacity-20 blur-sm"
        />

        <motion.div
          animate={{
            y: [0, 10, 0],
            rotate: [0, -5, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -bottom-4 -left-4 w-8 h-8 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full opacity-20 blur-sm"
        />
      </div>
    </motion.div>
  );
}
