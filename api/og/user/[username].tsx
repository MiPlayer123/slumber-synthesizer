import { ImageResponse } from "@vercel/og";

export const config = {
  runtime: "edge",
};

const SITE_URL = process.env.VITE_SITE_URL || "https://www.lucidrem.com";

export default async function handler(request: Request) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  // /[api]/[og]/[user]/[username] or /[api]/[og]/[user]/[username]/[app]
  const username =
    pathParts[pathParts.length - 1] === "app"
      ? pathParts[pathParts.length - 2]
      : pathParts[pathParts.length - 1];

  if (!username) {
    return new Response("Username is required", { status: 400 });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL!;
    const apiKey = process.env.VITE_SUPABASE_ANON_KEY!;

    console.log(`[OG User ${username}] Initiating fetch with anon key.`);

    const fetchUrl = `${supabaseUrl}/rest/v1/profiles?username=eq.${username}&select=username,full_name,avatar_url`;

    const response = await fetch(fetchUrl, {
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const responseText = await response.text();

    let profilesArray;
    if (response.ok && responseText) {
      try {
        profilesArray = JSON.parse(responseText);
      } catch (e) {
        console.error(`[OG User ${username}] JSON parsing error:`, e);
        console.error(
          `[OG User ${username}] Response text that failed parsing: ${responseText}`,
        );
        return new Response("Failed to parse data from Supabase", {
          status: 500,
        });
      }
    } else if (!response.ok) {
      console.error(
        `[OG User ${username}] Supabase fetch failed. Status: ${response.status}, Body: ${responseText}`,
      );
      return new Response(
        responseText || "Failed to fetch data from Supabase",
        { status: response.status },
      );
    }

    const profile =
      profilesArray && profilesArray.length > 0 ? profilesArray[0] : null;

    if (!profile) {
      return new Response(`Profile not found for user ${username}`, {
        status: 404,
      });
    }

    const logoUrl = new URL(
      "/images/e6477f41-9e85-41b4-b60f-8c257c3fca4e_1748211619250.png",
      SITE_URL,
    ).toString();
    const avatarSrc =
      profile.avatar_url ||
      new URL("/images/default-avatar.png", SITE_URL).toString();

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
            backgroundColor: "#FFFFFF",
            padding: "50px",
            fontFamily: "sans-serif",
            color: "#1A202C",
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
                border: "5px solid #E9ECEF",
                boxShadow:
                  "0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.03)",
              }}
              alt={profile.full_name || profile.username || "User"}
            />
            <p
              style={{
                fontSize: "42px",
                fontWeight: "bold",
                marginTop: "25px",
                fontFamily: "sans-serif",
                color: "#1A202C",
              }}
            >
              {profile.full_name || "Anonymous User"}
            </p>
            <p
              style={{ fontSize: "30px", color: "#4A5568", marginTop: "-10px" }}
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
        debug: true,
      },
    );
  } catch (e: any) {
    console.error(`[OG User ${username}] Error in handler: ${e.message}`);
    console.error(e.stack);
    return new Response(
      `Failed to generate image for user ${username}: ${e.message}`,
      {
        status: 500,
      },
    );
  }
}
