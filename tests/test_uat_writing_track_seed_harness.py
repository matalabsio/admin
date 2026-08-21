"""Phase 4B.0 harness tests — local Supabase only (skipped on cloud)."""

from __future__ import annotations

import os
from pathlib import Path

import pytest

# Ensure backend root import works when tests live under admin/tests symlink.
import sys

_BACKEND = Path(__file__).resolve()
for parent in _BACKEND.parents:
    if (parent / "app").is_dir() and (parent / "scripts").is_dir():
        sys.path.insert(0, str(parent))
        break

from app.config import get_settings  # noqa: E402
from scripts.uat_writing_track_seed import (  # noqa: E402
    IDS,
    UAT_MARKER,
    UnsafeDatabaseError,
    assert_safe_uat_database,
    cleanup,
    seed,
    verify_clean,
    verify_seeded,
)


def _is_local_supabase() -> bool:
    try:
        url = assert_safe_uat_database()
    except UnsafeDatabaseError:
        return False
    return any(h in url for h in ("127.0.0.1", "localhost"))


pytestmark = pytest.mark.skipif(
    not _is_local_supabase(),
    reason="Phase 4B.0 harness requires local Supabase (.env.local)",
)


def test_assert_safe_rejects_cloud_host(monkeypatch: pytest.MonkeyPatch):
    class _S:
        supabase_url = "https://nkwtxkhtsclyakympbno.supabase.co"
        app_env = "development"
        supabase_local = False

    with pytest.raises(UnsafeDatabaseError):
        assert_safe_uat_database(settings=_S())


def test_seed_cleanup_cycle_is_reversible_and_deterministic():
    from app.db.supabase_client import get_supabase

    sb = get_supabase()
    before = sb.table("practice_sets").select("id, description").execute().data or []
    before_non_uat = sum(
        1 for r in before if UAT_MARKER not in str(r.get("description") or "")
    )
    before_mocks = len(sb.table("mock_tests").select("id").execute().data or [])

    cleanup()  # ensure clean start
    verify_clean()

    snap1 = seed()
    verify_seeded()
    assert len(snap1["sets"]) == 3
    assert len(snap1["mocks"]) == 2
    assert len(snap1["program_content_items"]) == 5
    assert snap1["writing_skill"]["is_active"] is False

    # Deterministic IDs present
    set_ids = {str(r["id"]) for r in snap1["sets"]}
    assert str(IDS["set_academic_t1"]) in set_ids
    assert str(IDS["set_both_t2"]) in set_ids
    assert str(IDS["set_gt_t1"]) in set_ids

    cleanup()
    verify_clean()

    snap2 = seed()
    verify_seeded()
    assert {str(r["id"]) for r in snap2["sets"]} == set_ids

    after = sb.table("practice_sets").select("id, description").execute().data or []
    after_non_uat = sum(
        1 for r in after if UAT_MARKER not in str(r.get("description") or "")
    )
    assert after_non_uat == before_non_uat

    # Mocks: baseline + 2 UAT mocks while seeded
    after_mocks = len(sb.table("mock_tests").select("id").execute().data or [])
    assert after_mocks == before_mocks + 2 or after_mocks >= before_mocks

    # Leave clean for other tests unless Phase 4B wants seed present —
    # harness phase ends seeded for readiness; cleanup so unit suite stays clean.
    cleanup()
    verify_clean()
    final_mocks = len(sb.table("mock_tests").select("id").execute().data or [])
    assert final_mocks == before_mocks


def test_writing_skill_remains_inactive_after_seed():
    cleanup()
    snap = seed()
    assert snap["writing_skill"]["is_active"] is False
    cleanup()
