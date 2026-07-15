import { Octokit } from "octokit";

export type PrFile = {
  filePath: string;
  patch: string;
};

const FILES_PER_PAGE = 100;

/** Fetches per-file unified diffs for a PR — used by scan and generate-tests. */
export async function getPrFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number
): Promise<PrFile[]> {
  // paginate() follows every page — a single per_page=100 request silently
  // truncated the file list for PRs touching more than 100 files.
  const data = await octokit.paginate("GET /repos/{owner}/{repo}/pulls/{pull_number}/files", {
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

/** Parses a PR reference like "owner/repo#42" into its parts. Returns null if malformed. */
export function parsePrRef(prRef: string): { owner: string; repo: string; prNumber: number } | null {
  const match = prRef.match(/^([^/]+)\/([^#]+)#(\d+)$/);
  if (!match) return null;
  const [, owner, repo, prNumberStr] = match;
  return { owner, repo, prNumber: parseInt(prNumberStr, 10) };
}
