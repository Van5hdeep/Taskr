import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { randomUUID } from "node:crypto";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} title
 * @property {string} rawInput
 * @property {string} deadline - ISO 8601 date string
 * @property {number} urgencyScore - 1 (low) to 10 (critical)
 * @property {{ label: string, completed: boolean }[]} subTasks
 * @property {boolean} isCompleted
 */

/** @type {Task[]} */
const tasks = [];

const TaskSchema = {
  id: "string",
  title: "string",
  rawInput: "string",
  deadline: "string (ISO 8601)",
  urgencyScore: "number (1-10)",
  subTasks: "{ label: string, completed: boolean }[]",
  isCompleted: "boolean",
};

const MOCK_SUB_TASK_TEMPLATES = [
  "Break the work into clear, actionable steps",
  "Set a focused 25-minute work block",
  "Review output and submit before the deadline",
  "Gather required files and references",
  "Draft a rough outline or first version",
  "Do a final quality check",
];

function randomUrgencyScore() {
  return Math.floor(Math.random() * 10) + 1;
}

function pickMockSubTasks() {
  const pool = [...MOCK_SUB_TASK_TEMPLATES];
  const selected = [];

  while (selected.length < 3 && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    selected.push(pool.splice(index, 1)[0]);
  }

  return selected.map((label) => ({ label, completed: false }));
}

function findTaskIndex(id) {
  return tasks.findIndex((task) => task.id === id);
}

function isValidDeadline(value) {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "Task-tracker API",
    version: "1.0.0",
    uptime: process.uptime(),
    taskCount: tasks.length,
    schema: TaskSchema,
  });
});

app.get("/api/tasks", (_req, res) => {
  res.json({
    success: true,
    count: tasks.length,
    data: tasks,
  });
});

function deriveTitle(rawInput) {
  const firstLine = rawInput.split(/[\n,;]+/).map((l) => l.trim()).find(Boolean);
  return firstLine ?? rawInput.slice(0, 60);
}

function isValidSubTask(item) {
  return (
    item &&
    typeof item === "object" &&
    typeof item.label === "string" &&
    typeof item.completed === "boolean"
  );
}

app.post("/api/tasks", (req, res) => {
  const { title, rawInput, deadline } = req.body ?? {};

  if (!rawInput || typeof rawInput !== "string" || !rawInput.trim()) {
    return res.status(400).json({
      success: false,
      error: "rawInput is required and must be a non-empty string",
    });
  }

  const trimmedInput = rawInput.trim();
  const resolvedTitle =
    title && typeof title === "string" && title.trim()
      ? title.trim()
      : deriveTitle(trimmedInput);

  if (!deadline || typeof deadline !== "string" || !isValidDeadline(deadline)) {
    return res.status(400).json({
      success: false,
      error: "deadline is required and must be a valid ISO 8601 date string",
    });
  }

  /** @type {Task} */
  const newTask = {
    id: randomUUID(),
    title: resolvedTitle,
    rawInput: trimmedInput,
    deadline: new Date(deadline).toISOString(),
    urgencyScore: randomUrgencyScore(),
    subTasks: pickMockSubTasks(),
    isCompleted: false,
  };

  tasks.push(newTask);

  return res.status(201).json({
    success: true,
    data: newTask,
  });
});

app.put("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  const index = findTaskIndex(id);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: `Task with id "${id}" not found`,
    });
  }

  const existing = tasks[index];
  const updates = req.body ?? {};

  if (updates.title !== undefined) {
    if (typeof updates.title !== "string" || !updates.title.trim()) {
      return res.status(400).json({
        success: false,
        error: "title must be a non-empty string",
      });
    }
    existing.title = updates.title.trim();
  }

  if (updates.rawInput !== undefined) {
    if (typeof updates.rawInput !== "string" || !updates.rawInput.trim()) {
      return res.status(400).json({
        success: false,
        error: "rawInput must be a non-empty string",
      });
    }
    existing.rawInput = updates.rawInput.trim();
  }

  if (updates.deadline !== undefined) {
    if (typeof updates.deadline !== "string" || !isValidDeadline(updates.deadline)) {
      return res.status(400).json({
        success: false,
        error: "deadline must be a valid ISO 8601 date string",
      });
    }
    existing.deadline = new Date(updates.deadline).toISOString();
  }

  if (updates.urgencyScore !== undefined) {
    const score = Number(updates.urgencyScore);
    if (!Number.isInteger(score) || score < 1 || score > 10) {
      return res.status(400).json({
        success: false,
        error: "urgencyScore must be an integer between 1 and 10",
      });
    }
    existing.urgencyScore = score;
  }

  if (updates.subTasks !== undefined) {
    if (
      !Array.isArray(updates.subTasks) ||
      !updates.subTasks.every(isValidSubTask)
    ) {
      return res.status(400).json({
        success: false,
        error:
          "subTasks must be an array of { label: string, completed: boolean }",
      });
    }
    existing.subTasks = updates.subTasks;
  }

  if (updates.isCompleted !== undefined) {
    if (typeof updates.isCompleted !== "boolean") {
      return res.status(400).json({
        success: false,
        error: "isCompleted must be a boolean",
      });
    }
    existing.isCompleted = updates.isCompleted;
  }

  tasks[index] = existing;

  return res.json({
    success: true,
    data: existing,
  });
});

app.delete("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  const index = findTaskIndex(id);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: `Task with id "${id}" not found`,
    });
  }

  const [removed] = tasks.splice(index, 1);

  return res.json({
    success: true,
    data: removed,
  });
});

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`Task-tracker API running on http://localhost:${PORT}`);
});
