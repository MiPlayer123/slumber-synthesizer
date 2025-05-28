"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const testimonials = [
  {
    quote:
      "okay so i've been using this for like 3 months now and WOW. i used to forget my dreams 5 minutes after waking up but now i'm remembering so much more! the AI thing actually picked up on patterns i never noticed. lowkey life changing ngl 😭",
    author: "sarah_dreams22",
    avatar: "S",
    color: "from-purple-500 to-blue-500",
  },
  {
    quote:
      "been journaling my dreams for years but this app hits different!! the community is so wholesome and supportive. love reading other people's wild dreams lol. also the analysis feature is chef's kiss 👌",
    author: "mikethevibe",
    avatar: "M",
    color: "from-blue-500 to-cyan-500",
  },
  {
    quote:
      "y'all this app is actually insane. had the weirdest nightmare last week and posted it here... the comments and insights helped me work through some stuff i didn't even realize was bothering me. definitely recommend!!",
    author: "dreamerforlife",
    avatar: "D",
    color: "from-cyan-500 to-green-500",
  },
];

export function TestimonialSlider() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative max-w-3xl mx-auto">
      <div className="h-[300px] relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
          >
            <div className="relative h-full">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-xl"></div>
              <div className="relative h-full flex flex-col justify-center p-8 text-center">
                <div className="mb-6">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <motion.span
                      key={star}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 * star, duration: 0.3 }}
                      className="inline-block mx-1"
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        xmlns="http://www.w3.org/2000/svg"
                        className="text-purple-400"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </motion.span>
                  ))}
                </div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="text-white/80 text-lg mb-6 italic"
                >
                  "{testimonials[current].quote}"
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="flex items-center justify-center gap-3"
                >
                  <div
                    className={`w-10 h-10 rounded-full bg-gradient-to-r ${testimonials[current].color} flex items-center justify-center text-black font-bold`}
                  >
                    {testimonials[current].avatar}
                  </div>
                  <span className="font-medium">
                    {testimonials[current].author}
                  </span>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex justify-center gap-2 mt-6">
        {testimonials.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i === current ? "bg-white w-6" : "bg-white/30"
            }`}
            aria-label={`Go to testimonial ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
