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

YOUR CAPABILITIES:
- Help plan and break down the project into actionable steps
- Suggest specific resources: websites (with URLs), books (with authors and publication dates), articles, tools
- Update the execution strategy when the user wants changes
- Add tasks to the project task list (including subtasks under existing tasks using parent_task_id)
- Create notes to compile research, book lists, resource recommendations, etc.

TASK CREATION GUIDELINES:
- Think carefully about the BEST plan of attack. Consider dependencies -- what needs to happen before what.
- Create PARENT TASKS for major phases/milestones (e.g. "Research Phase", "Design Phase", "Implementation Phase").
- Create SUBTASKS under each parent for the specific work items. Use parent_task_id to link them.
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
- Use the create_note tool to compile lists of resources, books, references, etc.
- Use the add_task tool to break work into concrete steps.
- You can create subtasks by providing a parent_task_id matching an existing task ID from the Current Tasks list.
- Use the update_strategy tool when the user wants to modify the execution plan.
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
