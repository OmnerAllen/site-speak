/**
 * Generic multi-turn OpenAI-style chat completions with tool calls (browser executes handlers).
 */

import type { ChatCompletionMessage, ToolCallPart } from "./chatCompletionTypes";

export type { ChatCompletionMessage, ToolCallPart } from "./chatCompletionTypes";

export type ToolHandler = (argsJson: string) => string | Promise<string>;

export type RunOpenAiToolLoopOptions = {
  initialMessages: ChatCompletionMessage[];
  tools?: unknown[];
  toolChoice?: unknown;
  complete: (body: Record<string, unknown>) => Promise<string>;
  handlers: Record<string, ToolHandler>;
  /** Default 16 */
  maxIterations?: number;
  /**
   * Invoked after each completion response is parsed as JSON (e.g. log the full payload per round).
   */
  onRoundResponse?: (args: { iteration: number; data: unknown }) => void;
};

export type RunOpenAiToolLoopResult = {
  finalContent: string | null;
  lastRaw: unknown;
};

function completionErrorMessage(data: { error?: unknown }): string {
  const err = data.error;
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message?: unknown }).message);
  }
  return JSON.stringify(err);
}

export async function runOpenAiToolLoop(
  options: RunOpenAiToolLoopOptions,
): Promise<RunOpenAiToolLoopResult> {
  const max = options.maxIterations ?? 16;
  let messages: ChatCompletionMessage[] = [...options.initialMessages];

  for (let i = 0; i < max; i++) {
    const iteration = i + 1;
    const body: Record<string, unknown> = { messages };
    const tools = options.tools as unknown[] | undefined;
    if (tools !== undefined && tools.length > 0) {
      body.tools = tools;
    }
    if (options.toolChoice !== undefined) {
      body.tool_choice = options.toolChoice;
    }

    const rawText = await options.complete(body);

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
      const preview = rawText.length > 500 ? `${rawText.slice(0, 500)}…` : rawText;
      throw new Error(
        `Language model response was not valid JSON: ${e instanceof Error ? e.message : String(e)}. Preview: ${preview}`,
      );
    }

    options.onRoundResponse?.({ iteration, data });

    if (data.error !== undefined && data.error !== null) {
      throw new Error(completionErrorMessage(data) || "Language model returned an error.");
    }

    const choice = data.choices?.[0];
    if (!choice?.message) {
      throw new Error("Language model response had no choices[0].message.");
    }

    const msg = choice.message;
    const fr = choice.finish_reason;
    const toolCalls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];

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
        const output = await Promise.resolve(handler(args));
        messages.push({
          role: "tool",
          content: output,
          tool_call_id: tc.id,
        });
      }
      continue;
    }

    const content =
      typeof msg.content === "string"
        ? msg.content
        : msg.content === null || msg.content === undefined
          ? null
          : String(msg.content);
    return { finalContent: content, lastRaw: data };
  }

  throw new Error("Tool-calling loop exceeded max iterations.");
}
