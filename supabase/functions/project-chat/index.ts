import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const tools = [
  {
    type: "function",
    function: {
      name: "update_strategy",
      description: "Replace the project's execution strategy with a new one",
      parameters: {
        type: "object",
        properties: {
          strategy: { type: "string", description: "The new execution strategy in markdown format" },
        },
        required: ["strategy"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_task",
      description: "Add a new task to the project. Can be a subtask if parent_task_id is provided.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Task title" },
          description: { type: "string", description: "Task description" },
          priority: { type: "string", enum: ["low", "medium", "high", "critical"], description: "Task priority" },
          due_date: { type: "string", description: "Due date in YYYY-MM-DD format (optional)" },
          parent_task_id: { type: "string", description: "UUID of the parent task if this is a subtask (optional)" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_note",
      description: "Create a new note/reference for the project. Use this to compile research, book lists, resource lists, etc.",
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
      name: "create_widget",
      description: "Create a widget (mini web app) as a resource. The code should be a complete HTML document with embedded JS/CSS. ALWAYS include a summary and instructions when creating a widget.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Widget title" },
          code: { type: "string", description: "Complete HTML document with embedded JS/CSS" },
          summary: { type: "string", description: "A brief 1-2 sentence summary of what the widget does, shown on the tile/list view. ALWAYS provide this." },
          instructions: { type: "string", description: "Usage instructions in HTML format (use <p>, <ul>, <li>, <b> tags) explaining how to use the widget. ALWAYS provide this." },
        },
        required: ["title", "code", "summary", "instructions"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_widget",
      description: "Update an existing widget by its title. You can update the code, summary, title, and/or instructions. Match the widget by its current title from the Existing Widgets list.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Current title of the existing widget to update (must match an existing widget)" },
          new_title: { type: "string", description: "New title for the widget (optional, only if renaming)" },
          code: { type: "string", description: "Updated complete HTML document with embedded JS/CSS (optional, omit to keep existing code)" },
          summary: { type: "string", description: "Updated brief summary (optional)" },
          instructions: { type: "string", description: "Updated usage instructions in HTML format (optional)" },
        },
        required: ["title"],
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
  },
];
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();

    const today = new Date().toISOString().split('T')[0];
    const systemPrompt = `You are a project execution assistant. Your job is to help the user turn their brainstormed project into reality.

TODAY'S DATE: ${today}. NEVER use dates in the past. All due dates MUST be on or after ${today}.

PROJECT CONTEXT:
Title: ${context.title || "Untitled"}
Description: ${context.description || "None"}
Bullet Breakdown: ${context.bullet_breakdown || "None"}
Execution Strategy: ${context.execution_strategy || "None yet"}
Current Tasks: ${context.tasks || "None"}
Notes/Research: ${context.notes || "None"}
Existing Widgets: ${context.widgets || "None"}

YOUR CAPABILITIES:
- Help plan and break down the project into actionable steps
- Suggest specific resources: websites (with URLs), books (with authors and publication dates), articles, tools
- Update the execution strategy when the user wants changes
- Add tasks to the project task list (including subtasks under existing tasks using parent_task_id)
- Create notes to compile research, book lists, resource recommendations, etc.

IMPORTANT - RESOURCE SCOPE: When the user asks for resources, research, book recommendations, or notes, FIRST ask them how extensive they want the list to be (e.g., "Would you like a quick list of 3-5 top resources, or a comprehensive list of 15-30?"). Only generate after they specify.

TASK CREATION GUIDELINES:
- Think carefully about the BEST plan of attack. Consider dependencies -- what needs to happen before what.
- ALWAYS break complex work into PARENT TASKS with SUBTASKS underneath. Never create flat lists of tasks when hierarchical grouping makes sense.
- Create PARENT TASKS for major phases/milestones (e.g. "Research Phase", "Design Phase", "Implementation Phase").
- Create SUBTASKS under each parent for the specific work items. Use the TITLE of the parent task as the parent_task_id for subtasks. The system will automatically resolve these to real IDs.
- Each task and subtask should have its own realistic due_date.
- When given a timeline (e.g. "3 months"), calculate the actual end date from today (${today}).
- Distribute tasks across the FULL timeline with varied, realistic dates (not all on the same day).
- Use different days of the month -- spread work naturally across weeks.
- Set priorities thoughtfully: critical for blockers, high for important milestones, medium for regular work, low for nice-to-haves.

TIMELINE & DUE DATES:
- If the user provides a timeline, distribute task due dates realistically across that timeframe.
- If the user hasn't stated a timeline or deadline, ASK them what their timeline is before creating tasks with dates.
- If the user doesn't provide a timeline after being asked, order tasks by logical sequence of operations without due dates.

GUIDELINES:
- Be specific and actionable. Don't give vague advice.
- When recommending books, include title, author, and publication year.
- When recommending websites/tools, include the URL.
- IMPORTANT: When the user asks for links, websites, retailers, tools, or external resources, call create_link ONCE PER URL to create individual link reference tiles. Do NOT bundle multiple URLs into a single note.
- Use the create_note tool for long-form research, summaries, and written analysis. Do NOT use notes to list URLs.
- Use the create_link tool for EACH website, tool, or external resource. Always provide the full URL starting with https://.
- Use the add_task tool to break work into concrete steps.
- You can create subtasks by providing the TITLE of the parent task as parent_task_id. The system will resolve it to the real UUID.
- Use the update_strategy tool when the user wants to modify the execution plan.
- Use the create_widget tool to build mini web apps (calculators, converters, trackers, dashboards, etc.) that run as interactive HTML widgets.
- Use the update_widget tool to modify existing widgets by title.
- Always respond with helpful context even when using tools.`;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        tools,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI gateway error: ${response.status} - ${errText}`);
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
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
