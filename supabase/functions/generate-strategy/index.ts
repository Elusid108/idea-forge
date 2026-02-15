import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, description, bullets, tags, category, notes } = await req.json();

    const prompt = `You are a project planning expert. Based on the following brainstorm that has been promoted to a project, generate a concise, actionable Execution Strategy in markdown format.

Title: ${title}
Category: ${category || "Uncategorized"}
Tags: ${(tags || []).join(", ")}
Description: ${description || "No description"}
Key Points: ${bullets || "None"}
Notes/Research: ${notes || "None"}

Generate a strategy with these sections:
## Overview
A 2-3 sentence summary of what this project aims to achieve.

## Phase 1: Foundation
- List 3-5 concrete first steps

## Phase 2: Core Development  
- List 3-5 main implementation tasks

## Phase 3: Polish & Launch
- List 3-5 finishing tasks

## Key Risks
- List 2-3 potential challenges

Keep it practical, specific to this project, and under 400 words total.`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const strategy = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ strategy }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
