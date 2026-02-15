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
    const { mode, chat_history, context, answer, question } = body;

    if (!mode || !["generate_question", "submit_answer", "forge_playbook"].includes(mode)) {
      return new Response(JSON.stringify({ error: "mode must be 'generate_question', 'submit_answer', or 'forge_playbook'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const ctx = context || {};
    const projectContext = `
Project/Product Context:
- Campaign Title: ${ctx.title || "Untitled"}
- Project Name: ${ctx.project_name || "N/A"}
- Category: ${ctx.category || "N/A"}
- Tags: ${Array.isArray(ctx.tags) ? ctx.tags.join(", ") : "None"}
- Compiled Description: ${ctx.compiled_description || "N/A"}
- Bullet Breakdown: ${ctx.bullet_breakdown || "N/A"}
- Execution Strategy: ${ctx.execution_strategy || "N/A"}
- Has GitHub Repo: ${ctx.has_github ? "Yes" : "No"}
- General Notes: ${ctx.general_notes || "N/A"}`;

    // --- forge_playbook mode ---
    if (mode === "forge_playbook") {
      const systemPrompt = `You are a Go-To-Market Strategist. Based on the interview conversation and project context below, generate a comprehensive campaign playbook.

${projectContext}

Interview history is provided. Analyze everything discussed and generate a structured response using the tool call.

The playbook should be in markdown format with these sections:
1. **Executive Summary** - Brief overview of the GTM strategy
2. **Target Audience** - Who we're selling to, demographics, psychographics
3. **Pricing Strategy** - Recommended pricing, bundles, tiers
4. **Distribution & Fulfillment** - How the product reaches customers
5. **Marketing & Launch Plan** - Key marketing channels, content strategy, launch timeline
6. **IP & Legal Considerations** - Relevant IP protection, licensing, compliance

For sales_model, choose from: B2B, B2C, Open Source, Marketplace, Direct, Other
For primary_channel, choose from: Shopify, Etsy, GitHub, Gumroad, Amazon, Website, Other

Generate 4-6 specific, actionable tasks. Map each to either "asset_creation" or "pre_launch" status_column. Tasks should be concrete and tailored to THIS specific product/project.`;

      const messages: any[] = [
        { role: "system", content: systemPrompt },
        ...(chat_history || []).map((m: any) => ({ role: m.role, content: m.content })),
        { role: "user", content: "Generate the complete Campaign Playbook based on our discussion. Return it via the tool call." },
      ];

      const tools = [
        {
          type: "function",
          function: {
            name: "generate_playbook",
            description: "Generate the complete campaign playbook with strategy, recommendations, and tasks.",
            parameters: {
              type: "object",
              properties: {
                playbook: { type: "string", description: "The full campaign playbook in markdown format." },
                sales_model: { type: "string", description: "Recommended sales model (B2B, B2C, Open Source, Marketplace, Direct, Other)." },
                primary_channel: { type: "string", description: "Recommended primary sales channel (Shopify, Etsy, GitHub, Gumroad, Amazon, Website, Other)." },
                tasks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string", description: "Task title" },
                      description: { type: "string", description: "Brief task description" },
                      status_column: { type: "string", description: "Either 'asset_creation' or 'pre_launch'" },
                    },
                    required: ["title", "status_column"],
                  },
                  description: "4-6 actionable tasks for the campaign.",
                },
              },
              required: ["playbook", "sales_model", "primary_channel", "tasks"],
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
          model: "google/gemini-3-flash-preview",
          messages,
          tools,
          tool_choice: { type: "function", function: { name: "generate_playbook" } },
          max_tokens: 8000,
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
    }

    // --- generate_question and submit_answer modes ---
    const systemPrompt = `You are a Go-To-Market Strategist conducting a focused interview to define a campaign's business model. You have access to the project context below and should ask targeted, sequential questions.

${projectContext}

Focus your questions on these areas (ask about the most critical gaps first):
1. Product type: Is this a physical hardware run, 3D-printed product, digital asset, software, or something else?
2. Business structure: Will it be sold under an LLC, as a hobby piece, or via another structure?
3. Fulfillment: Will orders be fulfilled in-house, via a 3PL/dropshipper, or is this digital delivery?
4. Target audience: Who specifically is this for? What's the ideal customer profile?
5. Pricing: What price range are you considering? Any competitive benchmarks?

Ask ONE question at a time. Be conversational but focused. Reference the project context to make your questions specific and relevant.

For the FIRST question (when chat history is empty), blend a brief, friendly introduction. Start with something like "Great, let's build a go-to-market strategy for this." then seamlessly transition into your first question. Do NOT separate the intro from the question.

The user may respond with questions or express uncertainty. When this happens, provide helpful guidance and then re-ask or refine your question.

IMPORTANT: You must also return a "topics_remaining" array listing the key topics you still need to discuss (e.g. ["Pricing Strategy", "Target Audience", "Fulfillment Method"]). As the conversation progresses and topics are covered, remove them from the list. When you believe you have enough information to generate a comprehensive playbook, return an empty array.`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
      ...(chat_history || []).map((m: any) => ({ role: m.role, content: m.content })),
    ];

    if (mode === "generate_question") {
      messages.push({
        role: "user",
        content: "Review the project context and ask the most critical question to define the go-to-market strategy. Return it via the tool call.",
      });

      const response = await callAI(LOVABLE_API_KEY, messages, [
        {
          type: "function",
          function: {
            name: "ask_question",
            description: "Ask the next critical GTM strategy question.",
            parameters: {
              type: "object",
              properties: {
                question: { type: "string", description: "The next critical question to ask." },
                topics_remaining: { type: "array", items: { type: "string" }, description: "List of topics still needing discussion. Empty array if enough info gathered." },
              },
              required: ["question", "topics_remaining"],
              additionalProperties: false,
            },
          },
        },
      ], { type: "function", function: { name: "ask_question" } });

      const result = JSON.parse(response);
      return new Response(JSON.stringify({ question: result.question, topics_remaining: result.topics_remaining || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // mode === "submit_answer"
    if (!answer || !question) {
      return new Response(JSON.stringify({ error: "answer and question required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    messages.push({
      role: "user",
      content: `Question: "${question}"\nAnswer: "${answer}"\n\nIf the user is asking a question or expressing uncertainty, set "clarification" to a helpful response and re-ask. Otherwise, generate the next question. Return via tool call.`,
    });

    const response = await callAI(LOVABLE_API_KEY, messages, [
      {
        type: "function",
        function: {
          name: "process_answer",
          description: "Process the answer and generate the next question or provide clarification.",
          parameters: {
            type: "object",
            properties: {
              clarification: { type: "string", description: "Helpful response if user asked a question or was uncertain." },
              next_question: { type: "string", description: "The next question to ask." },
              topics_remaining: { type: "array", items: { type: "string" }, description: "List of topics still needing discussion. Empty array if enough info gathered." },
            },
            required: ["next_question", "topics_remaining"],
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
    console.error("campaign-chat error:", e);
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
