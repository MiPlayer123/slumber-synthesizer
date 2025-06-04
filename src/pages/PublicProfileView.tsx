import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  Share,
  ArrowLeft,
  Loader2,
  Calendar,
  ExternalLink,
  Download,
  MapPin,
  Globe,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Helmet } from "react-helmet-async";
import { format } from "date-fns";

interface PublicProfileResponse {
  profile?: Profile & {
    dream_stats?: {
      total_dreams: number;
      public_dreams: number;
      first_dream_date?: string;
      categories?: Record<string, number>;
      emotions?: Record<string, number>;
    };
  };
  error?: string;
}

export default function PublicProfileView() {
  const { username } = useParams<{ username: string }>();
  const [profileData, setProfileData] = useState<
    PublicProfileResponse["profile"] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Update page meta tags for social sharing
  useEffect(() => {
    if (profileData) {
      document.title = `${profileData.full_name || profileData.username} (@${profileData.username}) | Rem`;
    }
  }, [profileData]);

  useEffect(() => {
    async function fetchPublicProfile() {
      if (!username) return;

      try {
        setLoading(true);
        setError(null);

        // Call the edge function
        const { data, error } = await supabase.functions.invoke(
          "get-public-profile",
          {
            body: { username },
            headers: user
              ? {
                  Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                }
              : undefined,
          },
        );

        if (error) throw error;

        const response = data as PublicProfileResponse;

        if (response.profile) {
          setProfileData(response.profile);
        } else {
          setError(response.error || "Profile not found");
        }
      } catch (error) {
        console.error("Error fetching public profile:", error);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    fetchPublicProfile();
  }, [username, user]);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/profile/${username}`;
    const shareData = {
      title: `${profileData?.full_name || profileData?.username} on Rem`,
      text: `Check out ${profileData?.full_name || profileData?.username}'s dream profile on Rem!`,
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
        description: "Profile link copied to clipboard!",
      });
    });
  };

  const handleOpenInApp = () => {
    // Try to open in app using deep link
    const appUrl = `rem://profile/${username}`;
    window.location.href = appUrl;

    // Fallback: redirect to app store after a delay if app doesn't open
    setTimeout(() => {
      toast({
        title: "App not found",
        description:
          "Please install the Rem app to view this profile with full features.",
      });
    }, 2000);
  };

  const formatJoinDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMMM yyyy");
    } catch {
      return "Unknown";
    }
  };

  if (loading) {
    return (
      <>
        <Helmet>
          <title>Loading Profile... | Rem</title>
        </Helmet>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-purple-600 mb-4" />
            <p className="text-purple-600">Loading profile...</p>
          </div>
        </div>
      </>
    );
  }

  if (error || !profileData) {
    return (
      <>
        <Helmet>
          <title>Profile Not Found | Rem</title>
          <meta name="description" content="This profile could not be found." />
        </Helmet>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
                <Globe className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">
                Profile Not Found
              </h1>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-600">
                {error ||
                  "The profile you're looking for doesn't exist or is not accessible."}
              </p>

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

  return (
    <>
      <Helmet>
        <title>
          {profileData.full_name || profileData.username} (@
          {profileData.username}) | Rem
        </title>
        <meta
          name="description"
          content={
            profileData.bio ||
            `${profileData.full_name || profileData.username} is sharing their dreams on Rem - AI Powered Dream Journal`
          }
        />

        {/* Open Graph tags */}
        <meta
          property="og:title"
          content={`${profileData.full_name || profileData.username} (@${profileData.username})`}
        />
        <meta
          property="og:description"
          content={
            profileData.bio ||
            `${profileData.full_name || profileData.username} is sharing their dreams on Rem`
          }
        />
        <meta
          property="og:image"
          content={
            profileData.avatar_url || "https://lucidrem.com/preview_image.png"
          }
        />
        <meta
          property="og:url"
          content={`https://lucidrem.com/profile/${username}`}
        />
        <meta property="og:type" content="profile" />

        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary" />
        <meta
          name="twitter:title"
          content={`${profileData.full_name || profileData.username} (@${profileData.username})`}
        />
        <meta
          name="twitter:description"
          content={
            profileData.bio ||
            `${profileData.full_name || profileData.username} is sharing their dreams on Rem`
          }
        />
        <meta
          name="twitter:image"
          content={
            profileData.avatar_url || "https://lucidrem.com/preview_image.png"
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
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Profile Info - Left Side */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardContent className="p-6">
                  {/* Avatar and Basic Info */}
                  <div className="text-center mb-6">
                    <Avatar className="h-24 w-24 mx-auto mb-4">
                      <AvatarImage src={profileData.avatar_url || ""} />
                      <AvatarFallback className="text-2xl">
                        {profileData.username[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>

                    <h1 className="text-xl font-bold text-gray-900 mb-1">
                      {profileData.full_name || profileData.username}
                    </h1>

                    <p className="text-gray-600 mb-2">
                      @{profileData.username}
                    </p>

                    <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>
                        Joined {formatJoinDate(profileData.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Bio */}
                  {profileData.bio && (
                    <div className="mb-6">
                      <p className="text-gray-700 text-center whitespace-pre-wrap">
                        {profileData.bio}
                      </p>
                    </div>
                  )}

                  {/* Website */}
                  {profileData.website && (
                    <div className="mb-6 text-center">
                      <a
                        href={profileData.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:text-purple-700 text-sm inline-flex items-center gap-1"
                      >
                        <Globe className="w-4 h-4" />
                        {profileData.website.replace(/^https?:\/\//, "")}
                      </a>
                    </div>
                  )}

                  {/* App CTA */}
                  <div className="border-t border-gray-200 pt-6">
                    <Button
                      onClick={handleOpenInApp}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Connect on Rem
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Dream Stats - Right Side */}
            <div className="lg:col-span-2">
              <div className="space-y-6">
                {/* Dream Stats Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle>Dream Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {profileData.dream_stats?.public_dreams || 0}
                        </div>
                        <div className="text-sm text-gray-600">
                          Public Dreams
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {profileData.dream_stats?.total_dreams || 0}
                        </div>
                        <div className="text-sm text-gray-600">
                          Total Dreams
                        </div>
                      </div>
                    </div>

                    {profileData.dream_stats?.first_dream_date && (
                      <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                        <div className="text-sm text-gray-600">
                          Recording dreams since{" "}
                          {format(
                            new Date(profileData.dream_stats.first_dream_date),
                            "MMMM yyyy",
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Dream Categories */}
                {profileData.dream_stats?.categories &&
                  Object.keys(profileData.dream_stats.categories).length >
                    0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Dream Categories</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(profileData.dream_stats.categories)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 6)
                            .map(([category, count]) => (
                              <div
                                key={category}
                                className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                              >
                                {category} ({count})
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                {/* Dream Emotions */}
                {profileData.dream_stats?.emotions &&
                  Object.keys(profileData.dream_stats.emotions).length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Dream Emotions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(profileData.dream_stats.emotions)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 6)
                            .map(([emotion, count]) => (
                              <div
                                key={emotion}
                                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                              >
                                {emotion} ({count})
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                {/* Join Rem CTA */}
                <Card className="bg-gradient-to-r from-purple-100 to-blue-100 border-purple-200">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Start Your Dream Journey
                      </h3>
                      <p className="text-gray-600 text-sm mb-4">
                        Record your dreams, discover patterns, and connect with
                        fellow dreamers on Rem
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
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
