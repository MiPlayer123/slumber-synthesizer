import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Terms = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Terms of Service | Rem";
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-950/90 via-purple-900/80 to-indigo-950/90 text-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Button
          variant="ghost"
          className="mb-8 text-purple-300 hover:text-white hover:bg-purple-900/30"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <h1 className="text-4xl font-bold text-purple-100 mb-8">Terms of Service</h1>
        
        <div className="space-y-8 text-purple-100">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-purple-200">1. Acceptance of Terms</h2>
            <p className="mb-3">
              By accessing or using Rem, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, 
              you may not access the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-purple-200">2. Description of Service</h2>
            <p className="mb-3">
              Rem is a dream journaling and analysis platform that allows users to record, analyze, and optionally share their dreams. 
              Our service includes AI-powered dream analysis, image generation, and community features.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-purple-200">3. User Accounts</h2>
            <p className="mb-3">
              To use certain features of our service, you must create an account. You are responsible for:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Promptly notifying us of any unauthorized use of your account</li>
            </ul>
            <p className="mt-3">
              We reserve the right to terminate accounts that violate these terms or remain inactive for extended periods.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-purple-200">4. User Content</h2>
            <p className="mb-3">
              Our service allows you to post, store, and share content ("User Content"). You retain ownership of your User Content, 
              but you grant us a license to use it for operating, improving, and promoting our service.
            </p>
            <p className="mb-3">
              When you share dreams publicly, you grant other users permission to view your content. You can control privacy settings for your dreams.
            </p>
            <p>
              You are solely responsible for your User Content and the consequences of sharing it. We reserve the right to remove 
              content that violates these terms or that we find objectionable.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-purple-200">5. Prohibited Conduct</h2>
            <p className="mb-3">
              You agree not to use our service to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Post content that is illegal, harmful, threatening, abusive, or otherwise objectionable</li>
              <li>Impersonate any person or entity</li>
              <li>Upload malware or other malicious code</li>
              <li>Interfere with or disrupt the service or servers</li>
              <li>Collect user information without consent</li>
              <li>Use the service for any commercial purpose without permission</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-purple-200">6. AI-Generated Content</h2>
            <p className="mb-3">
              Our service uses AI to analyze dreams and generate content such as interpretations and images. This AI-generated content is provided "as is" 
              without warranty of any kind. AI analysis should not be considered professional advice and is for entertainment purposes only.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-purple-200">7. Limitation of Liability</h2>
            <p className="mb-3">
              To the maximum extent permitted by law, Rem shall not be liable for any indirect, incidental, special, consequential, or 
              punitive damages resulting from your use of or inability to use the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-purple-200">8. Changes to Terms</h2>
            <p className="mb-3">
              We reserve the right to modify these terms at any time. We will provide notice of significant changes by posting the new terms on our website 
              or through the service. Your continued use of the service after such modifications constitutes your acceptance of the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-purple-200">9. Contact Information</h2>
            <p className="mb-3">
              If you have any questions about these Terms, please contact us through our feedback form accessible via the Support link.
            </p>
          </section>
        </div>
        
        <div className="mt-12 text-center text-purple-300 text-sm">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
};

export default Terms; 