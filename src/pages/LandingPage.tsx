import { Helmet } from "react-helmet-async";

const LandingPage = () => {
  return (
    <>
      <Helmet>
        <title>Rem – AI Powered Social Dream Journal | Discover Yourself</title>
        <meta
          name="description"
          content="LucidRem helps you record, analyze, and understand your dreams with AI-powered insights. Start your journey of self-discovery today."
        />
        <meta
          property="og:title"
          content="Rem – AI Powered Social Dream Journal | Discover Yourself"
        />
        <meta
          property="og:description"
          content="LucidRem helps you record, analyze, and understand your dreams with AI-powered insights."
        />
      </Helmet>
    </>
  );
};

export default LandingPage;
