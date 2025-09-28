"""Helpers for resolving commit attribution from GitHub payloads."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable, Optional

try:  # pragma: no cover - optional dependency
    import requests
except Exception:  # pragma: no cover - fall back to typing-friendly stub
    requests = None  # type: ignore


@dataclass(frozen=True)
class CommitAuthor:
    """Represents a resolved commit author and the source of the data."""

    identifier: str
    source: str


def _extract_commit_author_details(payload: Dict) -> Optional[CommitAuthor]:
    """Extract author details from a GitHub commit payload.

    The resolution order matches GitHub's data availability, preferring
    the top-level ``author.login`` field followed by other fallbacks.
    """

    if not payload:
        return None

    author = payload.get("author") or {}
    login = author.get("login")
    if login:
        return CommitAuthor(login, "author")

    name = author.get("name")
    if name:
        return CommitAuthor(name, "author")

    commit = payload.get("commit") or {}

    commit_author = commit.get("author") or {}
    commit_author_name = commit_author.get("name")
    if commit_author_name:
        return CommitAuthor(commit_author_name, "commit.author")

    commit_committer = commit.get("committer") or {}
    commit_committer_name = commit_committer.get("name")
    if commit_committer_name:
        return CommitAuthor(commit_committer_name, "commit.committer")

    committer = payload.get("committer") or {}
    committer_login = committer.get("login")
    if committer_login:
        return CommitAuthor(committer_login, "committer")

    committer_name = committer.get("name")
    if committer_name:
        return CommitAuthor(committer_name, "committer")

    return None


def _normalise_repo(repo: str) -> str:
    """Normalise a repository string to ``owner/name`` format."""

    if repo.startswith("https://github.com/"):
        repo = repo[len("https://github.com/") :]
    return repo.strip("/")


class GitHubSourceControlHistoryItemDetailsProvider:
    """Fetch commit attribution details from the GitHub API."""

    def __init__(
        self,
        *,
        session=None,
        base_url: str = "https://api.github.com",
        token: Optional[str] = None,
        timeout: int = 10,
        logger=None,
    ) -> None:
        if session is None:
            if requests is None:  # pragma: no cover - handled during runtime
                raise RuntimeError("requests must be available when no session is provided")
            session = requests.Session()

        self._session = session
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout
        self._logger = logger
        self._headers = {"Accept": "application/vnd.github+json"}
        if token:
            self._headers["Authorization"] = f"Bearer {token}"

    def get_commit_author_details(self, repo: str, sha: str) -> Optional[CommitAuthor]:
        """Fetch the author details for a single commit SHA."""

        repo_path = _normalise_repo(repo)
        url = f"{self._base_url}/repos/{repo_path}/commits/{sha}"

        try:
            response = self._session.get(url, headers=self._headers, timeout=self._timeout)
            response.raise_for_status()
            payload = response.json() or {}
        except Exception as exc:  # pragma: no cover - behaviour verified via tests
            if self._logger is not None:
                self._logger.warning("Failed to fetch commit %s@%s: %s", repo_path, sha, exc)
            return None

        return _extract_commit_author_details(payload)

    def get_commit_authors(self, repo: str, shas: Iterable[str]) -> Dict[str, Optional[CommitAuthor]]:
        """Fetch author details for multiple commits in sequence."""

        results: Dict[str, Optional[CommitAuthor]] = {}
        for sha in shas:
            results[sha] = self.get_commit_author_details(repo, sha)
        return results
