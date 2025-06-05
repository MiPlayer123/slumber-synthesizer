import { ImageResponse } from "@vercel/og";

export const config = {
  runtime: "edge",
};

const SITE_URL = process.env.VITE_SITE_URL || "https://www.lucidrem.com";

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
  const dreamId = pathParts[pathParts.length - 1];

  if (!dreamId) {
    return new Response("Dream ID is required", { status: 400 });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL!;
    const serviceKey = process.env.VITE_SUPABASE_ANON_KEY!;

    console.log(`[OG Dream ${dreamId}] Initiating fetch with service role.`);

    const fetchUrl = `${supabaseUrl}/rest/v1/dreams?id=eq.${dreamId}&select=title,description,image_url,user_id,profiles!dreams_user_id_fkey(username,avatar_url,full_name)`;

    const response = await fetch(fetchUrl, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });

    const responseText = await response.text();

    let dreamsArray;
    if (response.ok && responseText) {
      try {
        dreamsArray = JSON.parse(responseText);
      } catch (e) {
        console.error(`[OG Dream ${dreamId}] JSON parsing error:`, e);
        console.error(
          `[OG Dream ${dreamId}] Response text that failed parsing: ${responseText}`,
        );
        return new Response("Failed to parse data from Supabase", {
          status: 500,
        });
      }
    } else if (!response.ok) {
      console.error(
        `[OG Dream ${dreamId}] Supabase fetch failed. Status: ${response.status}, Body: ${responseText}`,
      );
      return new Response(
        responseText || "Failed to fetch data from Supabase",
        { status: response.status },
      );
    }

    const dream = dreamsArray && dreamsArray.length > 0 ? dreamsArray[0] : null;

    if (!dream) {
      return new Response(
        `Dream not found for id ${dreamId} (using service role)`,
        { status: 404 },
      );
    }

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

    const logoUrl = new URL(
      "/images/e6477f41-9e85-41b4-b60f-8c257c3fca4e_1748211619250.png",
      SITE_URL,
    ).toString();
    const dreamImageSrc =
      dream.image_url ||
      new URL("/images/default-dream-image.png", SITE_URL).toString();
    const authorAvatarSrc =
      author?.avatar_url ||
      new URL("/images/default-avatar.png", SITE_URL).toString();

    const dreamDescriptionSnippet = truncateText(dream.description || "", 120);

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#e9e0f8",
            padding: "40px",
            fontFamily: "sans-serif",
            color: "#1a202c",
            position: "relative",
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
                  fontFamily: "sans-serif",
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
        debug: true,
      },
    );
  } catch (e: any) {
    console.error(`[OG Dream ${dreamId}] Error in handler: ${e.message}`);
    console.error(e.stack);
    return new Response(
      `Error generating OG image for dream ${dreamId}: ${e.message}`,
      {
        status: 500,
      },
    );
  }
}
