"""Utilities for resolving GitHub commit attribution information."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Dict, Iterable, Mapping, Optional

try:  # pragma: no cover - optional dependency only available at runtime
    import requests
except Exception:  # pragma: no cover
    requests = None  # type: ignore

_LOGGER = logging.getLogger(__name__)


@dataclass(frozen=True)
class CommitAuthor:
    """Represents an author extracted from a GitHub commit payload."""

    identifier: str
    source: str


def _normalise_repo(repo: str) -> str:
    """Return the ``owner/name`` format for a GitHub repository string."""

    value = (repo or "").strip()
    if not value:
        return value

    # Remove protocol and hostname when given a full URL.
    prefixes = (
        "https://github.com/",
        "http://github.com/",
        "git@github.com:",
        "git://github.com/",
    )
    for prefix in prefixes:
        if value.lower().startswith(prefix.lower()):
            value = value[len(prefix) :]
            break

    value = value.strip("/")
    if value.startswith("/"):
        value = value[1:]
    return value


def _extract_commit_author_details(payload: Mapping[str, object]) -> Optional[CommitAuthor]:
    """Extract :class:`CommitAuthor` data from a GitHub commit payload."""

    def _lookup(path: Iterable[str]) -> Optional[str]:
        current: object = payload
        for key in path:
            if not isinstance(current, Mapping):
                return None
            current = current.get(key)  # type: ignore[index]
        if isinstance(current, str) and current.strip():
            return current.strip()
        return None

    candidate_paths = (
        (("author", "login"), "author"),
        (("author", "name"), "author"),
        (("commit", "author", "login"), "commit.author"),
        (("commit", "author", "name"), "commit.author"),
        (("commit", "committer", "login"), "commit.committer"),
        (("commit", "committer", "name"), "commit.committer"),
    )

    for path, source in candidate_paths:
        value = _lookup(path)
        if value:
            return CommitAuthor(value, source)
    return None


class GitHubSourceControlHistoryItemDetailsProvider:
    """Resolve GitHub commit author details using the GitHub REST API."""

    def __init__(
        self,
        *,
        session: Optional[object] = None,
        base_url: str = "https://api.github.com",
        timeout: int = 10,
    ) -> None:
        self._session = session or (requests.Session() if requests else None)
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout

    def _make_commit_url(self, repo: str, sha: str) -> str:
        repo_part = _normalise_repo(repo)
        return f"{self._base_url}/repos/{repo_part}/commits/{sha}"

    def get_commit_author_details(self, repo: str, sha: str) -> Optional[CommitAuthor]:
        if not self._session:
            _LOGGER.warning("GitHub session is unavailable")
            return None

        url = self._make_commit_url(repo, sha)
        try:
            response = self._session.get(  # type: ignore[call-arg]
                url,
                headers={"Accept": "application/vnd.github+json"},
                timeout=self._timeout,
            )
            response.raise_for_status()
            payload = response.json()
        except Exception as exc:  # pragma: no cover - defensive logging branch
            _LOGGER.warning("Failed to fetch commit details for %s: %s", sha, exc)
            return None

        if not isinstance(payload, Mapping):
            _LOGGER.debug("Unexpected payload for %s: %r", sha, payload)
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
