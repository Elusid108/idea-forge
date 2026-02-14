import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { idea_id, raw_dump } = await req.json();
    if (!idea_id || !raw_dump) {
      return new Response(JSON.stringify({ error: "idea_id and raw_dump required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an analytical engineering assistant. You take messy, stream-of-consciousness idea dumps from makers, engineers, and tinkerers and transform them into structured, professional output. Be specific and technical. Preserve the creator's intent while adding clarity.`,
          },
          {
            role: "user",
            content: `Process this raw idea dump:\n\n${raw_dump}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "process_idea",
              description: "Return structured analysis of a raw idea dump.",
              parameters: {
                type: "object",
                properties: {
                  processed_summary: {
                    type: "string",
                    description: "A clear, professional paragraph explaining the core concept.",
                  },
                  key_features: {
                    type: "string",
                    description: "A bulleted markdown list of main components, requirements, or steps.",
                  },
                  category: {
                    type: "string",
                    enum: [
                      "Product",
                      "Process",
                      "Fixture/Jig",
                      "Tool",
                      "Art",
                      "Hardware/Electronics",
                      "Software/App",
                      "Environment/Space",
                    ],
                    description: "Single category that best fits the idea.",
                  },
                  tags: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-6 highly specific, searchable keywords.",
                  },
                },
                required: ["processed_summary", "key_features", "category", "tags"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "process_idea" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const text = await aiResponse.text();
      console.error("AI gateway error:", status, text);

      // Reset status so user can retry
      await supabase.from("ideas").update({ status: "new" }).eq("id", idea_id);

      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway returned ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      await supabase.from("ideas").update({ status: "new" }).eq("id", idea_id);
      throw new Error("No tool call in AI response");
    }

    const result = JSON.parse(toolCall.function.arguments);

    const { error: updateError } = await supabase
      .from("ideas")
      .update({
        processed_summary: result.processed_summary,
        key_features: result.key_features,
        category: result.category,
        tags: result.tags,
        status: "processed",
      })
      .eq("id", idea_id);

    if (updateError) {
      console.error("DB update error:", updateError);
      throw updateError;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-idea error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
