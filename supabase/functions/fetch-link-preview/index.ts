import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "url required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LinkPreviewBot/1.0)" },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return new Response(JSON.stringify({ thumbnail_url: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only read first 50KB to find og:image
    const reader = response.body?.getReader();
    let html = "";
    const decoder = new TextDecoder();
    let bytesRead = 0;
    const MAX_BYTES = 50000;

    if (reader) {
      while (bytesRead < MAX_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        bytesRead += value.length;
      }
      reader.cancel();
    }

    // Parse og:image
    const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);

    const thumbnail_url = ogMatch ? ogMatch[1] : null;

    return new Response(JSON.stringify({ thumbnail_url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fetch-link-preview error:", e);
    return new Response(JSON.stringify({ thumbnail_url: null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
