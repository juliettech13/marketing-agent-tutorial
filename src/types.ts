export interface AgentState {
  repoOwner: string;
  repoName: string;
  repoContext: {
    readme: string;
    recentCommits: string[];
    language: string;
  } | null;
  contentType: "changelog" | "feature" | "use-case" | null;
  draft: string | null;
  step: "thought" | "action" | "observation" | "done";
}
