"use client";

import { useRef, useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import DreamScene from "@/components/dream-scene";
import { DreamCard } from "@/components/dream-card";
import { FeatureGrid } from "@/components/feature-grid";
import { TestimonialSlider } from "@/components/testimonial-slider";
import { FloatingNav } from "@/components/floating-nav";
import { ParticleField } from "@/components/particle-field";
import { DreamGlobe } from "@/components/dream-globe";
import { DreamStatistics } from "@/components/dream-statistics";
import { DreamImageGenerator } from "@/components/dream-image-generator";
import { DreamSharing } from "@/components/dream-sharing";
import { DreamAnalysis } from "@/components/dream-analysis";
import { Brain, BarChart, Sparkles, Share2 } from "lucide-react";

// Define the interface for dream items
interface DreamItem {
  id: number;
  title: string;
  color: string;
}

export default function Home() {
  const [scrollY, setScrollY] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  const sampleDreamData = [
    {
      id: 1,
      title: "Flying over mountains",
      color: "#8b5cf6",
    },
    {
      id: 2,
      title: "Lost in a maze",
      color: "#3b82f6",
    },
    {
      id: 3,
      title: "Underwater city",
      color: "#06b6d4",
    },
    {
      id: 4,
      title: "Chased by shadows",
      color: "#10b981",
    },
    {
      id: 5,
      title: "Floating in space",
      color: "#8b5cf6",
    },
  ];

  const [selectedDream, setSelectedDream] = useState<DreamItem | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleScroll = () => {
        setScrollY(window.scrollY);
      };

      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => window.removeEventListener("scroll", handleScroll);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-white overflow-x-hidden">
      {/* Particle Background */}
      <div className="fixed inset-0 z-0 opacity-30">
        <ParticleField />
      </div>

      {/* Header */}
      <FloatingNav />

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 30 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md md:hidden"
          >
            <div className="flex flex-col h-full p-6">
              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-2">
                  <img
                    src="/apple-touch-icon.png"
                    alt="REM Logo"
                    className="h-8 w-8"
                  />
                  <span className="text-lg font-medium tracking-tight">
                    Rem
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-white"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </Button>
              </div>
              <nav className="flex flex-col gap-6 text-lg">
                <a
                  href="#features"
                  className="py-2 hover:text-purple-400 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Features
                </a>
                <a
                  href="#testimonials"
                  className="py-2 hover:text-purple-400 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Testimonials
                </a>
                <a
                  href="#"
                  className="py-2 hover:text-purple-400 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  About
                </a>
                <a
                  href="#"
                  className="py-2 hover:text-purple-400 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Blog
                </a>
              </nav>
              <div className="mt-auto space-y-4">
                <Button
                  variant="ghost"
                  className="w-full text-white hover:bg-white/10"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Log in
                </Button>
                <Button
                  className="w-full bg-white text-black hover:bg-white/90"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign up
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10">
        {/* Hero Section */}
        <section
          ref={heroRef}
          className="relative min-h-screen flex items-center justify-center overflow-hidden"
        >
          <div className="absolute inset-0 z-0">
            <DreamScene scrollY={scrollY} />
          </div>

          <div className="container mx-auto px-6 py-24 md:py-32 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="max-w-3xl mx-auto text-center space-y-6"
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80">
                Capture and share the ephemeral world of dreams
              </h1>
              <p className="text-lg text-white/70 max-w-2xl mx-auto">
                Record your dreams, uncover hidden patterns, and connect with a
                community of dreamers in a beautiful, secure space.
              </p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="flex flex-col sm:flex-row justify-center gap-4 pt-4"
              >
                <Button
                  size="lg"
                  className="bg-white text-black hover:bg-white/90 transition-all duration-300 hover:scale-105"
                >
                  Start Your Dream Journal
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10 hover:border-white/30 transition-all duration-300 hover:scale-105"
                >
                  Explore Dreams
                </Button>
              </motion.div>
            </motion.div>
          </div>

          <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-10">
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2 }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white/50"
              >
                <path d="M12 5v14M19 12l-7 7-7-7" />
              </svg>
            </motion.div>
          </div>
        </section>

        {/* Dream Cards Section */}
        <section className="relative py-24 overflow-hidden">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: "Flying over mountains",
                  date: "Yesterday",
                  excerpt:
                    "I was soaring over snow-capped mountains, feeling the cold air against my face...",
                  tags: ["flying", "mountains", "freedom"],
                  color: "from-purple-500/20 to-blue-500/20",
                },
                {
                  title: "Lost in a maze",
                  date: "3 days ago",
                  excerpt:
                    "The walls kept shifting around me, creating new pathways and dead ends...",
                  tags: ["maze", "confusion", "searching"],
                  color: "from-blue-500/20 to-cyan-500/20",
                },
                {
                  title: "Underwater city",
                  date: "Last week",
                  excerpt:
                    "I discovered a civilization living in transparent domes beneath the ocean...",
                  tags: ["underwater", "discovery", "city"],
                  color: "from-cyan-500/20 to-green-500/20",
                },
              ].map((dream, i) => (
                <DreamCard key={i} dream={dream} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* Interactive Dream Globe Section */}
        <section className="relative py-24 overflow-hidden">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 1 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                Explore the Dreamscape
              </h2>
              <p className="text-white/70 mt-2 max-w-2xl mx-auto">
                Interact with our 3D dream globe to discover patterns and
                connections across the collective unconscious.
              </p>
              <div className="w-16 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 mx-auto mt-4"></div>
            </motion.div>

            <DreamGlobe
              dreamData={sampleDreamData}
              onDreamSelect={(dream) => setSelectedDream(dream)}
            />

            {selectedDream && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-6 max-w-lg mx-auto"
              >
                <h3 className="text-xl font-medium mb-2">
                  {selectedDream.title}
                </h3>
                <p className="text-white/70">
                  You've selected a dream node. In the full version, you would
                  see details and connections to similar dreams.
                </p>
              </motion.div>
            )}
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="relative py-24">
          <FeatureGrid />
        </section>

        {/* Dream Analysis Section */}
        <section className="relative py-24 overflow-hidden">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 1 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <div className="inline-flex items-center justify-center gap-2 bg-white/5 px-3 py-1 rounded-full text-sm font-medium mb-4">
                <Brain className="w-4 h-4 text-purple-400" />
                <span>AI-Powered Analysis</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                Understand Your Dreams
              </h2>
              <div className="w-16 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 mx-auto mt-4"></div>
            </motion.div>

            <DreamAnalysis />
          </div>
        </section>

        {/* Dream Statistics Section */}
        <section className="relative py-24 overflow-hidden">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 1 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <div className="inline-flex items-center justify-center gap-2 bg-white/5 px-3 py-1 rounded-full text-sm font-medium mb-4">
                <BarChart className="w-4 h-4 text-blue-400" />
                <span>Dream Patterns</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                Track Your Dream Patterns
              </h2>
              <div className="w-16 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 mx-auto mt-4"></div>
            </motion.div>

            <DreamStatistics />
          </div>
        </section>

        {/* Dream Image Generator Section */}
        <section className="relative py-24 overflow-hidden">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 1 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <div className="inline-flex items-center justify-center gap-2 bg-white/5 px-3 py-1 rounded-full text-sm font-medium mb-4">
                <Sparkles className="w-4 h-4 text-green-400" />
                <span>Dream Visualization</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                Visualize Your Dreams
              </h2>
              <div className="w-16 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 mx-auto mt-4"></div>
            </motion.div>

            <div className="max-w-2xl mx-auto">
              <DreamImageGenerator />
            </div>
          </div>
        </section>

        {/* Dream Sharing Section */}
        <section className="relative py-24 overflow-hidden">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 1 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <div className="inline-flex items-center justify-center gap-2 bg-white/5 px-3 py-1 rounded-full text-sm font-medium mb-4">
                <Share2 className="w-4 h-4 text-cyan-400" />
                <span>Dream Community</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                Share Your Dreams
              </h2>
              <div className="w-16 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 mx-auto mt-4"></div>
            </motion.div>

            <DreamSharing />
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="relative py-24">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 1 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                Stories from the dreamscape
              </h2>
              <div className="w-16 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 mx-auto mt-4"></div>
            </motion.div>

            <TestimonialSlider />
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative py-24">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="max-w-2xl mx-auto text-center"
            >
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
                Begin your dream journey
              </h2>
              <p className="text-white/70 mb-8">
                Join thousands exploring their subconscious mind and connecting
                through dreams.
              </p>
              <Button
                size="lg"
                className="bg-white text-black hover:bg-white/90 transition-all duration-300 hover:scale-105"
              >
                Start Free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img
                  src="/apple-touch-icon.png"
                  alt="REM Logo"
                  className="h-8 w-8"
                />
                <span className="text-lg font-medium tracking-tight">Rem</span>
              </div>
              <p className="text-sm text-white/50">
                Explore the world of dreams with our innovative journaling
                platform.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-4">Features</h3>
              <ul className="space-y-2 text-sm text-white/50">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Dream Journal
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    AI Analysis
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Community
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Privacy
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-white/50">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-white/50">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Terms
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Cookies
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-12 pt-8 text-center text-sm text-white/50">
            <p>© {new Date().getFullYear()} Rem. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
