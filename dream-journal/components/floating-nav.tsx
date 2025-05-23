"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Moon, Menu } from "lucide-react";

export function FloatingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "py-3 bg-black/80 backdrop-blur-md border-b border-white/10"
          : "py-5"
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="container mx-auto px-6 flex justify-between items-center">
        <motion.div
          className="flex items-center gap-2"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400, damping: 10 }}
        >
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-1.5 rounded-full">
            <Moon size={18} className="text-black" />
          </div>
          <span className="text-lg font-medium tracking-tight">Rem</span>
        </motion.div>

        <nav className="hidden md:flex items-center gap-8">
          {["Features", "Testimonials", "About", "Blog"].map((item, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -2 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Link
                href={`#${item.toLowerCase()}`}
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                {item}
              </Link>
            </motion.div>
          ))}

          <div className="pl-4 flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Button
                variant="ghost"
                className="text-sm text-white/90 hover:text-white hover:bg-white/10"
              >
                Log in
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Button className="text-sm bg-white text-black hover:bg-white/90">
                Sign up
              </Button>
            </motion.div>
          </div>
        </nav>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
    </motion.header>
  );
}
