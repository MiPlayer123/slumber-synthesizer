import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useEffect } from "react";
import {
  MoonIcon,
  StarIcon,
  BookOpenIcon,
  BrainIcon,
  UsersIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    document.title = "Rem";

    // Redirect to journal if user is already logged in
    if (user) {
      navigate("/journal");
      return;
    }

    // Check if we need to scroll to features section
    const shouldScrollToFeatures = sessionStorage.getItem("scrollToFeatures");
    if (shouldScrollToFeatures === "true") {
      // Remove the flag from storage
      sessionStorage.removeItem("scrollToFeatures");

      // Scroll to features section with a slight delay to ensure the page is fully loaded
      setTimeout(() => {
        const featuresSection = document.getElementById("features");
        if (featuresSection) {
          featuresSection.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
  }, [user, navigate]);

  // Animation variants
  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7 },
  };

  const staggerContainer = {
    animate: { transition: { staggerChildren: 0.1 } },
  };

  const floatAnimation = {
    initial: { y: 0 },
    animate: {
      y: [0, -10, 0],
      transition: { repeat: Infinity, duration: 6, ease: "easeInOut" },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950/90 via-purple-900/80 to-indigo-950/90 text-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-20 pb-32 relative">
        <motion.div
          className="absolute top-20 right-20 text-purple-300/30 hidden md:block"
          animate={{ rotate: 360 }}
          transition={{ duration: 200, repeat: Infinity, ease: "linear" }}
        >
          <StarIcon size={40} />
        </motion.div>

        <motion.div
          className="absolute bottom-40 left-20 text-blue-300/20 hidden md:block"
          {...floatAnimation}
        >
          <MoonIcon size={60} />
        </motion.div>

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex justify-center mb-6">
              <div className="p-3 bg-purple-500/20 backdrop-blur rounded-full">
                <MoonIcon size={40} className="text-purple-200" />
              </div>
            </div>
          </motion.div>

          <motion.h1
            className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-200 to-blue-200"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            Capture and share the ephemeral world of dreams
          </motion.h1>

          <motion.p
            className="text-xl text-purple-100/90 mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            Record your dreams, uncover hidden patterns, and connect with a
            community of dreamers in a beautiful, secure space.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
          >
            <Button
              size="lg"
              onClick={() => navigate("/journal")}
              className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white border-0 px-8 py-6 text-lg"
            >
              Start Your Dream Journal
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/community")}
              className="border-purple-300 text-purple-500 hover:bg-purple-900/30 px-8 py-6 text-lg"
            >
              Explore Dreams
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <div
        id="features"
        className="container mx-auto px-4 py-24 bg-indigo-950/40 backdrop-blur-sm"
      >
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, amount: 0.3 }}
          className="max-w-4xl mx-auto"
        >
          <motion.h2
            variants={fadeIn}
            className="text-3xl md:text-4xl font-bold text-center mb-16 text-purple-100"
          >
            Your dream experience, evolved
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <motion.div variants={fadeIn} className="feature-card">
              <div className="mb-6 flex justify-center">
                <div className="p-4 rounded-full bg-purple-500/20 backdrop-blur">
                  <BookOpenIcon className="h-8 w-8 text-purple-300" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-center text-purple-100">
                Journal With Ease
              </h3>
              <p className="text-center text-purple-200/80">
                Capture rich dream details with our intuitive journaling tools
                designed for both quick entries and deep reflection.
              </p>
            </motion.div>

            <motion.div variants={fadeIn} className="feature-card">
              <div className="mb-6 flex justify-center">
                <div className="p-4 rounded-full bg-purple-500/20 backdrop-blur">
                  <BrainIcon className="h-8 w-8 text-purple-300" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-center text-purple-100">
                AI-Powered Insights
              </h3>
              <p className="text-center text-purple-200/80">
                Discover patterns, symbols, and meanings in your dreams with our
                thoughtful AI analysis.
              </p>
            </motion.div>

            <motion.div variants={fadeIn} className="feature-card">
              <div className="mb-6 flex justify-center">
                <div className="p-4 rounded-full bg-purple-500/20 backdrop-blur">
                  <UsersIcon className="h-8 w-8 text-purple-300" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-center text-purple-100">
                Dream Community
              </h3>
              <p className="text-center text-purple-200/80">
                Share experiences and connect with fellow dreamers in a
                supportive, respectful environment.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Testimonial Section - Simplified */}
      <div className="container mx-auto px-4 py-24">
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, amount: 0.3 }}
          className="max-w-3xl mx-auto"
        >
          <motion.h2
            variants={fadeIn}
            className="text-3xl md:text-4xl font-bold text-center mb-12 text-purple-100"
          >
            Stories from the dreamscape
          </motion.h2>

          <div className="space-y-6">
            <motion.div
              variants={fadeIn}
              className="p-8 rounded-xl bg-purple-800/20 backdrop-blur border border-purple-500/20"
            >
              <p className="text-purple-100 italic mb-4">
                "Rem has transformed how I connect with my dreams. The insights
                I've gained have been truly illuminating, and the community is
                wonderfully supportive."
              </p>
              <p className="text-right text-purple-300 font-medium">
                — Alex D.
              </p>
            </motion.div>

            <motion.div
              variants={fadeIn}
              className="p-8 rounded-xl bg-indigo-800/20 backdrop-blur border border-indigo-500/20"
            >
              <p className="text-purple-100 italic mb-4">
                "I've kept dream journals for years, but Rem brings a whole new
                dimension to the practice. The AI analysis has helped me
                understand recurring themes I never noticed before."
              </p>
              <p className="text-right text-purple-300 font-medium">
                — Jamie L.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* CTA Section */}
      <motion.div
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        className="container mx-auto px-4 py-20"
      >
        <motion.div
          variants={fadeIn}
          className="max-w-3xl mx-auto text-center p-12 rounded-3xl bg-gradient-to-r from-purple-600/30 to-indigo-600/30 backdrop-blur-md border border-purple-500/30"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
            Begin your dream journey
          </h2>
          <p className="text-xl text-purple-100 mb-8">
            Join thousands exploring their subconscious mind and connecting
            through dreams.
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="bg-white text-purple-900 hover:bg-purple-100 px-8 py-6 text-lg font-medium"
          >
            Start Free
          </Button>
        </motion.div>
      </motion.div>

      {/* Footer */}
      <footer className="bg-indigo-950/80 border-t border-purple-500/20 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8">
            <div className="flex items-center mb-4 md:mb-0">
              <span className="text-xl font-bold text-purple-100">REM</span>
            </div>
            <div className="flex space-x-6">
              <a
                href="/about"
                className="text-purple-300 hover:text-white transition"
              >
                About
              </a>
              <a
                href="https://forms.gle/aMFrfqbqiMMBSEKr9"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-300 hover:text-white transition"
              >
                Support
              </a>
              <a
                href="/privacy"
                className="text-purple-300 hover:text-white transition"
              >
                Privacy
              </a>
              <a
                href="/terms"
                className="text-purple-300 hover:text-white transition"
              >
                Terms
              </a>
            </div>
          </div>
          <div className="text-center text-purple-400 text-sm">
            <p>&copy; {new Date().getFullYear()} REM. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
