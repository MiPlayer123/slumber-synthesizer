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
          Treehacks Project
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
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
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
      </motion.div>

      {/* Testimonials Section */}
      <div className="mt-16 text-center">
        <h2 className="text-3xl font-bold mb-8">What Our Users Say</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 border rounded-lg">
            <p>"This app has completely changed how I understand my dreams!"</p>
            <p className="text-sm text-muted-foreground mt-4">- Alex D.</p>
          </div>
          <div className="p-6 border rounded-lg">
            <p>"The AI analysis is mind-blowing. I can see patterns I never noticed before."</p>
            <p className="text-sm text-muted-foreground mt-4">- Jamie R.</p>
          </div>
          <div className="p-6 border rounded-lg">
            <p>"I love connecting with others and learning from their dreams!"</p>
            <p className="text-sm text-muted-foreground mt-4">- Taylor S.</p>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="mt-16 text-center">
        <h2 className="text-3xl font-bold mb-8">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold mb-4">Step 1</h3>
            <p>Record your dreams using our journal interface.</p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold mb-4">Step 2</h3>
            <p>Analyze them with the power of AI.</p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold mb-4">Step 3</h3>
            <p>Connect with a community of dream enthusiasts.</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 text-center">
        <p className="text-sm text-muted-foreground">&copy; 2025 Treehacks Dream Project. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Index;
