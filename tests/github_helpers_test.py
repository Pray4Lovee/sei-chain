"""Robust tests for GitHub attribution and commit author resolution."""

from __future__ import annotations

from typing import Dict
from unittest.mock import MagicMock

import pytest

from claim_kin_agent_attribution.github_helpers import (
    CommitAuthor,
    GitHubSourceControlHistoryItemDetailsProvider,
    _extract_commit_author_details,
    _normalise_repo,
)


# ----------------------------------------------------------------------
# Core logic: _extract_commit_author_details()
# ----------------------------------------------------------------------


def test_extract_commit_author_prefers_login_over_name() -> None:
    payload = {"author": {"login": "octocat", "name": "The Octocat"}}
    result = _extract_commit_author_details(payload)
    assert result == CommitAuthor("octocat", "author")


def test_extract_commit_author_fallbacks_order() -> None:
    payload = {"commit": {"committer": {"name": "Bob Builder"}}}
    result = _extract_commit_author_details(payload)
    assert result == CommitAuthor("Bob Builder", "commit.committer")


def test_extract_commit_author_empty_payload_returns_none() -> None:
    result = _extract_commit_author_details({})
    assert result is None


# ----------------------------------------------------------------------
# Repo normalizer: _normalise_repo()
# ----------------------------------------------------------------------


@pytest.mark.parametrize(
    "input_repo, expected",
    [
        ("https://github.com/user/repo", "user/repo"),
        ("https://github.com/user/repo/", "user/repo"),
        ("user/repo", "user/repo"),
        ("user/repo/", "user/repo"),
        ("/user/repo/", "user/repo"),
    ],
)
def test_repo_normalisation(input_repo: str, expected: str) -> None:
    assert _normalise_repo(input_repo) == expected


# ----------------------------------------------------------------------
# GitHub API wrapper logic: GitHubSourceControlHistoryItemDetailsProvider
# ----------------------------------------------------------------------


def make_fake_response(payload: Dict[str, object]):
    class FakeResponse:
        def raise_for_status(self) -> None:
            pass

        def json(self) -> Dict[str, object]:
            return payload

    return FakeResponse()


def test_provider_returns_correct_author_from_author_login() -> None:
    payload = {"author": {"login": "octocat"}}
    session = MagicMock()
    session.get.return_value = make_fake_response(payload)

    provider = GitHubSourceControlHistoryItemDetailsProvider(session=session)
    author = provider.get_commit_author_details("octocat/Hello-World", "abc123")

    assert isinstance(author, CommitAuthor)
    assert author.identifier == "octocat"
    assert author.source == "author"


def test_provider_handles_commit_author_name() -> None:
    payload = {"commit": {"author": {"name": "Alice Wonderland"}}}
    session = MagicMock()
    session.get.return_value = make_fake_response(payload)

    provider = GitHubSourceControlHistoryItemDetailsProvider(session=session)
    author = provider.get_commit_author_details("org/repo", "def456")

    assert author == CommitAuthor("Alice Wonderland", "commit.author")


def test_provider_handles_missing_author_fields_gracefully() -> None:
    payload = {"commit": {"message": "no author info"}}
    session = MagicMock()
    session.get.return_value = make_fake_response(payload)

    provider = GitHubSourceControlHistoryItemDetailsProvider(session=session)
    author = provider.get_commit_author_details("user/repo", "noauth123")

    assert author is None


def test_provider_handles_api_error_and_logs() -> None:
    session = MagicMock()
    session.get.side_effect = Exception("API down")

    provider = GitHubSourceControlHistoryItemDetailsProvider(session=session)
    author = provider.get_commit_author_details("broken/repo", "deadbeef")

    assert author is None


def test_provider_batch_get_commit_authors() -> None:
    payloads = {
        "sha1": {"author": {"login": "octocat"}},
        "sha2": {"commit": {"committer": {"name": "Builder Bob"}}},
        "sha3": {},
    }

    session = MagicMock()

    def mock_get(url, headers=None, timeout=10):  # type: ignore[no-untyped-def]
        if "sha1" in url:
            return make_fake_response(payloads["sha1"])
        if "sha2" in url:
            return make_fake_response(payloads["sha2"])
        if "sha3" in url:
            return make_fake_response(payloads["sha3"])
        raise Exception("Unknown SHA")

    session.get.side_effect = mock_get

    provider = GitHubSourceControlHistoryItemDetailsProvider(session=session)
    results = provider.get_commit_authors("org/repo", ["sha1", "sha2", "sha3"])

    assert results["sha1"] == CommitAuthor("octocat", "author")
    assert results["sha2"] == CommitAuthor("Builder Bob", "commit.committer")
    assert results["sha3"] is None
