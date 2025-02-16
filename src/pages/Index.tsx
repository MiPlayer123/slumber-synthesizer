import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <motion.h1 
          className="text-5xl font-bold text-dream-600 mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Slumber Synthesizer: Dream Journaling
        </motion.h1>
        
        <motion.p 
          className="text-xl text-muted-foreground mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Record, analyze, and explore your dreams in a beautiful and secure environment.
        </motion.p>
        
        <motion.div 
          className="flex justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Button 
            size="lg" 
            onClick={() => navigate("/journal")}
            className="dream-button"
          >
            Start Journaling
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            onClick={() => navigate("/community")}
          >
            Explore Dreams
          </Button>
        </motion.div>
      </div>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
        <div className="glass-card p-6">
          <h3 className="text-xl font-semibold mb-2">Record Dreams</h3>
          <p className="text-muted-foreground">
            Capture your dreams in rich detail with our intuitive journal.
          </p>
        </div>
        <div className="glass-card p-6">
          <h3 className="text-xl font-semibold mb-2">AI Analysis</h3>
          <p className="text-muted-foreground">
            Gain insights into patterns and themes in your dreams.
          </p>
        </div>
        <div className="glass-card p-6">
          <h3 className="text-xl font-semibold mb-2">Share & Connect</h3>
          <p className="text-muted-foreground">
            Join a community of dreamers and share your experiences.
          </p>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="bg-gray-100 py-12 mt-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8">What Our Users Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-6 shadow rounded-lg">
              <p className="text-muted-foreground mb-4">
                "This app has completely changed the way I understand my dreams. The AI analysis is spot on!"
              </p>
              <h4 className="font-semibold">- Alex D.</h4>
            </div>
            <div className="bg-white p-6 shadow rounded-lg">
              <p className="text-muted-foreground mb-4">
                "I love the community aspect. Sharing dreams and getting feedback is so rewarding."
              </p>
              <h4 className="font-semibold">- Jamie L.</h4>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="py-12 mt-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8">Affordable Pricing Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 shadow rounded-lg">
              <h3 className="text-xl font-bold mb-4">Free</h3>
              <p className="text-muted-foreground mb-4">Basic journaling features.</p>
              <Button size="lg">Get Started</Button>
            </div>
            <div className="bg-white p-6 shadow rounded-lg">
              <h3 className="text-xl font-bold mb-4">Pro</h3>
              <p className="text-muted-foreground mb-4">Advanced AI analysis and community features.</p>
              <Button size="lg">Upgrade</Button>
            </div>
            <div className="bg-white p-6 shadow rounded-lg">
              <h3 className="text-xl font-bold mb-4">Premium</h3>
              <p className="text-muted-foreground mb-4">All features with priority support.</p>
              <Button size="lg">Subscribe</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Call-to-Action Section */}
      <div className="bg-dream-600 py-12 text-white text-center mt-16">
        <h2 className="text-3xl font-bold mb-4">Ready to Start Your Dream Journey?</h2>
        <p className="text-xl mb-8">Join thousands of dreamers today.</p>
        <Button size="lg" onClick={() => navigate("/signup")}>Sign Up Now</Button>
      </div>

      {/* Footer Section */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="max-w-4xl mx-auto text-center">
          <p className="mb-4">&copy; 2025 Dream Journal. All rights reserved.</p>
          <div className="flex justify-center gap-4">
            <a href="/privacy" className="hover:underline">Privacy Policy</a>
            <a href="/terms" className="hover:underline">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
