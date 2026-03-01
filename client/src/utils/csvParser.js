import Papa from "papaparse";

// Maps common Jira CSV header variations to our internal field names
const COLUMN_MAP = {
  "issue key": "issue_key",
  "issuekey": "issue_key",
  "key": "issue_key",
  "summary": "summary",
  "status": "status",
  "story points": "story_points",
  "story point estimate": "story_points",
  "storypoints": "story_points",
  "assignee": "assignee",
  "epic link": "epic_key",
  "custom field (epic link)": "epic_key",
  "epic key": "epic_key",
  "epic name": "epic_name",
  "custom field (epic name)": "epic_name",
  "issue type": "issue_type",
  "issuetype": "issue_type",
  "type": "issue_type",
  "priority": "priority",
};

function normalizeHeader(header) {
  return header.trim().toLowerCase();
}

function normalizeStatus(raw) {
  if (!raw) return "To Do";
  const s = raw.trim().toLowerCase();
  if (s === "done" || s === "closed" || s === "resolved") return "Done";
  if (s === "in progress" || s === "in development") return "In Progress";
  if (s === "in review" || s === "code review" || s === "review") return "In Review";
  return "To Do";
}

export function parseJiraCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        if (!results.data || results.data.length === 0) {
          return reject(new Error("CSV file is empty"));
        }

        // Build header mapping from CSV columns → our fields
        const csvHeaders = Object.keys(results.data[0]);
        const headerMap = {};
        for (const h of csvHeaders) {
          const normalized = normalizeHeader(h);
          if (COLUMN_MAP[normalized]) {
            headerMap[h] = COLUMN_MAP[normalized];
          }
        }

        const tasks = results.data.map((row) => {
          const mapped = {};
          for (const [csvCol, field] of Object.entries(headerMap)) {
            mapped[field] = row[csvCol]?.trim() || null;
          }

          // Normalize specific fields
          mapped.status = normalizeStatus(mapped.status);
          mapped.story_points = mapped.story_points ? Number(mapped.story_points) : null;
          if (mapped.story_points !== null && isNaN(mapped.story_points)) {
            mapped.story_points = null;
          }

          return {
            issue_key: mapped.issue_key || "",
            summary: mapped.summary || "",
            status: mapped.status || "To Do",
            story_points: mapped.story_points,
            assignee: mapped.assignee || null,
            epic_key: mapped.epic_key || null,
            epic_name: mapped.epic_name || null,
            issue_type: mapped.issue_type || null,
            priority: mapped.priority || null,
          };
        });

        // Filter out rows without an issue key (likely garbage rows)
        const validTasks = tasks.filter((t) => t.issue_key);
        resolve(validTasks);
      },
      error(err) {
        reject(err);
      },
    });
  });
}
