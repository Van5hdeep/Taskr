import { GoogleGenAI } from "@google/genai";
import { buildSystemPrompt } from "./systemPrompt";
import { shouldForceToolRetry } from "./router";
import { TASKR_TOOL_DECLARATIONS } from "./tools";

function toText(parts = []) {
  return parts.map((part) => part?.text).filter(Boolean).join("\n").trim();
}

export async function executeAgentTurn({
  apiKey,
  model,
  userInput,
  taskSummary,
  lastExecutionContext,
  executeTool,
  logger = console,
}) {
  if (!apiKey) return null;
  let geminiCalls = 0;
  const ai = new GoogleGenAI({ apiKey });
  const conversation = [{ role: "user", parts: [{ text: userInput }] }];
  const aggregated = [];
  let iterations = 0;
  const maxIterations = 5;
  const executedSignatures = new Set();

  while (iterations < maxIterations) {
      iterations++;
      try {
        geminiCalls++;
        const response = await ai.models.generateContent({
          model,
          contents: conversation,
          config: {
            systemInstruction: buildSystemPrompt({ taskSummary, lastExecutionContext, forceToolUsage: false }),
            tools: [{ functionDeclarations: TASKR_TOOL_DECLARATIONS }],
            temperature: 0.2,
            maxOutputTokens: 420,
          },
        });

        const candidateParts = response?.candidates?.[0]?.content?.parts ?? [];
        const functionCalls = candidateParts.filter((part) => part.functionCall);
        logger.info("[TASKR-AI] Gemini decision", { functionCalls: functionCalls.map((f) => f.functionCall?.name) });

        if (!functionCalls.length) {
          const text = response.text || toText(candidateParts);
          return { text: text || "Done.", toolResults: aggregated, hadFunctionCalls: aggregated.length > 0 };
        }

        conversation.push({ role: "model", parts: candidateParts });

        // --- BULK CREATION MERGER ---
        const createCalls = functionCalls.filter(c => c.functionCall.name === "createTask");
        let bulkResult = null;
        if (createCalls.length > 1) {
          logger.info("[TASKR-AI] Intercepting inefficient multiple createTask calls -> merge to createTasks");
          const bulkTasks = createCalls.map(c => c.functionCall.args || {});
          try {
            bulkResult = await executeTool("createTasks", { tasks: bulkTasks });
          } catch (toolErr) {
            bulkResult = { ok: false, error: toolErr?.message || String(toolErr) };
          }
        }
        
        let hasNewCalls = false;

        for (const callPart of functionCalls) {
          const call = callPart.functionCall;
          const sig = JSON.stringify({ name: call.name, args: call.args });
          
          if (executedSignatures.has(sig)) {
             logger.warn(`[TASKR-AI] Identical tool call repeated: ${sig}`);
             conversation.push({
               role: "user",
               parts: [{ functionResponse: { name: call.name, response: { ok: false, error: "Tool already executed with these exact arguments in this turn." } } }],
             });
             continue;
          }
          executedSignatures.add(sig);
          hasNewCalls = true;

          logger.info("[TASKR-AI] Function name", call.name);
          
          let result;
          if (call.name === "createTask" && bulkResult) {
             result = bulkResult;
          } else {
            try {
              result = await executeTool(call.name, call.args || {});
            } catch (toolErr) {
              logger.error(`[TASKR-AI] Tool execution crashed: ${call.name}`, toolErr);
              result = { ok: false, error: toolErr?.message || String(toolErr) };
            }
          }
          
          logger.info("[TASKR-AI] Supabase result", result);
          aggregated.push(result);

          conversation.push({
            role: "user",
            parts: [{ functionResponse: { name: call.name, response: { result } } }],
          });
        }
        
        if (!hasNewCalls) {
           logger.warn("[TASKR-AI] All tool calls were repeats. Terminating to prevent infinite loop.");
           const text = response.text || toText(candidateParts);
           return { text: text || "I applied the operations.", toolResults: aggregated, hadFunctionCalls: aggregated.length > 0 };
        }
      } catch (err) {
        logger.error("[TASKR-AI] Gemini API error", err);
        const errStr = String(err);
        if (errStr.includes("429") || err?.status === 429 || errStr.includes("RESOURCE_EXHAUSTED")) {
           return {
             text: "I am currently rate-limited by Google (429). Please wait a moment before trying again.",
             toolResults: aggregated,
             hadFunctionCalls: aggregated.length > 0,
             metrics: { geminiCalls, toolCalls: aggregated.length }
           };
        }
        return { 
          text: "I encountered an error while processing your request.", 
          toolResults: aggregated, 
          hadFunctionCalls: aggregated.length > 0,
          metrics: { geminiCalls, toolCalls: aggregated.length }
        };
      }
    }
    
    logger.warn("[TASKR-AI] Reached maximum tool iteration limit.");
    return {
      text: "I executed the requested operations, but stopped to prevent a loop.",
      toolResults: aggregated,
      hadFunctionCalls: aggregated.length > 0,
      metrics: { geminiCalls, toolCalls: aggregated.length }
    };
}
