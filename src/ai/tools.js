export const TASKR_TOOL_DECLARATIONS = [
  {
    name: "createTask",
    description: "Create one task. Use when user asks to add a specific task.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Task title." },
        priority: { type: "string", description: "Urgent, Important, or Not Important." },
        deadline: { type: "string", description: "ISO date/time or natural date string." },
        rawInput: { type: "string", description: "Optional full task description." },
      },
      required: ["title"],
    },
  },
  {
    name: "createTasks",
    description: "Create multiple tasks in one operation.",
    parameters: {
      type: "object",
      properties: {
        tasks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              priority: { type: "string" },
              deadline: { type: "string" },
              rawInput: { type: "string" },
            },
            required: ["title"],
          },
        },
      },
      required: ["tasks"],
    },
  },
  {
    name: "updateTask",
    description: "Update task fields by taskId.",
    parameters: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        fields: {
          type: "object",
          properties: {
            title: { type: "string" },
            priority: { type: "string" },
            deadline: { type: "string" },
            rawInput: { type: "string" },
          },
        },
      },
      required: ["taskId", "fields"],
    },
  },
  {
    name: "deleteTask",
    description: "Delete a single task by taskId.",
    parameters: {
      type: "object",
      properties: { taskId: { type: "string" } },
      required: ["taskId"],
    },
  },
  {
    name: "completeTask",
    description: "Mark a task complete by taskId.",
    parameters: { type: "object", properties: { taskId: { type: "string" } }, required: ["taskId"] },
  },
  {
    name: "uncompleteTask",
    description: "Mark a task as not completed by taskId.",
    parameters: { type: "object", properties: { taskId: { type: "string" } }, required: ["taskId"] },
  },
  {
    name: "setPriority",
    description: "Set priority on task by taskId.",
    parameters: {
      type: "object",
      properties: { taskId: { type: "string" }, priority: { type: "string" } },
      required: ["taskId", "priority"],
    },
  },
  {
    name: "setDueDate",
    description: "Set due date on task by taskId.",
    parameters: {
      type: "object",
      properties: { taskId: { type: "string" }, dueDate: { type: "string" } },
      required: ["taskId", "dueDate"],
    },
  },
  {
    name: "getTasks",
    description: "Get tasks for the current user.",
    parameters: {
      type: "object",
      properties: { includeArchived: { type: "boolean" } },
    },
  },
  {
    name: "searchTasks",
    description: "Search tasks by title or filter by priority.",
    parameters: {
      type: "object",
      properties: { query: { type: "string" }, priority: { type: "string" } },
    },
  },
  {
    name: "archiveTask",
    description: "Archive a task by taskId.",
    parameters: { type: "object", properties: { taskId: { type: "string" } }, required: ["taskId"] },
  },
  {
    name: "restoreTask",
    description: "Restore an archived task by taskId.",
    parameters: { type: "object", properties: { taskId: { type: "string" } }, required: ["taskId"] },
  },
];

export const CRUD_INTENT_REGEX =
  /\b(create|add|make|insert|delete|remove|update|change|edit|complete|uncomplete|priority|due|deadline|search|find|archive|restore|organize)\b/i;

