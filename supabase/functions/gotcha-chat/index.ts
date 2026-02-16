import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { symptom, chat_history, project_context } = await req.json();

    if (!symptom) {
      return new Response(JSON.stringify({ error: "symptom is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const whyCount = (chat_history || []).filter((m: any) => m.role === "user").length;

    const systemPrompt = `You are a strict Root Cause Investigator. The user has encountered a project gotcha/problem:

SYMPTOM: "${symptom}"

${project_context ? `PROJECT CONTEXT: ${project_context}` : ""}

RULES:
1. Ask "Why did this happen?" based on their previous answer. Only ask ONE question at a time.
2. Do not provide the answers for them. Guide them to discover the root cause themselves.
3. You are on why round ${whyCount + 1} of up to 5.
4. If the user replies with "I don't know", "I'm not sure", "no idea", or lacks evidence to continue, DO NOT ask another why. Instead, return an investigation_task — a specific, physical action they must take to find the answer.
5. If you believe the user has reached the true root cause (a systemic issue, not just a symptom), return the root_cause summary and a corrective_action_task.
6. Be encouraging but firm. Don't accept surface-level answers.

You MUST respond using the tool call. Choose the appropriate response type based on the conversation.`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
      ...(chat_history || []).map((m: any) => ({ role: m.role, content: m.content })),
    ];

    const tools = [
      {
        type: "function",
        function: {
          name: "autopsy_response",
          description: "Respond to the user's answer in the 5 Whys root cause analysis.",
          parameters: {
            type: "object",
            properties: {
              next_question: { type: "string", description: "The next 'why' question to ask. Only set if continuing the autopsy." },
              investigation_task: { type: "string", description: "A specific action the user must take to find evidence. Set when user says 'I don't know'." },
              root_cause: { type: "string", description: "Summary of the root cause. Set when root cause is identified." },
              corrective_action_task: { type: "string", description: "A task to fix the root cause. Set alongside root_cause." },
              message: { type: "string", description: "A brief message to display to the user alongside the response." },
            },
            required: ["message"],
          },
        },
      },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        tools,
        tool_choice: { type: "function", function: { name: "autopsy_response" } },
        max_tokens: 2000,
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

    const result = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gotcha-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
