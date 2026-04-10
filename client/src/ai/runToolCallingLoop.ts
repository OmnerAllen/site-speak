/**
 * Multi-turn OpenAI-style chat completions with tool calls (same control flow as RAG AiChat).
 */

/** Use for related logs (e.g. fetch fallbacks) so console filters match. */
export const AI_DEBUG_LOG_PREFIX = "[SiteSpeak AI]";
const LOG_PREFIX = AI_DEBUG_LOG_PREFIX;

function trunc(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}… (${s.length} chars total)`;
}

function previewJson(value: unknown, max = 500): string {
  try {
    return trunc(JSON.stringify(value), max);
  } catch {
    return trunc(String(value), max);
  }
}

export type ToolCallPart = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type ChatCompletionMessage =
  | {
      role: "system" | "user" | "assistant";
      content?: string | null;
      tool_calls?: ToolCallPart[];
    }
  | { role: "tool"; content: string; tool_call_id: string };

export type ToolHandler = (argsJson: string) => string | Promise<string>;

export type RunToolCallingLoopOptions = {
  initialMessages: ChatCompletionMessage[];
  tools?: unknown[];
  toolChoice?: unknown;
  complete: (body: Record<string, unknown>) => Promise<string>;
  handlers: Record<string, ToolHandler>;
  /** Default 16 */
  maxIterations?: number;
  /** Shown in browser console logs, e.g. <code>material-estimate</code> or <code>ai-chat</code> */
  logContext?: string;
};

export type RunToolCallingLoopResult = {
  finalContent: string | null;
  lastRaw: unknown;
};

export async function runToolCallingLoop(
  options: RunToolCallingLoopOptions,
): Promise<RunToolCallingLoopResult> {
  const max = options.maxIterations ?? 16;
  const ctx = options.logContext ?? "tool-loop";
  let messages: ChatCompletionMessage[] = [...options.initialMessages];

  console.log(`${LOG_PREFIX} start`, {
    context: ctx,
    maxIterations: max,
    initialMessageCount: messages.length,
    toolCount: options.tools !== undefined ? (options.tools as unknown[]).length : 0,
    toolChoice: previewJson(options.toolChoice, 400),
    handlerNames: Object.keys(options.handlers),
  });

  for (let i = 0; i < max; i++) {
    const body: Record<string, unknown> = { messages };
    if (options.tools !== undefined && (options.tools as unknown[]).length > 0) {
      body.tools = options.tools;
    }
    if (options.toolChoice !== undefined) {
      body.tool_choice = options.toolChoice;
    }

    console.log(`${LOG_PREFIX} request`, {
      context: ctx,
      iteration: i + 1,
      max,
      outgoingMessageCount: (body.messages as unknown[]).length,
      hasTools: body.tools !== undefined,
      toolChoice: previewJson(body.tool_choice, 400),
    });

    const rawText = await options.complete(body);

    console.log(`${LOG_PREFIX} raw response`, {
      context: ctx,
      iteration: i + 1,
      rawLength: rawText.length,
      rawPreview: trunc(rawText, 1200),
    });

    let data: {
      error?: unknown;
      choices?: Array<{
        finish_reason?: string;
        message?: ChatCompletionMessage & { tool_calls?: ToolCallPart[] };
      }>;
    };
    try {
      data = JSON.parse(rawText) as typeof data;
    } catch (e) {
      console.error(`${LOG_PREFIX} JSON parse failed`, {
        context: ctx,
        iteration: i + 1,
        error: e,
        rawPreview: trunc(rawText, 2500),
      });
      throw e;
    }

    if (data.error !== undefined && data.error !== null) {
      console.error(`${LOG_PREFIX} error field in completion body`, { context: ctx, error: data.error });
    }

    const choice = data.choices?.[0];
    if (!choice?.message) {
      console.error(`${LOG_PREFIX} missing choices[0].message`, {
        context: ctx,
        iteration: i + 1,
        choiceKeys: choice ? Object.keys(choice) : [],
        choicesLength: data.choices?.length,
      });
      throw new Error("Language model response had no choices[0].message.");
    }

    const msg = choice.message;
    const fr = choice.finish_reason;
    const toolCalls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];

    const contentPreview =
      typeof msg.content === "string"
        ? trunc(msg.content, 500)
        : msg.content === null || msg.content === undefined
          ? null
          : trunc(String(msg.content), 500);

    console.log(`${LOG_PREFIX} parsed assistant message`, {
      context: ctx,
      iteration: i + 1,
      finish_reason: fr,
      role: msg.role,
      contentPreview,
      toolCallCount: toolCalls.length,
      toolCalls: toolCalls.map((tc) => ({
        id: tc.id,
        name: tc.function?.name ?? "(missing name)",
        argsPreview: trunc(tc.function?.arguments ?? "", 400),
      })),
    });

    if (toolCalls.length > 0 || fr === "tool_calls") {
      messages = [...messages, msg];
      for (const tc of toolCalls) {
        const name = tc.function?.name;
        if (!name) continue;
        const handler = options.handlers[name];
        if (!handler) {
          throw new Error(`No handler registered for tool "${name}".`);
        }
        const args = tc.function.arguments ?? "{}";
        console.log(`${LOG_PREFIX} invoking tool handler`, {
          context: ctx,
          iteration: i + 1,
          toolName: name,
          toolCallId: tc.id,
          argsPreview: trunc(args, 600),
        });
        const output = await Promise.resolve(handler(args));
        console.log(`${LOG_PREFIX} tool result`, {
          context: ctx,
          toolName: name,
          resultPreview: trunc(String(output), 400),
        });
        messages.push({
          role: "tool",
          content: output,
          tool_call_id: tc.id,
        });
      }
      continue;
    }

    const content =
      typeof msg.content === "string" ? msg.content : msg.content === null || msg.content === undefined ? null : String(msg.content);
    console.log(`${LOG_PREFIX} done (assistant text, no tool_calls this turn)`, {
      context: ctx,
      iteration: i + 1,
      finish_reason: fr,
      finalContentPreview: content === null ? null : trunc(content, 800),
    });
    return { finalContent: content, lastRaw: data };
  }

  console.error(`${LOG_PREFIX} exceeded max iterations`, { context: ctx, max });
  throw new Error("Tool-calling loop exceeded max iterations.");
}
