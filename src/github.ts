import { Octokit } from "@octokit/rest";

const github = new Octokit({ auth: process.env.GITHUB_TOKEN });

export async function fetchRepoContext(owner: string, repo: string) {
  const [repoData, readmeData, commits] = await Promise.all([
    github.repos.get({ owner, repo }),
    github.repos
      .getReadme({ owner, repo, mediaType: { format: "raw" } })
      .catch(() => ({ data: "No README" })),
    github.repos.listCommits({ owner, repo, per_page: 5 }),
  ]);

  return {
    readme: String(readmeData.data).slice(0, 2000), // Token limit
    recentCommits: commits.data.map((c) => c.commit.message),
    language: repoData.data.language || "Unknown",
  };
}
