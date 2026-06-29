import { executeAgentTurn } from "../ai/executor";
import { routeLocalIntent } from "../ai/router";
import * as taskService from "../services/taskService";

const executionContexts = new Map();

export async function executeTool({
  userId,
  name,
  args,
}) {
  const resolvedArgs = { ...(args || {}) };
  if (!resolvedArgs.taskId && resolvedArgs.taskTitle) {
    const resolvedId = await taskService.resolveTaskIdByTitle(userId, resolvedArgs.taskTitle);
    if (resolvedId) resolvedArgs.taskId = resolvedId;
  }

  const requiresTaskId = [
    "updateTask", "deleteTask", "completeTask", "uncompleteTask", 
    "setPriority", "setDueDate", "archiveTask", "restoreTask"
  ];

  if (requiresTaskId.includes(name) && !resolvedArgs.taskId) {
    return { 
      ok: false, 
      error: `Missing taskId for ${name}. If you only have a title, I couldn't find a matching task.`
    };
  }

  const handlers = {
    createTask: () => taskService.createTask(userId, resolvedArgs),
    createTasks: () => taskService.createTasks(userId, resolvedArgs),
    updateTask: () => taskService.updateTask(userId, resolvedArgs),
    deleteTask: () => taskService.deleteTask(userId, resolvedArgs),
    completeTask: () => taskService.completeTask(userId, resolvedArgs),
    uncompleteTask: () => taskService.uncompleteTask(userId, resolvedArgs),
    setPriority: () => taskService.setPriority(userId, resolvedArgs),
    setDueDate: () => taskService.setDueDate(userId, resolvedArgs),
    getTasks: () => taskService.getTasks(userId, resolvedArgs),
    searchTasks: () => taskService.searchTasks(userId, resolvedArgs),
    archiveTask: () => taskService.archiveTask(userId, resolvedArgs),
    restoreTask: () => taskService.restoreTask(userId, resolvedArgs),
  };

  const fn = handlers[name];
  if (!fn) return { ok: false, error: `Unknown tool: ${name}` };
  try {
    const data = await fn();
    
    let ctx = executionContexts.get(userId) || {
      tool: null,
      timestamp: 0,
      arguments: null,
      result: null,
      createdTaskIds: [],
      createdTasks: [],
      affectedTaskIds: [],
    };
    
    ctx.tool = name;
    ctx.timestamp = Date.now();
    ctx.arguments = resolvedArgs;
    ctx.result = data;
    
    if (name === "createTask" && data) {
      ctx.createdTaskIds = [data.id];
      ctx.createdTasks = [data];
      ctx.affectedTaskIds = [data.id];
    } else if (name === "createTasks" && Array.isArray(data)) {
      ctx.createdTaskIds = data.map((t) => t.id);
      ctx.createdTasks = data;
      ctx.affectedTaskIds = data.map((t) => t.id);
    } else if (data?.id) {
      ctx.affectedTaskIds = [data.id];
    } else if (Array.isArray(data)) {
      ctx.affectedTaskIds = data.map((t) => t.id).filter(Boolean);
    }
    
    executionContexts.set(userId, ctx);

    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error?.message || String(error) };
  }
}

export async function handleChatMessage({
  apiKey,
  model,
  userId,
  userInput,
  taskSummary,
  logger,
}) {
  const startTime = Date.now();
  logger.info("[TASKR-AI] User input", userInput);
  const lastContext = executionContexts.get(userId) || null;

  // 1. Pre-Gemini Intent Router
  const localRoutes = routeLocalIntent(userInput, lastContext);
  if (localRoutes) {
    logger.info("[TASKR-AI] Local router matched. Bypassing Gemini API.");
    const aggregatedResults = [];
    for (const route of localRoutes) {
      const result = await executeTool({ userId, name: route.tool, args: route.args });
      aggregatedResults.push(result);
    }
    const executionTimeMs = Date.now() - startTime;
    return {
      text: localRoutes.map(r => r.reply).join(" "),
      toolResults: aggregatedResults,
      hadFunctionCalls: true,
      metrics: { geminiCalls: 0, toolCalls: localRoutes.length, executionTimeMs }
    };
  }

  const output = await executeAgentTurn({
    apiKey,
    model,
    userInput,
    taskSummary,
    lastExecutionContext: lastContext,
    logger,
    executeTool: async (name, args) => executeTool({ userId, name, args }),
  });

  const executionTimeMs = Date.now() - startTime;
  if (!output.metrics) {
    output.metrics = { geminiCalls: 1, toolCalls: output.toolResults?.length || 0, executionTimeMs };
  } else {
    output.metrics.executionTimeMs = executionTimeMs;
  }

  logger.info("[TASKR-AI] Final response", output?.text || "");
  return output;
}

