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
    const { mode, compiled_description, bullet_breakdown, chat_history, context, answer, question, is_locked } = body;

    if (!mode || !["generate_question", "submit_answer", "chat_query"].includes(mode)) {
      return new Response(JSON.stringify({ error: "mode must be 'generate_question', 'submit_answer', or 'chat_query'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // --- chat_query mode ---
    if (mode === "chat_query") {
      const ctx = context || {};
      const isActive = !is_locked;
      
      const capabilitiesText = isActive
        ? `You can answer questions about the brainstorm content, help explore ideas, create research notes, and update the compiled description and bullet breakdown when asked.

When the user asks for resources, research, book recommendations, or notes, FIRST ask them how extensive they want the list to be (e.g., "Would you like a quick list of 3-5 top resources, or a comprehensive list of 15-30?"). Only generate after they specify.

You can use the update_description tool to refine or rewrite the compiled description when the user asks. You can use the update_bullets tool to refine or add to the bullet breakdown. You can use the create_note tool to compile research, book lists, resource lists, etc. You can use the create_link tool when recommending websites, tools, or external resources — always provide the full URL.`
        : `You can answer questions about this brainstorm's content and help explore ideas. Format your responses using markdown for readability (use bold, lists, headers as appropriate).`;

      const systemPrompt = `You are a helpful brainstorm assistant. ${capabilitiesText}

Brainstorm content:
- Title: ${ctx.title || "Untitled"}
- Compiled Description: ${ctx.compiled_description || "N/A"}
- Bullet Breakdown: ${ctx.bullet_breakdown || "N/A"}
- Tags: ${Array.isArray(ctx.tags) ? ctx.tags.join(", ") : "None"}
- Notes: ${ctx.notes || "None"}
- References: ${ctx.references || "None"}
- Raw idea dump: ${ctx.idea_raw || "N/A"}
- AI-processed summary: ${ctx.idea_summary || "N/A"}`;

      const tools: any[] = [];
      if (isActive) {
        tools.push(
          {
            type: "function",
            function: {
              name: "create_note",
              description: "Create a new note/reference for the brainstorm. Use this to compile research, book lists, resource lists, etc.",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Note title" },
                  content: { type: "string", description: "Note content in HTML format. Use <ul><li> for lists, <b> for bold, etc." },
                },
                required: ["title", "content"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "update_description",
              description: "Update the brainstorm's compiled description. Use when the user asks to refine, rewrite, or add to the description.",
              parameters: {
                type: "object",
                properties: {
                  description: { type: "string", description: "The updated compiled description in markdown format." },
                },
                required: ["description"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "update_bullets",
              description: "Update the brainstorm's bullet breakdown. Use when the user asks to refine, add, or reorganize the bullet points.",
              parameters: {
                type: "object",
                properties: {
                  bullets: { type: "string", description: "The updated bullet breakdown in markdown list format." },
                },
                required: ["bullets"],
              },
            },
          },
          {
            type: "function",
            function: {
              name: "create_link",
              description: "Create a link resource/reference. Use this when recommending websites, tools, retailers, or any external URL. Always provide the full URL starting with https://.",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Link title" },
                  url: { type: "string", description: "Full URL starting with https://" },
                  description: { type: "string", description: "Brief description of the link" },
                },
                required: ["title", "url"],
              },
            },
          }
        );
      }

      const messages: any[] = [
        { role: "system", content: systemPrompt },
        ...(chat_history || []).map((m: any) => ({ role: m.role, content: m.content })),
      ];

      const aiBody: any = {
        model: "google/gemini-3-flash-preview",
        messages,
        max_tokens: 4000,
      };
      if (tools.length > 0) {
        aiBody.tools = tools;
      }

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(aiBody),
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
      const msg = data.choices?.[0]?.message;
      const answerText = msg?.content || "";
      
      const toolCalls = msg?.tool_calls || [];
      const actions: any[] = [];
      for (const tc of toolCalls) {
        try {
          const args = JSON.parse(tc.function.arguments);
          actions.push({ action: tc.function.name, ...args });
        } catch {}
      }

      return new Response(JSON.stringify({ answer: answerText, actions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- generate_question and submit_answer modes ---
    const systemPrompt = `You are a structured project interviewer. You help makers refine their ideas by asking one critical question at a time. You build up a comprehensive project description incrementally.

IMPORTANT: For the FIRST question (when chat history is empty), blend a brief, friendly introduction into the question itself. Start with something like "Let's flesh out this idea of yours." then seamlessly transition into your question. Do NOT separate the intro from the question -- it should read as one natural message.

Current project context:
- Title: ${context?.title || "Untitled"}
- Raw idea dump: ${context?.idea_raw || "N/A"}
- AI-processed summary: ${context?.idea_summary || "N/A"}
- Current compiled description: ${compiled_description || "Empty - needs to be built up"}
- Current bullet breakdown: ${bullet_breakdown || "Empty - needs to be built up"}
- Current tags: ${context?.tags ? (Array.isArray(context.tags) ? context.tags.join(", ") : context.tags) : "None"}
- Current category: ${context?.category || "None"}
- Notes: ${context?.notes || "None"}
- References: ${context?.references || "None"}

Previous Q&A history is provided for context. Your job is to ask focused, specific questions that fill gaps in the project description. Focus on: target audience, core features, technical requirements, constraints, success metrics, timeline, and unique differentiators.

IMPORTANT: The user may respond with questions, requests for clarification, or express uncertainty (e.g. "I'm not sure", "what do you think?", "can you explain the options?"). When this happens:
- Do NOT force an update to the description or bullets
- Instead, respond helpfully to their question or provide guidance
- Then re-ask the same question or a refined version
- Use the "clarification" field in your tool response for your helpful answer`;

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
      content: `Question that was asked: "${question}"\nMy answer: "${answer}"\n\nAnalyze the user's response. If they are asking a question, requesting clarification, expressing uncertainty, or saying things like "I'm not sure" or "what do you recommend?", then:
- Set "clarification" to a helpful response addressing their question/uncertainty
- Set "next_question" to the same or a refined version of the original question
- Leave updated_description, updated_bullets, updated_tags, and updated_category as null

If they gave a substantive answer: 1) Rewrite the compiled description to incorporate this new information. 2) Update the bullet breakdown. 3) Update the tags to reflect the current brainstorm content. 4) Generate the next critical question. 5) If the direction has shifted, update the category. Use one of: Product, Process, Fixture/Jig, Tool, Art, Hardware/Electronics, Software/App, Environment/Space, or suggest a new one. Return all via the tool call.`,
    });

    const response = await callAI(LOVABLE_API_KEY, messages, [
      {
        type: "function",
        function: {
          name: "process_answer",
          description: "Incorporate the answer and generate the next question, or provide clarification if the user asked a question.",
          parameters: {
            type: "object",
            properties: {
              clarification: { type: "string", description: "If the user asked a question or expressed uncertainty, provide a helpful response here. Leave null/empty if user gave a direct answer." },
              updated_description: { type: "string", description: "The rewritten compiled description incorporating the new answer. Null if providing clarification." },
              updated_bullets: { type: "string", description: "The updated bullet breakdown in markdown list format. Null if providing clarification." },
              updated_tags: { type: "array", items: { type: "string" }, description: "Updated list of tags reflecting the current brainstorm content. Null if providing clarification." },
              updated_category: { type: "string", description: "The updated category for the brainstorm. Null if providing clarification." },
              next_question: { type: "string", description: "The next critical question to ask (or re-ask the same question after clarification)." },
            },
            required: ["next_question"],
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
