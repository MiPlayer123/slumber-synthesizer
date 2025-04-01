import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Privacy = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Privacy Policy | REM";
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

        <h1 className="text-4xl font-bold text-purple-100 mb-8">Privacy Policy</h1>
        
        <div className="space-y-8 text-purple-100">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-purple-200">Introduction</h2>
            <p className="mb-3">
              At Rem, we value your privacy and are committed to protecting your personal information. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
              when you use our dream journaling and analysis service.
            </p>
            <p>
              By using Rem, you agree to the collection and use of information in accordance with this policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-purple-200">Information We Collect</h2>
            <p className="mb-3">
              We collect several types of information for various purposes to provide and improve our service to you:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <span className="font-medium">Account Information:</span> Email address, password, and profile information.
              </li>
              <li>
                <span className="font-medium">Dream Content:</span> The dream entries, descriptions, emotions, and categories you provide.
              </li>
              <li>
                <span className="font-medium">Usage Data:</span> Information on how you access and use our service.
              </li>
              <li>
                <span className="font-medium">Device Information:</span> Information about the device you use to access our service.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-purple-200">How We Use Your Information</h2>
            <p className="mb-3">We use your information for the following purposes:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>To provide and maintain our service</li>
              <li>To analyze your dreams when you request it</li>
              <li>To notify you about changes to our service</li>
              <li>To allow you to participate in interactive features when you choose to do so</li>
              <li>To provide customer support</li>
              <li>To gather analysis that helps us improve our service</li>
              <li>To monitor the usage of our service</li>
              <li>To detect, prevent, and address technical issues</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-purple-200">Data Security</h2>
            <p className="mb-3">
              The security of your data is important to us. We strive to use commercially acceptable means 
              to protect your personal information, but no method of transmission over the Internet or 
              electronic storage is 100% secure.
            </p>
            <p>
              We implement appropriate technical and organizational measures to protect your data against 
              unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-purple-200">Your Data Rights</h2>
            <p className="mb-3">
              You have the right to access, update, or delete your information. You can do this through your 
              account settings or by contacting us directly.
            </p>
            <p>
              If you wish to delete your account entirely, please contact us and we will assist you in this process.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-purple-200">Changes to This Privacy Policy</h2>
            <p className="mb-3">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting 
              the new Privacy Policy on this page and updating the "last updated" date.
            </p>
            <p>
              You are advised to review this Privacy Policy periodically for any changes. Changes to this 
              Privacy Policy are effective when they are posted on this page.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-purple-200">Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us through our feedback form accessible via the Support link.
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

export default Privacy; 