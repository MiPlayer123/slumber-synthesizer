
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <motion.h1 
          className="text-5xl font-bold text-dream-600 mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Treehacks project!!@
        </motion.h1>
        
        <motion.p 
          className="text-xl text-muted-foreground mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Record, analyze, and explore your dreams in a beautiful and secure environment
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
        
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <div className="glass-card p-6">
            <h3 className="text-xl font-semibold mb-2">Record Dreams</h3>
            <p className="text-muted-foreground">
              Capture your dreams in rich detail with our intuitive journal
            </p>
          </div>
          <div className="glass-card p-6">
            <h3 className="text-xl font-semibold mb-2">AI Analysis</h3>
            <p className="text-muted-foreground">
              Gain insights into patterns and themes in your dreams
            </p>
          </div>
          <div className="glass-card p-6">
            <h3 className="text-xl font-semibold mb-2">Share & Connect</h3>
            <p className="text-muted-foreground">
              Join a community of dreamers and share your experiences
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
