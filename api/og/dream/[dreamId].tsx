import * as React from "react";
import { ImageResponse } from "@vercel/og";
import { createClient } from "@supabase/supabase-js";

export const config = {
  runtime: "edge",
};

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Function to fetch font data
async function getFontData(fontUrl: string): Promise<ArrayBuffer> {
  const response = await fetch(
    new URL(
      fontUrl,
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:5173",
    ),
  );
  if (!response.ok) {
    throw new Error(
      `Failed to fetch font: ${response.statusText} from ${fontUrl}`,
    );
  }
  return response.arrayBuffer();
}

// Function to truncate text to the first sentence or a character limit
function truncateText(text: string, maxLength = 150): string {
  if (!text) return "";
  const firstSentenceMatch = text.match(/[^.!?]+[.!?]+/);
  let snippet = firstSentenceMatch ? firstSentenceMatch[0] : text;
  if (snippet.length > maxLength) {
    snippet = snippet.substring(0, maxLength - 3) + "...";
  }
  return snippet;
}

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const dreamId = pathParts[pathParts.length - 1]; // Extracts the value of [dreamId] from the path

  if (!dreamId) {
    return new Response("Dream ID is required", { status: 400 });
  }

  try {
    // Fetch dream data and author data from Supabase
    const { data: dream, error: dreamError } = await supabase
      .from("dreams")
      .select(
        `
        title,
        description,
        image_url,
        user_id,
        profiles ( username, avatar_url, full_name )
      `,
      )
      .eq("id", dreamId)
      .single();

    if (dreamError || !dream) {
      console.error("Error fetching dream:", dreamError);
      return new Response(
        `Dream not found for id ${dreamId}: ${dreamError?.message || "No dream data"}`,
        { status: 404 },
      );
    }

    // Safely access profile data, whether it's an object or an array from the join
    const profileDataFromDream = dream.profiles;
    const author = (
      Array.isArray(profileDataFromDream) && profileDataFromDream.length > 0
        ? profileDataFromDream[0]
        : profileDataFromDream
    ) as {
      username: string | null;
      avatar_url: string | null;
      full_name: string | null;
    } | null;

    // Load fonts
    const interRegularFontData = await getFontData("/fonts/Inter-Regular.ttf");
    const interBoldFontData = await getFontData("/fonts/Inter-Bold.ttf");

    const logoUrl = new URL(
      "/images/e6477f41-9e85-41b4-b60f-8c257c3fca4e_1748211619250.png",
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:5173",
    ).toString();
    const dreamImageSrc =
      dream.image_url ||
      new URL(
        "/images/default-dream-image.png",
        process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:5173",
      ).toString(); // Fallback image
    const authorAvatarSrc =
      author?.avatar_url ||
      new URL(
        "/images/default-avatar.png",
        process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:5173",
      ).toString();

    const dreamDescriptionSnippet = truncateText(dream.description || "", 120);

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#e9e0f8", // Slightly different bg for dreams
            padding: "40px",
            fontFamily: "Inter Regular",
            color: "#1a202c",
            position: "relative", // For absolute positioning of author info
          }}
        >
          {/* Header with Logo and REM text */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: "36px",
              fontWeight: "bold",
              color: "#4A5568",
              marginBottom: "20px",
            }}
          >
            <img
              src={logoUrl}
              width="60"
              height="60"
              style={{ marginRight: "15px", borderRadius: "8px" }}
              alt="REM Logo"
            />
            REM
          </div>

          {/* Main content: Dream Image and Text */}
          <div
            style={{
              display: "flex",
              flex: 1,
              alignItems: "center",
              gap: "30px",
            }}
          >
            <img
              src={dreamImageSrc}
              width="400"
              height="400"
              style={{
                borderRadius: "15px",
                objectFit: "cover",
                border: "4px solid white",
                boxShadow: "0 8px 12px -3px rgba(0,0,0,0.1)",
              }}
              alt={dream.title || "Dream Image"}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                maxWidth: "60%",
              }}
            >
              <p
                style={{
                  fontSize: "48px",
                  fontWeight: "bold",
                  fontFamily: "Inter Bold",
                  color: "#333",
                  lineHeight: 1.2,
                  marginBottom: "15px",
                }}
              >
                {dream.title || "A Dream"}
              </p>
              <p style={{ fontSize: "28px", color: "#555", lineHeight: 1.5 }}>
                {dreamDescriptionSnippet}
              </p>
            </div>
          </div>

          {/* Author Info and Tagline at the bottom */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
              marginTop: "30px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <img
                src={authorAvatarSrc}
                width="50"
                height="50"
                style={{ borderRadius: "50%", marginRight: "10px" }}
                alt={author?.full_name || author?.username || "Author"}
              />
              <span style={{ fontSize: "24px", color: "#4A5568" }}>
                By {author?.full_name || author?.username || "Anonymous"}
              </span>
            </div>
            <div
              style={{ fontSize: "22px", color: "#4A5568", textAlign: "right" }}
            >
              Understand your subconscious, join REM today.
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: "Inter Regular",
            data: interRegularFontData,
            style: "normal",
            weight: 400,
          },
          {
            name: "Inter Bold",
            data: interBoldFontData,
            style: "normal",
            weight: 700,
          },
        ],
      },
    );
  } catch (e: any) {
    console.error(
      `Error generating OG image for dream ${dreamId}: ${e.message}`,
    );
    return new Response(`Failed to generate image: ${e.message}`, {
      status: 500,
    });
  }
}
