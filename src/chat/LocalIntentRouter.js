/**
 * LocalIntentRouter intercepts simple, read-only analytical queries 
 * and answers them deterministically, bypassing the LLM entirely.
 * 
 * Returns a string answer if handled locally, or `null` if it should fall back to Gemini.
 */

export function routeLocalIntent(input, tasks) {
  const query = input.toLowerCase().trim();

  // 1. Total count
  if (/how many tasks do i have/i.test(query) || /^count tasks$/i.test(query) || /^total tasks$/i.test(query) || query === "how many tasks") {
    return `You have a total of ${tasks.length} task${tasks.length === 1 ? "" : "s"}.`;
  }

  // 2. Urgent / Important tasks count
  if (/how many urgent tasks/i.test(query) || /urgent tasks are left/i.test(query)) {
    const urgentCount = tasks.filter((t) => t.urgencyLabel === "urgent" && !t.isCompleted).length;
    return `You have ${urgentCount} urgent task${urgentCount === 1 ? "" : "s"} remaining.`;
  }

  if (/how many important tasks/i.test(query) || /important tasks are left/i.test(query)) {
    const impCount = tasks.filter((t) => t.urgencyLabel === "important" && !t.isCompleted).length;
    return `You have ${impCount} important task${impCount === 1 ? "" : "s"} remaining.`;
  }

  // 3. Completed tasks / Percentage
  if (/how many completed tasks/i.test(query)) {
    const compCount = tasks.filter((t) => t.isCompleted).length;
    return `You have completed ${compCount} task${compCount === 1 ? "" : "s"}.`;
  }

  if (/what percentage have i completed/i.test(query) || /completion percentage/i.test(query)) {
    if (tasks.length === 0) return "You don't have any tasks yet.";
    const compCount = tasks.filter((t) => t.isCompleted).length;
    const percentage = Math.round((compCount / tasks.length) * 100);
    return `You have completed ${percentage}% of your tasks (${compCount} out of ${tasks.length}).`;
  }

  // 4. Overdue tasks
  if (/what tasks are overdue/i.test(query) || /how many overdue/i.test(query)) {
    const now = Date.now();
    const overdue = tasks.filter((t) => !t.isCompleted && new Date(t.deadline).getTime() < now);
    if (overdue.length === 0) return "Great job! You have no overdue tasks.";
    
    if (/how many/i.test(query)) {
      return `You have ${overdue.length} overdue task${overdue.length === 1 ? "" : "s"}.`;
    }

    const titles = overdue.map((t) => `- ${t.title}`).join("\n");
    return `You have ${overdue.length} overdue task${overdue.length === 1 ? "" : "s"}:\n${titles}`;
  }

  // 5. Highest priority
  if (/highest priority task/i.test(query)) {
    const incomplete = tasks.filter(t => !t.isCompleted);
    if (incomplete.length === 0) return "You have no pending tasks.";
    
    const highest = incomplete.reduce((prev, curr) => (curr.urgencyScore > prev.urgencyScore ? curr : prev), incomplete[0]);
    return `Your highest priority task right now is:\n**${highest.title}** (Score: ${highest.urgencyScore})`;
  }

  // 6. Due today / Due this week
  if (/due today/i.test(query)) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dueToday = tasks.filter((t) => {
      const d = new Date(t.deadline);
      return d >= today && d < tomorrow && !t.isCompleted;
    });

    if (dueToday.length === 0) return "You have no tasks due today.";
    if (/how many/i.test(query)) return `You have ${dueToday.length} task${dueToday.length === 1 ? "" : "s"} due today.`;
    
    const titles = dueToday.map((t) => `- ${t.title}`).join("\n");
    return `Tasks due today:\n${titles}`;
  }

  if (/due this week/i.test(query)) {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const dueWeek = tasks.filter((t) => {
      const d = new Date(t.deadline);
      return d > now && d <= weekFromNow && !t.isCompleted;
    });

    if (dueWeek.length === 0) return "You have no tasks due in the next 7 days.";
    if (/how many/i.test(query)) return `You have ${dueWeek.length} task${dueWeek.length === 1 ? "" : "s"} due this week.`;
    
    const titles = dueWeek.map((t) => `- ${t.title}`).join("\n");
    return `Tasks due this week:\n${titles}`;
  }

  // 7. Show important / urgent
  if (/show all important tasks/i.test(query)) {
    const imp = tasks.filter((t) => t.urgencyLabel === "important" && !t.isCompleted);
    if (imp.length === 0) return "You have no important tasks.";
    const titles = imp.map((t) => `- ${t.title}`).join("\n");
    return `Important tasks:\n${titles}`;
  }

  if (/show all urgent tasks/i.test(query) || /show urgent tasks/i.test(query)) {
    const urg = tasks.filter((t) => t.urgencyLabel === "urgent" && !t.isCompleted);
    if (urg.length === 0) return "You have no urgent tasks.";
    const titles = urg.map((t) => `- ${t.title}`).join("\n");
    return `Urgent tasks:\n${titles}`;
  }

  // If no heuristic matched, return null to fall back to Gemini / LLM router
  return null;
}
