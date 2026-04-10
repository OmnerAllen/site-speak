/**
 * RAG-style tool loop (see rag-kadebaxter AiChat): explicit rounds, full response logged each time.
 * OpenAI chat-completions shape; same behavior as runToolCallingLoop without extra debug noise.
 */

import type { ChatCompletionMessage, ToolCallPart } from "./runToolCallingLoop";

export type MaterialEstimateRagHandlers = Record<
  string,
  (argsJson: string) => string | Promise<string>
>;

export type MaterialEstimateRagLoopOptions = {
  initialMessages: ChatCompletionMessage[];
  tools: unknown[];
  toolChoice: unknown;
  complete: (body: Record<string, unknown>) => Promise<string>;
  handlers: MaterialEstimateRagHandlers;
  maxIterations?: number;
};

export type MaterialEstimateRagLoopResult = {
  finalContent: string | null;
  lastRaw: unknown;
};

/**
 * Mirrors RAG `while` + `console.log("AI Response:", …)` pattern; supports multiple tool_calls per turn.
 */
export async function runMaterialEstimateRagLoop(
  options: MaterialEstimateRagLoopOptions,
): Promise<MaterialEstimateRagLoopResult> {
  const max = options.maxIterations ?? 16;
  let messages: ChatCompletionMessage[] = [...options.initialMessages];

  for (let i = 0; i < max; i++) {
    const body: Record<string, unknown> = { messages };
    const tools = options.tools as unknown[] | undefined;
    if (tools !== undefined && tools.length > 0) {
      body.tools = tools;
    }
    if (options.toolChoice !== undefined) {
      body.tool_choice = options.toolChoice;
    }

    const rawText = await options.complete(body);
    const data = JSON.parse(rawText) as {
      error?: unknown;
      choices?: Array<{
        finish_reason?: string;
        message?: ChatCompletionMessage & { tool_calls?: ToolCallPart[] };
      }>;
    };

    // Same idea as RAG AiChat: inspect the full payload each round.
    console.log("AI Response:", data);

    if (data.error !== undefined && data.error !== null) {
      const errMsg =
        typeof data.error === "object" && data.error !== null && "message" in data.error
          ? String((data.error as { message?: unknown }).message)
          : JSON.stringify(data.error);
      throw new Error(errMsg || "Language model returned an error.");
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
