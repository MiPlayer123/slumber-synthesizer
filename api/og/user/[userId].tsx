import { ImageResponse } from "@vercel/og";

export const config = {
  runtime: "edge",
};

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

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const userId = pathParts[pathParts.length - 1];

  if (!userId) {
    return new Response("User ID is required", { status: 400 });
  }

  try {
    // Fetch user data from Supabase REST API
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const response = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=username,full_name,avatar_url`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      },
    );
    const profiles = await response.json();
    const profile = profiles[0];

    if (!profile) {
      return new Response(`Profile not found for user ${userId}`, {
        status: 404,
      });
    }

    // Load fonts
    const interRegularFontData = await getFontData("/fonts/Inter-Regular.ttf");
    const interBoldFontData = await getFontData("/fonts/Inter-Bold.ttf");

    const logoUrl = new URL(
      "/images/e6477f41-9e85-41b4-b60f-8c257c3fca4e_1748211619250.png",
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:5173",
    ).toString();
    const avatarSrc =
      profile.avatar_url ||
      new URL(
        "/images/default-avatar.png",
        process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:5173",
      ).toString(); // Fallback to a default avatar if none

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#f0f4f8",
            padding: "50px",
            fontFamily: "Inter Regular",
            color: "#1a202c",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: "48px",
              fontWeight: "bold",
              color: "#4A5568",
            }}
          >
            <img
              src={logoUrl}
              width="80"
              height="80"
              style={{ marginRight: "20px", borderRadius: "10px" }}
              alt="REM Logo"
            />
            REM
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: "30px",
            }}
          >
            <img
              src={avatarSrc}
              width="180"
              height="180"
              style={{
                borderRadius: "50%",
                border: "5px solid white",
                boxShadow:
                  "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
              }}
              alt={profile.full_name || profile.username || "User"}
            />
            <p
              style={{
                fontSize: "42px",
                fontWeight: "bold",
                marginTop: "25px",
                fontFamily: "Inter Bold",
              }}
            >
              {profile.full_name || "Anonymous User"}
            </p>
            <p
              style={{ fontSize: "30px", color: "#718096", marginTop: "-10px" }}
            >
              @{profile.username || "nousername"}
            </p>
          </div>

          <div
            style={{
              fontSize: "28px",
              color: "#4A5568",
              textAlign: "center",
              marginTop: "auto",
              paddingTop: "30px",
            }}
          >
            Understand your subconscious, join REM today.
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
        // For debugging, you might want to enable this if images/fonts don't load:
        // debug: true,
      },
    );
  } catch (e: any) {
    console.error(`Error generating OG image for user ${userId}: ${e.message}`);
    return new Response(`Failed to generate image: ${e.message}`, {
      status: 500,
    });
  }
}
