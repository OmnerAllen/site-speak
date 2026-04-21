/** Project-details AI chat column. Set `VITE_ENABLE_AI_CHAT=false` to hide. Default: on. */
export const isAiChatEnabled = import.meta.env.VITE_ENABLE_AI_CHAT !== "false";

/** Work Logs page: Mic Test (local playback & transcribe). Set `VITE_ENABLE_WORK_LOG_MIC_TEST=true` to show. Default: off. */
export const isWorkLogMicTestEnabled = import.meta.env.VITE_ENABLE_WORK_LOG_MIC_TEST === "true";
