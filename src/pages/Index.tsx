import { useRef, useState, useEffect } from "react";
import { ArrowRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
// import DreamScene from "@/components/dream-journal/dream-scene";
import { FeatureGrid } from "@/components/dream-journal/feature-grid";
import { TestimonialSlider } from "@/components/dream-journal/testimonial-slider";
import { ParticleField } from "@/components/dream-journal/particle-field";
import { DreamStatistics } from "@/components/dream-journal/dream-statistics";
import { DreamImageGenerator } from "@/components/dream-journal/dream-image-generator";
import { DreamSharing } from "@/components/dream-journal/dream-sharing";
import { DreamAnalysis } from "@/components/dream-journal/dream-analysis";
import { MobileAppPreview } from "@/components/dream-journal/mobile-app-preview";
import { AppStoreBadges } from "@/components/ui/app-store-badges";
import { Brain, BarChart, Sparkles, Share2 } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  getDeviceType,
  getMobileDownloadUrl,
  type DeviceType,
} from "@/utils/device-detection";

export default function Index() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { loading } = useAuth();
  const navigate = useNavigate();
  const [deviceType, setDeviceType] = useState<DeviceType>("web");

  // Detect device type on mount
  useEffect(() => {
    setDeviceType(getDeviceType());
  }, []);

  // Handle "Download Now" - smart routing based on device
  const handleDownloadNow = () => {
    if (deviceType === "web") {
      // Store sign-up preference in sessionStorage so Auth page knows to show sign-up form
      sessionStorage.setItem("auth-mode", "signup");
      navigate("/auth");
    } else {
      // Redirect to appropriate app store
      const downloadUrl = getMobileDownloadUrl(deviceType);
      window.open(downloadUrl, "_blank");
    }
  };

  // Handle "Sign Up Free" - navigate to auth page in sign-up mode
  const handleSignUpFree = () => {
    // Store sign-up preference in sessionStorage so Auth page knows to show sign-up form
    sessionStorage.setItem("auth-mode", "signup");
    navigate("/auth");
  };

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
        <section
          ref={heroRef}
          className="relative min-h-[90vh] flex items-center justify-center overflow-hidden"
        >
          <div className="absolute inset-0 z-0">
            {/* Temporarily disabled DreamScene */}
            {/* <DreamScene scrollY={scrollY} /> */}
            <div className="w-full h-full bg-gradient-to-br from-purple-900/20 to-blue-900/20" />
          </div>

          <div className="container mx-auto px-6 py-16 md:py-24 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[70vh]">
              {/* Left side - Value proposition and CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="space-y-8 text-center lg:text-left"
              >
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-300 via-blue-400 to-cyan-400 drop-shadow-lg">
                  Track Your Dreams,
                  <br />
                  Transform Your Mind
                </h1>
                <p className="text-base md:text-lg text-white/80 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                  Join hundreds using AI-powered dream analysis to unlock
                  insights into their subconscious mind and improve mental
                  wellness.
                </p>

                {/* Social Proof */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="flex items-center justify-center lg:justify-start gap-4 text-xs text-white/60"
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                    <span>Free to start</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                    <span>Explore the community</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                    <span>AI insights</span>
                  </div>
                </motion.div>

                {/* Bold CTAs */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="flex flex-col justify-center lg:justify-start gap-4"
                >
                  {/* CTA Buttons Row */}
                  <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
                    {/* Primary CTA - Download Now */}
                    <Button
                      onClick={handleDownloadNow}
                      disabled={loading}
                      size="lg"
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold text-lg px-8 py-6 h-auto rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25 border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="flex items-center gap-3">
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            Loading...
                          </>
                        ) : (
                          <>
                            <Download className="w-5 h-5" />
                            Download Now
                          </>
                        )}
                      </span>
                    </Button>

                    {/* Secondary CTA - Sign Up Free */}
                    <Button
                      onClick={handleSignUpFree}
                      disabled={loading}
                      size="lg"
                      variant="outline"
                      className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 hover:border-white/30 font-semibold text-lg px-8 py-6 h-auto rounded-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="flex items-center gap-3">
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            Signing Up...
                          </>
                        ) : (
                          <>
                            Sign Up Free
                            <ArrowRight className="w-5 h-5" />
                          </>
                        )}
                      </span>
                    </Button>
                  </div>

                  {/* App Store Badges */}
                  <AppStoreBadges />
                </motion.div>

                {/* Trust indicators */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  className="text-sm text-white/50"
                >
                  Free forever. No credit card required. Cancel anytime.
                </motion.div>
              </motion.div>

              {/* Right side - App Preview */}
              <div className="relative lg:block hidden">
                <MobileAppPreview />
              </div>
            </div>

            {/* Mobile app preview - shown below on mobile */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="lg:hidden mt-12"
            >
              <MobileAppPreview />
            </motion.div>
          </div>
        </section>

        {/* Mobile App Available - Brief */}
        <section className="relative py-8 bg-gradient-to-r from-purple-900/10 to-blue-900/10">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <p className="text-white/70 text-lg">
                📱{" "}
                <span className="text-white font-large">
                  Now available on mobile
                </span>{" "}
                - Record dreams anywhere, anytime
              </p>
            </motion.div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="relative pt-8 pb-16">
          <FeatureGrid />
        </section>

        {/* Dream Image Generator Section */}
        <section className="relative py-24 overflow-hidden bg-gradient-to-r from-purple-900/15 to-slate-900/20">
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
              <div className="w-16 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 mx-auto mt-4" />
            </motion.div>
            <div className="max-w-2xl mx-auto">
              <DreamImageGenerator />
            </div>
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
              <div className="w-16 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 mx-auto mt-4" />
            </motion.div>

            <DreamStatistics />
          </div>
        </section>

        {/* Dream Analysis Section */}
        <section className="relative py-24 overflow-hidden bg-gradient-to-l from-slate-900/20 to-gray-800/20">
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
              <div className="w-16 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 mx-auto mt-4" />
            </motion.div>

            <DreamAnalysis />
          </div>
        </section>

        {/* Dream Sharing Section - Moved above Features Grid */}
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
              <div className="w-16 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 mx-auto mt-4" />
            </motion.div>

            <DreamSharing />
          </div>
        </section>

        {/* Testimonials */}
        <section
          id="testimonials"
          className="relative py-24 bg-gradient-to-l from-slate-900/20 to-gray-900/20"
        >
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
              <div className="w-16 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 mx-auto mt-4" />
            </motion.div>

            <TestimonialSlider />
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative py-24 bg-gradient-to-r from-purple-900/20 to-blue-900/20">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="max-w-4xl mx-auto text-center"
            >
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-blue-300">
                Ready to unlock your mind's mysteries?
              </h2>
              <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto leading-relaxed">
                Join thousands of dreamers discovering hidden patterns and
                insights through AI-powered dream analysis.
              </p>

              {/* Social proof numbers */}
              {/*
              <div className="flex items-center justify-center gap-8 mb-10 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">10,000+</div>
                  <div className="text-white/60">Active users</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">50,000+</div>
                  <div className="text-white/60">Dreams analyzed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">4.8★</div>
                  <div className="text-white/60">User rating</div>
                </div>
              </div>
              */}

              {/* Bold CTA buttons */}
              <div className="flex flex-col justify-center gap-4 mb-6">
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Button
                    onClick={handleDownloadNow}
                    disabled={loading}
                    size="lg"
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold text-xl px-10 py-7 h-auto rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25 border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center gap-3">
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                          Loading...
                        </>
                      ) : (
                        <>
                          <Download className="w-6 h-6" />
                          Download Now
                        </>
                      )}
                    </span>
                  </Button>

                  <Button
                    onClick={handleSignUpFree}
                    disabled={loading}
                    size="lg"
                    variant="outline"
                    className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 hover:border-white/30 font-semibold text-xl px-10 py-7 h-auto rounded-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center gap-3">
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                          Signing Up...
                        </>
                      ) : (
                        <>
                          Sign Up Free
                          <ArrowRight className="w-6 h-6" />
                        </>
                      )}
                    </span>
                  </Button>
                </div>

                {/* App Store Badges */}
                <AppStoreBadges centerAlign />
              </div>

              {/* Trust indicators */}
              <p className="text-sm text-white/50">
                ✨ No credit card required • 🔒 Your dreams stay private • 🎯
                Cancel anytime
              </p>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-8">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            {/* Brand Section */}
            <div className="max-w-sm">
              <div className="flex items-center gap-2 mb-3">
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

            {/* Links Section */}
            <div className="flex flex-wrap gap-8 md:gap-12">
              {/* Product Links */}
              <div>
                <h3 className="text-sm font-medium mb-3 text-white">Product</h3>
                <ul className="space-y-2 text-sm text-white/50">
                  <li>
                    <a
                      href="#features"
                      className="hover:text-white transition-colors"
                    >
                      Features
                    </a>
                  </li>
                  <li>
                    <a
                      href="#testimonials"
                      className="hover:text-white transition-colors"
                    >
                      Community
                    </a>
                  </li>
                  <li>
                    <span className="text-white">Mobile App Available</span>
                  </li>
                </ul>
              </div>

              {/* Legal Links */}
              <div>
                <h3 className="text-sm font-medium mb-3 text-white">Legal</h3>
                <ul className="space-y-2 text-sm text-white/50">
                  <li>
                    <a
                      href="/about"
                      className="hover:text-white transition-colors"
                    >
                      About
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://forms.gle/aMFrfqbqiMMBSEKr9"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white transition-colors"
                    >
                      Support
                    </a>
                  </li>
                  <li>
                    <a
                      href="/privacy"
                      className="hover:text-white transition-colors"
                    >
                      Privacy
                    </a>
                  </li>
                  <li>
                    <a
                      href="/terms"
                      className="hover:text-white transition-colors"
                    >
                      Terms
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-6 pt-6 border-t border-white/5 text-center">
            <p className="text-xs text-white/40">
              © {new Date().getFullYear()} Rem. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
