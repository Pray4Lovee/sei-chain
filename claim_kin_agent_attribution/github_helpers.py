"""Helpers for resolving GitHub commit attribution details."""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Dict, Iterable, Mapping, Optional

try:  # pragma: no cover - optional dependency for production use
    import requests
except Exception:  # pragma: no cover - gracefully handle absence during tests
    requests = None  # type: ignore

logger = logging.getLogger(__name__)

@dataclass(frozen=True)
class CommitAuthor:
    """Simple representation of a commit author."""
    identifier: str
    source: str


def _normalise_repo(repo: str) -> str:
    """Normalise GitHub repository identifiers to ``owner/name`` format."""
    cleaned = repo.strip()
    if cleaned.startswith("https://github.com/"):
        cleaned = cleaned[len("https://github.com/") :]
    cleaned = cleaned.strip("/")
    if cleaned.startswith("github.com/"):
        cleaned = cleaned[len("github.com/") :]
    return cleaned


def _extract_commit_author_details(payload: Mapping[str, Any]) -> Optional[CommitAuthor]:
    """Extract the best available author identifier from a commit payload."""
    if not payload:
        return None

    def extract(path: Iterable[str]) -> Optional[str]:
        current: Any = payload
        for key in path:
            if not isinstance(current, Mapping):
                return None
            current = current.get(key)
            if current is None:
                return None
        if isinstance(current, str) and current.strip():
            return current.strip()
        return None

    candidate_paths = [
        (("author", "login"), "author"),
        (("author", "name"), "author"),
        (("commit", "author", "login"), "commit.author"),
        (("commit", "author", "name"), "commit.author"),
        (("commit", "committer", "login"), "commit.committer"),
        (("commit", "committer", "name"), "commit.committer"),
    ]

    for path, source in candidate_paths:
        value = extract(path)
        if value is not None:
            return CommitAuthor(value, source)
    return None


class GitHubSourceControlHistoryItemDetailsProvider:
    """Lightweight wrapper around the GitHub commits API."""

    def __init__(
        self,
        session: Any | None = None,
        base_url: str = "https://api.github.com",
        timeout: int = 10,
        headers: Optional[Dict[str, str]] = None,
    ) -> None:
        if session is None:
            if requests is None:  # pragma: no cover - requests may be unavailable in tests
                raise RuntimeError("requests must be installed when no session is provided")
            session = requests.Session()
        self.session = session
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.headers = headers if headers is not None else {
            "Accept": "application/vnd.github+json",
        }

    def _build_commit_url(self, repo: str, sha: str) -> str:
        repo_slug = _normalise_repo(repo)
        return f"{self.base_url}/repos/{repo_slug}/commits/{sha}"

    def get_commit_author_details(self, repo: str, sha: str) -> Optional[CommitAuthor]:
        url = self._build_commit_url(repo, sha)
        try:
            response = self.session.get(url, headers=self.headers, timeout=self.timeout)
            response.raise_for_status()
            payload = response.json()
        except Exception:  # pragma: no cover - exercised via unit tests
            logger.warning(
                "Failed to fetch commit author details for %s@%s", repo, sha, exc_info=True
            )
            return None
        return _extract_commit_author_details(payload)

    def get_commit_authors(self, repo: str, shas: Iterable[str]) -> Dict[str, Optional[CommitAuthor]]:
        results: Dict[str, Optional[CommitAuthor]] = {}
        for sha in shas:
            results[sha] = self.get_commit_author_details(repo, sha)
        return results


__all__ = [
    "CommitAuthor",
    "GitHubSourceControlHistoryItemDetailsProvider",
    "_extract_commit_author_details",
    "_normalise_repo",
]
