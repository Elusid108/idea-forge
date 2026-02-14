import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { mode, compiled_description, bullet_breakdown, chat_history, context, answer, question } = body;

    if (!mode || !["generate_question", "submit_answer"].includes(mode)) {
      return new Response(JSON.stringify({ error: "mode must be 'generate_question' or 'submit_answer'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a structured project interviewer. You help makers refine their ideas by asking one critical question at a time. You build up a comprehensive project description incrementally.

Current project context:
- Title: ${context?.title || "Untitled"}
- Raw idea dump: ${context?.idea_raw || "N/A"}
- AI-processed summary: ${context?.idea_summary || "N/A"}
- Current compiled description: ${compiled_description || "Empty - needs to be built up"}
- Current bullet breakdown: ${bullet_breakdown || "Empty - needs to be built up"}
- References: ${context?.references || "None"}

Previous Q&A history is provided for context. Your job is to ask focused, specific questions that fill gaps in the project description. Focus on: target audience, core features, technical requirements, constraints, success metrics, timeline, and unique differentiators.`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
      ...(chat_history || []).map((m: any) => ({ role: m.role, content: m.content })),
    ];

    if (mode === "generate_question") {
      messages.push({
        role: "user",
        content: "Review the current project state and ask the single most critical question that would help flesh out this idea. Return it via the tool call.",
      });

      const response = await callAI(LOVABLE_API_KEY, messages, [
        {
          type: "function",
          function: {
            name: "ask_question",
            description: "Ask the next critical question about the project.",
            parameters: {
              type: "object",
              properties: {
                question: { type: "string", description: "The next critical question to ask the user." },
              },
              required: ["question"],
              additionalProperties: false,
            },
          },
        },
      ], { type: "function", function: { name: "ask_question" } });

      const result = JSON.parse(response);
      return new Response(JSON.stringify({ question: result.question }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // mode === "submit_answer"
    if (!answer || !question) {
      return new Response(JSON.stringify({ error: "answer and question required for submit_answer mode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    messages.push({
      role: "user",
      content: `Question that was asked: "${question}"\nMy answer: "${answer}"\n\nNow: 1) Rewrite the compiled description to incorporate this new information. 2) Update the bullet breakdown. 3) Generate the next critical question. Return all three via the tool call.`,
    });

    const response = await callAI(LOVABLE_API_KEY, messages, [
      {
        type: "function",
        function: {
          name: "process_answer",
          description: "Incorporate the answer and generate the next question.",
          parameters: {
            type: "object",
            properties: {
              updated_description: { type: "string", description: "The rewritten compiled description incorporating the new answer." },
              updated_bullets: { type: "string", description: "The updated bullet breakdown in markdown list format." },
              next_question: { type: "string", description: "The next critical question to ask." },
            },
            required: ["updated_description", "updated_bullets", "next_question"],
            additionalProperties: false,
          },
        },
      },
    ], { type: "function", function: { name: "process_answer" } });

    const result = JSON.parse(response);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("brainstorm-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function callAI(apiKey: string, messages: any[], tools: any[], tool_choice: any): Promise<string> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
      tools,
      tool_choice,
    }),
  });

  if (!response.ok) {
    const status = response.status;
    const text = await response.text();
    console.error("AI gateway error:", status, text);
    if (status === 429) throw new Error("Rate limit exceeded. Try again shortly.");
    if (status === 402) throw new Error("AI credits exhausted.");
    throw new Error(`AI gateway returned ${status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) throw new Error("No tool call in AI response");
  return toolCall.function.arguments;
}
