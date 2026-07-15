import { Octokit } from "octokit";

export type PrFile = {
  filePath: string;
  patch: string;
};

function getToken(): string {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN is required. Set it in the MCP server's environment.");
  }
  return token;
}

export function getOctokit(): Octokit {
  return new Octokit({ auth: getToken() });
}

export async function getPrInfo(octokit: Octokit, owner: string, repo: string, prNumber: number) {
  const { data } = await octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}", {
    owner,
    repo,
    pull_number: prNumber,
  });
  return { title: data.title, author: data.user?.login || "unknown" };
}

const FILES_PER_PAGE = 100;

/** Fetches per-file unified diffs for a PR — used for security scanning and test generation. */
export async function getPrFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number
): Promise<PrFile[]> {
  const { data } = await octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}/files", {
    owner,
    repo,
    pull_number: prNumber,
    per_page: FILES_PER_PAGE,
  });

  const files: PrFile[] = [];
  for (const file of data) {
    if (!file.patch) continue;
    files.push({ filePath: file.filename, patch: file.patch });
  }
  return files;
}

/** Fetches the full unified diff for a PR — used for the review tool's prompt. */
export async function getPrDiff(octokit: Octokit, owner: string, repo: string, prNumber: number): Promise<string> {
  const { data } = await octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}", {
    owner,
    repo,
    pull_number: prNumber,
    mediaType: { format: "diff" },
  });
  const diff = data as unknown as string;
  return diff.length > 50_000 ? diff.slice(0, 50_000) + "\n\n...(truncated)" : diff;
}
