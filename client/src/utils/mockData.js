// Metrics computation — used by dashboard and epic detail pages

const EPIC_COLORS = ["#22d3ee", "#a855f7", "#10b981", "#f59e0b", "#3b82f6", "#ec4899", "#f97316"];

export function computeDashboardMetrics(tasks, team) {
  const totalStories = tasks.length;
  const totalPoints = tasks.reduce((sum, t) => sum + (t.story_points || 0), 0);
  const completedPoints = tasks.filter((t) => t.status === "Done").reduce((sum, t) => sum + (t.story_points || 0), 0);
  const unestimated = tasks.filter((t) => !t.story_points).length;
  const unassigned = tasks.filter((t) => !t.assignee).length;
  const teamCapacity = team.reduce((sum, m) => sum + m.capacity, 0);
  const overCapacity = Math.max(0, totalPoints - teamCapacity);

  const statusBreakdown = {
    "To Do": tasks.filter((t) => t.status === "To Do").length,
    "In Progress": tasks.filter((t) => t.status === "In Progress").length,
    "In Review": tasks.filter((t) => t.status === "In Review").length,
    Done: tasks.filter((t) => t.status === "Done").length,
  };

  // Group by epic
  const epicMap = {};
  tasks.forEach((t) => {
    const key = t.epic_key || "NONE";
    if (!epicMap[key]) {
      epicMap[key] = {
        key,
        name: t.epic_name || "No Epic",
        tasks: [],
        totalPoints: 0,
        completedPoints: 0,
      };
    }
    epicMap[key].tasks.push(t);
    epicMap[key].totalPoints += t.story_points || 0;
    if (t.status === "Done") {
      epicMap[key].completedPoints += t.story_points || 0;
    }
  });

  const epics = Object.values(epicMap).map((epic, i) => ({
    ...epic,
    storyCount: epic.tasks.length,
    completionPct: epic.totalPoints > 0 ? Math.round((epic.completedPoints / epic.totalPoints) * 100) : 0,
    color: EPIC_COLORS[i % EPIC_COLORS.length],
  }));

  return {
    totalStories,
    totalPoints,
    completedPoints,
    unestimated,
    unassigned,
    teamCapacity,
    overCapacity,
    statusBreakdown,
    epics,
  };
}
