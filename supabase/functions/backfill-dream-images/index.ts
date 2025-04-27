// backfill-dream-images-once/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

serve(async () => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(url, key);

  // 1) fetch all dreams AFTER April 20, 2025 missing an image
  const { data: dreams, error: fetchError } = await supabase
    .from("dreams")
    .select("id, title, description")
    .is("image_url", null)
    .is("enhanced_description", null)
    .gt("created_at", "2025-04-20T00:00:00Z");

  if (fetchError) {
    console.error("Failed to fetch dreams:", fetchError);
    return new Response(fetchError.message, { status: 500 });
  }
  console.log(`Found ${dreams.length} dreams to backfill`);

  // 2) invoke your edge function for each, passing both id and description
  for (const d of dreams) {
    const payload = {
      dreamId: d.id,
      description: `${d.title} – ${d.description}`,
    };

    console.log("Invoking generate-dream-image for:", d.id);
    const { data, error } = await supabase.functions.invoke(
      "generate-dream-image",
      { body: payload, headers: { Authorization: `Bearer ${key}` } },
    );

    if (error) {
      console.error(`Invocation error for ${d.id}:`, error);
    } else {
      console.log(`Invocation response for ${d.id}:`, data);
    }
  }

  return new Response(JSON.stringify({ backfilled: dreams.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
