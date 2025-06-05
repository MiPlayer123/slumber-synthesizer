import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const About = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If already on homepage, scroll to features section
    if (location.pathname === "/") {
      const featuresSection = document.getElementById("features");
      if (featuresSection) {
        featuresSection.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      // Otherwise navigate to homepage first, then use onLoad to scroll
      navigate("/", { replace: true });
      // Set a flag in sessionStorage to indicate we need to scroll to features after navigation
      sessionStorage.setItem("scrollToFeatures", "true");
    }
  }, [navigate, location.pathname]);

  // This component doesn't render anything as it immediately redirects
  return null;
};

export default About;
