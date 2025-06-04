import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dream, Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  Share,
  ArrowLeft,
  Loader2,
  Lock,
  Users,
  Globe,
  ExternalLink,
  Download,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Helmet } from "react-helmet-async";

interface PublicDreamResponse {
  dream?: Dream & { profiles: Profile };
  error?: string;
  visibility?: string;
  requiresAuth?: boolean;
  requiresFriendship?: boolean;
}

export default function PublicDreamView() {
  const { dreamId } = useParams<{ dreamId: string }>();
  const [dreamData, setDreamData] = useState<
    (Dream & { profiles: Profile }) | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [privacyInfo, setPrivacyInfo] = useState<{
    visibility?: string;
    requiresAuth?: boolean;
    requiresFriendship?: boolean;
  }>({});
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Update page meta tags for social sharing
  useEffect(() => {
    if (dreamData) {
      // Update the document title and meta tags
      document.title = `${dreamData.title} - ${dreamData.profiles.username || "Dream"} | Rem`;
    }
  }, [dreamData]);

  useEffect(() => {
    async function fetchPublicDream() {
      if (!dreamId) return;

      try {
        setLoading(true);
        setError(null);

        // Call the edge function
        const { data, error } = await supabase.functions.invoke(
          `get-public-dream/${dreamId}`,
          {
            headers: user
              ? {
                  Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                }
              : undefined,
          },
        );

        if (error) throw error;

        const response = data as PublicDreamResponse;

        if (response.dream) {
          setDreamData(response.dream);
        } else {
          setError(response.error || "Dream not found");
          setPrivacyInfo({
            visibility: response.visibility,
            requiresAuth: response.requiresAuth,
            requiresFriendship: response.requiresFriendship,
          });
        }
      } catch (error) {
        console.error("Error fetching public dream:", error);
        setError("Failed to load dream");
      } finally {
        setLoading(false);
      }
    }

    fetchPublicDream();
  }, [dreamId, user]);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/dream/${dreamId}`;
    const shareData = {
      title: dreamData?.title || "Shared Dream",
      text:
        dreamData?.description?.slice(0, 100) + "..." ||
        "Check out this dream!",
      url: shareUrl,
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        // Fallback to clipboard
        copyToClipboard(shareUrl);
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Link copied",
        description: "Dream link copied to clipboard!",
      });
    });
  };

  const handleOpenInApp = () => {
    // Try to open in app using deep link
    const appUrl = `rem://dream/${dreamId}`;
    window.location.href = appUrl;

    // Fallback: redirect to app store after a delay if app doesn't open
    setTimeout(() => {
      toast({
        title: "App not found",
        description:
          "Please install the Rem app to view this dream with full features.",
      });
    }, 2000);
  };

  const handleLoginRedirect = () => {
    navigate("/auth", { state: { from: `/dream/${dreamId}` } });
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case "public":
        return <Globe className="w-4 h-4" />;
      case "friends_only":
        return <Users className="w-4 h-4" />;
      case "private":
        return <Lock className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case "public":
        return "bg-green-100 text-green-800 border-green-200";
      case "friends_only":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "private":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-green-100 text-green-800 border-green-200";
    }
  };

  if (loading) {
    return (
      <>
        <Helmet>
          <title>Loading Dream... | Rem</title>
        </Helmet>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-purple-600 mb-4" />
            <p className="text-purple-600">Loading dream...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Helmet>
          <title>Dream Not Found | Rem</title>
          <meta
            name="description"
            content="This dream could not be found or is not accessible."
          />
        </Helmet>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
                {privacyInfo.visibility === "private" ? (
                  <Lock className="w-8 h-8 text-red-600" />
                ) : privacyInfo.visibility === "friends_only" ? (
                  <Users className="w-8 h-8 text-blue-600" />
                ) : (
                  <Globe className="w-8 h-8 text-gray-600" />
                )}
              </div>
              <h1 className="text-xl font-semibold text-gray-900">
                {privacyInfo.visibility === "private"
                  ? "Private Dream"
                  : privacyInfo.visibility === "friends_only"
                    ? "Friends Only"
                    : "Dream Not Found"}
              </h1>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-600">{error}</p>

              {privacyInfo.requiresAuth && (
                <Button onClick={handleLoginRedirect} className="w-full">
                  Login to View
                </Button>
              )}

              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={handleOpenInApp}
                  className="w-full"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in Rem App
                </Button>

                <Button
                  variant="ghost"
                  onClick={() => navigate("/")}
                  className="w-full"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go to Rem
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (!dreamData) return null;

  return (
    <>
      <Helmet>
        <title>
          {dreamData.title} - {dreamData.profiles.username || "Dream"} | Rem
        </title>
        <meta
          name="description"
          content={
            dreamData.description?.slice(0, 160) + "..." ||
            "A dream shared on Rem - AI Powered Dream Journal"
          }
        />

        {/* Open Graph tags */}
        <meta
          property="og:title"
          content={`${dreamData.title} - ${dreamData.profiles.username || "Dream"}`}
        />
        <meta
          property="og:description"
          content={
            dreamData.description?.slice(0, 300) + "..." ||
            "A dream shared on Rem"
          }
        />
        <meta
          property="og:image"
          content={
            dreamData.image_url || "https://lucidrem.com/preview_image.png"
          }
        />
        <meta
          property="og:url"
          content={`https://lucidrem.com/dream/${dreamId}`}
        />
        <meta property="og:type" content="article" />

        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content={`${dreamData.title} - ${dreamData.profiles.username || "Dream"}`}
        />
        <meta
          name="twitter:description"
          content={
            dreamData.description?.slice(0, 200) + "..." ||
            "A dream shared on Rem"
          }
        />
        <meta
          name="twitter:image"
          content={
            dreamData.image_url || "https://lucidrem.com/preview_image.png"
          }
        />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => navigate("/")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Rem
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenInApp}
                  className="hidden sm:flex"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Open in App
                </Button>

                <Button variant="outline" size="sm" onClick={handleShare}>
                  <Share className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="overflow-hidden">
            {/* Dream Image */}
            {dreamData.image_url && (
              <div className="aspect-video w-full bg-gray-100">
                <img
                  src={dreamData.image_url}
                  alt={dreamData.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <CardContent className="p-6">
              {/* Dream Header */}
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex-1">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                    {dreamData.title}
                  </h1>

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <time dateTime={dreamData.created_at}>
                      {format(new Date(dreamData.created_at), "MMMM d, yyyy")}
                    </time>

                    <Badge
                      variant="outline"
                      className={`${getVisibilityColor(dreamData.visibility)} border`}
                    >
                      {getVisibilityIcon(dreamData.visibility)}
                      <span className="ml-1 capitalize">
                        {dreamData.visibility === "friends_only"
                          ? "Friends Only"
                          : dreamData.visibility}
                      </span>
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Author Info */}
              <div className="flex items-center gap-3 mb-6 p-4 bg-gray-50 rounded-lg">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={dreamData.profiles.avatar_url || ""} />
                  <AvatarFallback>
                    {dreamData.profiles.username?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <p className="font-medium text-gray-900">
                    {dreamData.profiles.full_name ||
                      dreamData.profiles.username}
                  </p>
                  <p className="text-sm text-gray-600">
                    @{dreamData.profiles.username}
                  </p>
                </div>
              </div>

              {/* Dream Content */}
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {dreamData.description}
                </p>
              </div>

              {/* Enhanced Description */}
              {dreamData.enhanced_description && (
                <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h3 className="font-semibold text-purple-900 mb-2">
                    AI Dream Analysis
                  </h3>
                  <p className="text-purple-800 whitespace-pre-wrap">
                    {dreamData.enhanced_description}
                  </p>
                </div>
              )}

              {/* Dream Metadata */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{dreamData.category}</Badge>
                  <Badge variant="secondary">{dreamData.emotion}</Badge>
                </div>
              </div>

              {/* Mobile App CTA */}
              <div className="mt-8 p-4 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg border border-purple-200">
                <div className="text-center">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Want to record your own dreams?
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Join thousands of dreamers on Rem - the AI-powered dream
                    journal
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button
                      onClick={handleOpenInApp}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Get the App
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/")}>
                      Learn More
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
