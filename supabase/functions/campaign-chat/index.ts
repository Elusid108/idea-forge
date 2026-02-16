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

    if (!mode || !["generate_question", "submit_answer", "forge_playbook", "assistant"].includes(mode)) {
      return new Response(JSON.stringify({ error: "mode must be 'generate_question', 'submit_answer', 'forge_playbook', or 'assistant'" }), {
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

    // --- assistant mode ---
    if (mode === "assistant") {
      const assistantTools = [
        {
          type: "function",
          function: {
            name: "create_note",
            description: "Create a new note/reference for the campaign. Use this to compile research, summaries, action plans, etc.",
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
            name: "add_task",
            description: "Add a new task to the campaign's Go-To-Market pipeline.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Task title" },
                description: { type: "string", description: "Brief task description" },
                status_column: {
                  type: "string",
                  enum: ["foundation_ip", "infrastructure_production", "asset_creation_prelaunch", "active_campaign", "operations_fulfillment"],
                  description: "Which pipeline phase to add the task to",
                },
              },
              required: ["title", "status_column"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "create_widget",
            description: "Create a widget (mini web app) as a resource. The code should be a complete HTML document with embedded JS/CSS.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Widget title" },
                code: { type: "string", description: "Complete HTML document with embedded JS/CSS" },
                summary: { type: "string", description: "Brief summary shown on tile/list (optional)" },
                instructions: { type: "string", description: "Usage instructions in HTML format shown below the widget (optional)" },
              },
              required: ["title", "code"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "update_widget",
            description: "Update an existing widget's code by its title.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Exact title of the existing widget to update" },
                code: { type: "string", description: "Updated complete HTML document with embedded JS/CSS" },
                summary: { type: "string", description: "Updated brief summary (optional)" },
                instructions: { type: "string", description: "Updated usage instructions in HTML format (optional)" },
              },
              required: ["title", "code"],
            },
          },
        },
      ];

      const systemPrompt = `You are a Campaign Assistant for a Go-To-Market strategy. You help the user understand their campaign, suggest improvements, and answer questions about launching their product.

${projectContext}

Campaign Playbook Sections:
- IP Strategy: ${ctx.ip_strategy || "N/A"}
- Monetization Plan: ${ctx.monetization_plan || "N/A"}
- Marketing Plan: ${ctx.marketing_plan || "N/A"}
- Operations Plan: ${ctx.operations_plan || "N/A"}
- Current Status: ${ctx.status || "N/A"}
- Tasks: ${ctx.tasks || "None"}
- Existing Notes: ${ctx.notes || "None"}

YOUR CAPABILITIES:
- Help understand and refine the GTM strategy
- Create notes to compile research, action plans, summaries, etc.
- Add tasks to any of the 5 pipeline phases (Foundation & IP, Infrastructure & Production, Asset Creation & Pre-Launch, Active Campaign, Operations & Fulfillment)
- Create widgets — mini web apps (calculators, converters, trackers, dashboards, etc.)
- Update existing widgets by title

GUIDELINES:
- Be conversational, helpful, and specific. Reference the user's actual campaign data when answering.
- Use markdown formatting for readability.
- When creating notes, use HTML formatting (lists, bold, etc.).
- When adding tasks, choose the most appropriate pipeline phase.`;

      const messages: any[] = [
        { role: "system", content: systemPrompt },
        ...(chat_history || []).map((m: any) => ({ role: m.role, content: m.content })),
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
          tools: assistantTools,
          max_tokens: 4000,
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
      const choice = data.choices?.[0];
      const message = choice?.message;

      // Extract tool calls if any
      const toolCalls = message?.tool_calls || [];
      const actions: any[] = [];

      for (const tc of toolCalls) {
        try {
          const args = JSON.parse(tc.function.arguments);
          actions.push({ action: tc.function.name, ...args });
        } catch {}
      }

      return new Response(JSON.stringify({
        message: message?.content || "",
        actions,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- forge_playbook mode ---
    if (mode === "forge_playbook") {
      const systemPrompt = `You are an expert Go-To-Market Consultant. Based on the interview conversation and project context below, compile the user's chosen strategies into a comprehensive campaign playbook.

${projectContext}

Interview history is provided. Analyze everything discussed and generate a structured response using the tool call.

You must generate FOUR separate playbook sections as individual markdown documents:

1. **ip_strategy** — Discovery & IP Strategy: Summarize the user's goals (Profit, Portfolio, Open-Source), chosen licensing approach, and any IP protections discussed.

2. **monetization_plan** — Monetization Strategy: Detail the chosen revenue model (SaaS, freemium, wholesale, etc.), pricing tiers, and any upsell/cross-sell strategies discussed.

3. **marketing_plan** — Distribution & Marketing Plan: List the committed marketing channels, platforms, content strategy, and launch timeline discussed.

4. **operations_plan** — Logistics & Operations Plan: Cover fulfillment method, hosting/infrastructure needs, maintenance capacity, and operational considerations discussed.

Also generate a combined "playbook" field that merges all four sections into a single markdown document with clear headings.

For sales_model, choose from: B2B, B2C, Open Source, Marketplace, Direct, Other
For primary_channel, choose from: Shopify, Etsy, GitHub, Gumroad, Amazon, Website, Other

Generate 4-8 specific, actionable tasks. Map each to one of these status columns: "foundation_ip", "infrastructure_production", "asset_creation_prelaunch", "active_campaign", or "operations_fulfillment". Tasks should be concrete and tailored to THIS specific product/project.`;

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
                playbook: { type: "string", description: "The full combined campaign playbook in markdown format." },
                ip_strategy: { type: "string", description: "Discovery & IP Strategy section in markdown." },
                monetization_plan: { type: "string", description: "Monetization Strategy section in markdown." },
                marketing_plan: { type: "string", description: "Distribution & Marketing Plan section in markdown." },
                operations_plan: { type: "string", description: "Logistics & Operations Plan section in markdown." },
                sales_model: { type: "string", description: "Recommended sales model (B2B, B2C, Open Source, Marketplace, Direct, Other)." },
                primary_channel: { type: "string", description: "Recommended primary sales channel (Shopify, Etsy, GitHub, Gumroad, Amazon, Website, Other)." },
                tasks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string", description: "Task title" },
                      description: { type: "string", description: "Brief task description" },
                      status_column: { type: "string", description: "One of: foundation_ip, infrastructure_production, asset_creation_prelaunch, active_campaign, operations_fulfillment" },
                    },
                    required: ["title", "status_column"],
                  },
                  description: "4-8 actionable tasks for the campaign.",
                },
              },
              required: ["playbook", "ip_strategy", "monetization_plan", "marketing_plan", "operations_plan", "sales_model", "primary_channel", "tasks"],
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
    const systemPrompt = `You are an expert Go-To-Market Consultant. Your job is to help the user build a launch strategy by asking questions and providing them with industry-standard options they might not know exist. Do not ask broad, open-ended questions. Instead, ask a question and provide 2 to 3 contextual examples of how they could answer it based on their specific project.

${projectContext}

Guide the conversation through these 4 exploratory phases:

1. Discovery & IP: Ask what the ultimate goal is (Profit, Portfolio, Open-Source). Suggest relevant licensing (e.g., MIT, Apache) or proprietary IP protections.

2. Monetization Strategy: Pitch revenue models. If it's software, suggest SaaS subscriptions, freemium tiers, or usage-based pricing. If it's open-source, suggest open-core, paid hosting, or premium support. If it's physical, suggest direct-to-consumer vs B2B wholesale.

3. Distribution & Marketing: Suggest specific platforms for their niche (e.g., Product Hunt, Etsy, Tindie, Reddit, LinkedIn Ads) and ask which marketing channels they want to commit to.

4. Logistics & Operations: Ask about their capacity for maintenance. Introduce concepts like SaaS server hosting costs, dropshipping, or third-party logistics (3PL) to see how hands-on they want to be.

Keep your responses conversational and encouraging. Wait for the user to select an option or provide their own before moving to the next phase.

For the FIRST question (when chat history is empty), blend a brief, friendly introduction. Start with something like "Great, let's build a go-to-market strategy for this." then seamlessly transition into your first question about Discovery & IP.

The user may respond with questions or express uncertainty. When this happens, provide helpful guidance and then re-ask or refine your question.

IMPORTANT: You must also return a "topics_remaining" array listing the phases you still need to discuss. The phases are: "Discovery & IP", "Monetization Strategy", "Distribution & Marketing", "Logistics & Operations". As the conversation progresses and phases are covered, remove them from the list. When you believe you have enough information to generate a comprehensive playbook, return an empty array.`;

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
                topics_remaining: { type: "array", items: { type: "string" }, description: "List of phases still needing discussion. Empty array if enough info gathered." },
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
              topics_remaining: { type: "array", items: { type: "string" }, description: "List of phases still needing discussion. Empty array if enough info gathered." },
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
