/**
 * OpenAI chat-completions message shapes for client-side tool loops (see openAiToolLoop.ts).
 */

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
