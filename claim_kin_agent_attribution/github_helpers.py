"""Helpers for attributing GitHub commits to KinBridge claimants."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Dict, Iterable, Mapping, Optional, TYPE_CHECKING

try:  # pragma: no cover - optional dependency for runtime usage
    import requests  # type: ignore
except Exception:  # pragma: no cover - fallback for environments without requests
    requests = None  # type: ignore

if TYPE_CHECKING:  # pragma: no cover - import only for typing
    from requests import Session as RequestsSession
else:
    RequestsSession = Any  # type: ignore

_LOGGER = logging.getLogger(__name__)


@dataclass(frozen=True)
class CommitAuthor:
    """Represents an author resolved from a GitHub commit payload."""

    identifier: str
    source: str


def _deep_get(payload: Mapping[str, Any], path: Iterable[str]) -> Optional[Any]:
    current: Any = payload
    for key in path:
        if not isinstance(current, Mapping) or key not in current:
            return None
        current = current[key]
    return current


def _extract_commit_author_details(payload: Mapping[str, Any]) -> Optional[CommitAuthor]:
    """Extract a commit author from a GitHub commit payload."""

    if not isinstance(payload, Mapping):
        return None

    search_paths = [
        (("author", "login"), "author"),
        (("author", "name"), "author"),
        (("committer", "login"), "committer"),
        (("committer", "name"), "committer"),
        (("commit", "author", "login"), "commit.author"),
        (("commit", "author", "name"), "commit.author"),
        (("commit", "author", "email"), "commit.author"),
        (("commit", "committer", "login"), "commit.committer"),
        (("commit", "committer", "name"), "commit.committer"),
        (("commit", "committer", "email"), "commit.committer"),
    ]

    for path, source in search_paths:
        value = _deep_get(payload, path)
        if value:
            return CommitAuthor(str(value), source)

    return None


def _normalise_repo(repo: str) -> str:
    """Normalise a GitHub repo string to the ``owner/name`` form."""

    cleaned = (repo or "").strip()
    if cleaned.startswith(("http://", "https://")):
        cleaned = cleaned.split("github.com", 1)[-1]
    if "github.com:" in cleaned:
        cleaned = cleaned.split("github.com:", 1)[-1]
    if "github.com/" in cleaned:
        cleaned = cleaned.split("github.com/", 1)[-1]
    if cleaned.startswith("git@") and ":" in cleaned:
        cleaned = cleaned.split(":", 1)[-1]
    cleaned = cleaned.strip("/")
    if cleaned.startswith(":"):
        cleaned = cleaned[1:]
    return cleaned


class GitHubSourceControlHistoryItemDetailsProvider:
    """Resolve commit author metadata using the GitHub API."""

    def __init__(
        self,
        *,
        session: Optional[RequestsSession] = None,
        token: Optional[str] = None,
        base_url: str = "https://api.github.com",
        timeout: int = 10,
        logger: Optional[logging.Logger] = None,
    ) -> None:
        if session is not None:
            self._session = session
        else:
            if requests is None:  # pragma: no cover - triggered when requests missing
                raise RuntimeError(
                    "requests library is required when no session is provided"
                )
            self._session = requests.Session()

        self._base_url = base_url.rstrip("/")
        self._timeout = timeout
        self._logger = logger or _LOGGER

        headers: Dict[str, str] = {"Accept": "application/vnd.github+json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        self._headers = headers

    def _build_url(self, repo: str, sha: str) -> str:
        normalised_repo = _normalise_repo(repo)
        return f"{self._base_url}/repos/{normalised_repo}/commits/{sha}"

    def get_commit_author_details(
        self, repo: str, sha: str
    ) -> Optional[CommitAuthor]:
        """Retrieve author details for a single commit."""

        url = self._build_url(repo, sha)
        try:
            response = self._session.get(
                url,
                headers=self._headers,
                timeout=self._timeout,
            )
            response.raise_for_status()
        except Exception as exc:  # pragma: no cover - network failure path
            self._logger.warning(
                "Failed to fetch commit %s from %s: %s", sha, repo, exc
            )
            return None

        try:
            payload = response.json()
        except Exception as exc:  # pragma: no cover - invalid JSON path
            self._logger.warning(
                "Failed to decode commit payload for %s@%s: %s", repo, sha, exc
            )
            return None

        return _extract_commit_author_details(payload)

    def get_commit_authors(
        self, repo: str, shas: Iterable[str]
    ) -> Dict[str, Optional[CommitAuthor]]:
        """Batch resolve commit authors for the provided SHAs."""

        results: Dict[str, Optional[CommitAuthor]] = {}
        for sha in shas:
            results[sha] = self.get_commit_author_details(repo, sha)
        return results
