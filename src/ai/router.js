import { CRUD_INTENT_REGEX } from "./tools";

export function shouldForceToolRetry(userInput, hadFunctionCalls) {
  if (hadFunctionCalls) return false;
  return CRUD_INTENT_REGEX.test(userInput);
}

export function routeLocalIntent(userInput, lastContext) {
  const text = userInput.trim().toLowerCase();

  // 1. Bulk Create ("Create 50 placeholder tasks")
  let match = text.match(/^(?:create|make|add|generate)\s+(\d+)\s*(?:placeholder\s*)?tasks?/i);
  if (match) {
    const count = parseInt(match[1], 10);
    const tasks = Array.from({ length: count }, (_, i) => ({ 
      title: `Placeholder Task ${i + 1}`, priority: "important", deadline: "tomorrow" 
    }));
    return [{ tool: "createTasks", args: { tasks }, reply: `Created ${count} tasks.` }];
  }

  // 2. Bulk More ("Create 20 more such")
  match = text.match(/^(?:create|make|add|generate)\s+(\d+)\s*more/i);
  if (match && lastContext?.createdTasks?.length) {
    const count = parseInt(match[1], 10);
    const template = lastContext.createdTasks[lastContext.createdTasks.length - 1];
    const tasks = Array.from({ length: count }, (_, i) => ({ 
      title: `${template.title} (Copy ${i + 1})`, 
      priority: template.priority || "important", 
      deadline: template.deadline || "tomorrow" 
    }));
    return [{ tool: "createTasks", args: { tasks }, reply: `Created ${count} more such tasks.` }];
  }

  // 3. Delete last one ("Delete the last one")
  if (/^(?:delete|remove)\s+(the\s*)?last\s*one/i.test(text) && lastContext?.affectedTaskIds?.length) {
    const taskId = lastContext.affectedTaskIds[lastContext.affectedTaskIds.length - 1];
    return [{ tool: "deleteTask", args: { taskId }, reply: "Deleted the last task." }];
  }

  // 4. Archive completed tasks
  if (/^(?:archive)\s+completed\s*tasks?/i.test(text)) {
    // This requires a backend query to get completed tasks, so let Gemini or handler do it.
    // Actually, we can return a special instruction or just let Gemini handle it.
    return null;
  }
  
  // 5. Create a placeholder task
  if (/^(?:create|make|add)\s+(a\s+)?placeholder\s*task/i.test(text)) {
    return [{ tool: "createTask", args: { title: "Placeholder Task", priority: "important", deadline: "tomorrow" }, reply: "Created placeholder task." }];
  }

  return null;
}

