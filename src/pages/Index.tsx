import { useRef, useState, useEffect } from "react";
import { ArrowRight, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import DreamScene from "@/components/dream-journal/dream-scene";
import { FeatureGrid } from "@/components/dream-journal/feature-grid";
import { TestimonialSlider } from "@/components/dream-journal/testimonial-slider";
import { ParticleField } from "@/components/dream-journal/particle-field";
import { DreamStatistics } from "@/components/dream-journal/dream-statistics";
import { DreamImageGenerator } from "@/components/dream-journal/dream-image-generator";
import { DreamSharing } from "@/components/dream-journal/dream-sharing";
import { DreamAnalysis } from "@/components/dream-journal/dream-analysis";
import { Brain, BarChart, Sparkles, Share2 } from "lucide-react";
import { Navigation } from "@/components/Navigation";

interface DreamItem {
  id: number;
  title: string;
  color: string;
}

export default function Index() {
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#1a0b2e] text-white overflow-x-hidden">
      {/* Particle Background */}
      <div className="fixed inset-0 z-0 opacity-30">
        <ParticleField />
      </div>

      {/* Header */}
      <Navigation />

      {/* Navigation renders mobile menu automatically */}

      <main className="relative z-10">
        {/* Hero Section */}
        <section ref={heroRef} className="relative min-h-[80vh] flex items-center justify-center overflow-hidden pb-12">
          <div className="absolute inset-0 z-0">
            <DreamScene scrollY={scrollY} />
          </div>

          <div className="container mx-auto px-6 py-16 md:py-24 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="max-w-3xl mx-auto text-center space-y-6"
            >
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-300 via-blue-400 to-cyan-400 drop-shadow-lg">
                Capture and share the ephemeral world of dreams
              </h1>
              <p className="text-lg text-white/70 max-w-2xl mx-auto">
                Record your dreams, uncover hidden patterns, and connect with a community of dreamers in a beautiful,
                secure space.
              </p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="flex flex-col sm:flex-row justify-center gap-4 pt-4"
              >
                <Button size="lg" className="bg-white text-black hover:bg-white/90 transition-all duration-300 hover:scale-105">
                  Start Your Dream Journal
                </Button>
                <Button size="lg" className="bg-white text-black hover:bg-white/90 transition-all duration-300 hover:scale-105">
                  Explore Dreams
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Dream Cards Section */}
        {/* Dream Cards Section removed; statistics below already show patterns and trends */}

        {/* Features Grid */}
        <section id="features" className="relative pt-8 pb-16">
          <FeatureGrid />
        </section>

        {/* Dream Analysis Section */}
        <section className="relative py-24 overflow-hidden">
          <div className="container mx-auto px-6">
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 1 }} viewport={{ once: true }} className="text-center mb-16">
              <div className="inline-flex items-center justify-center gap-2 bg-white/5 px-3 py-1 rounded-full text-sm font-medium mb-4">
                <Brain className="w-4 h-4 text-purple-400" />
                <span>AI-Powered Analysis</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Understand Your Dreams</h2>
              <div className="w-16 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 mx-auto mt-4" />
            </motion.div>

            <DreamAnalysis />
          </div>
        </section>

        {/* Dream Statistics Section */}
        <section className="relative py-24 overflow-hidden">
          <div className="container mx-auto px-6">
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 1 }} viewport={{ once: true }} className="text-center mb-16">
              <div className="inline-flex items-center justify-center gap-2 bg-white/5 px-3 py-1 rounded-full text-sm font-medium mb-4">
                <BarChart className="w-4 h-4 text-blue-400" />
                <span>Dream Patterns</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Track Your Dream Patterns</h2>
              <div className="w-16 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 mx-auto mt-4" />
            </motion.div>

            <DreamStatistics />
          </div>
        </section>

        {/* Dream Image Generator Section */}
        <section className="relative py-24 overflow-hidden">
          <div className="container mx-auto px-6">
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 1 }} viewport={{ once: true }} className="text-center mb-16">
              <div className="inline-flex items-center justify-center gap-2 bg-white/5 px-3 py-1 rounded-full text-sm font-medium mb-4">
                <Sparkles className="w-4 h-4 text-green-400" />
                <span>Dream Visualization</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Visualize Your Dreams</h2>
              <div className="w-16 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 mx-auto mt-4" />
            </motion.div>

            <div className="max-w-2xl mx-auto">
              <DreamImageGenerator />
            </div>
          </div>
        </section>

        {/* Dream Sharing Section */}
        <section className="relative py-24 overflow-hidden">
          <div className="container mx-auto px-6">
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 1 }} viewport={{ once: true }} className="text-center mb-16">
              <div className="inline-flex items-center justify-center gap-2 bg-white/5 px-3 py-1 rounded-full text-sm font-medium mb-4">
                <Share2 className="w-4 h-4 text-cyan-400" />
                <span>Dream Community</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Share Your Dreams</h2>
              <div className="w-16 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 mx-auto mt-4" />
            </motion.div>

            <DreamSharing />
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="relative py-24">
          <div className="container mx-auto px-6">
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 1 }} viewport={{ once: true }} className="text-center mb-16">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Stories from the dreamscape</h2>
              <div className="w-16 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 mx-auto mt-4" />
            </motion.div>

            <TestimonialSlider />
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative py-24">
          <div className="container mx-auto px-6">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">Begin your dream journey</h2>
              <p className="text-white/70 mb-8">
                Join thousands exploring their subconscious mind and connecting through dreams.
              </p>
              <Button size="lg" className="bg-white text-black hover:bg-white/90 transition-all duration-300 hover:scale-105">
                Start Free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-1.5 rounded-full">
                  <Moon size={16} className="text-black" />
                </div>
                <span className="text-lg font-medium tracking-tight">Rem</span>
              </div>
              <p className="text-sm text-white/50">Explore the world of dreams with our innovative journaling platform.</p>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-4">Features</h3>
              <ul className="space-y-2 text-sm text-white/50">
                {[
                  "Dream Journal",
                  "AI Analysis",
                  "Community",
                  "Privacy",
                ].map((item, idx) => (
                  <li key={idx}>
                    <a href="#" className="hover:text-white transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-white/50">
                {["About Us", "Careers", "Contact"].map((item, idx) => (
                  <li key={idx}>
                    <a href="#" className="hover:text-white transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-4">Resources</h3>
              <ul className="space-y-2 text-sm text-white/50">
                {["Blog", "Help Center", "Terms of Service", "Privacy Policy"].map((item, idx) => (
                  <li key={idx}>
                    <a href="#" className="hover:text-white transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-8 text-center text-xs text-white/40">© {new Date().getFullYear()} Rem. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
