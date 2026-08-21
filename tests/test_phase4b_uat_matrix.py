"""Phase 4B UAT — local published inventory matrix (FSP + Writing Skill PCI).

Requires local Supabase + UAT seed published. Does not activate writing_skill.
Does not modify the planner.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

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
)


def _is_local_supabase() -> bool:
    try:
        url = assert_safe_uat_database()
    except UnsafeDatabaseError:
        return False
    return any(h in url for h in ("127.0.0.1", "localhost"))


pytestmark = pytest.mark.skipif(
    not _is_local_supabase(),
    reason="Phase 4B UAT requires local Supabase (.env.local)",
)


HUB_ACAD = str(IDS["hub_academic_t1"])
HUB_BOTH = str(IDS["hub_both_t2"])
HUB_GT = str(IDS["hub_gt_t1"])


@pytest.fixture(scope="module")
def local_sb():
    get_settings.cache_clear()
    assert_safe_uat_database()
    from app.db.supabase_client import get_supabase

    try:
        get_supabase.cache_clear()
    except Exception:
        pass
    return get_supabase()


@pytest.fixture(scope="module", autouse=True)
def ensure_uat_published(local_sb):
    """Publish controlled UAT Writing sets + a few catalog Academic stand-ins."""
    for key in ("set_academic_t1", "set_both_t2", "set_gt_t1"):
        local_sb.table("practice_sets").update({"status": "published"}).eq(
            "id", str(IDS[key])
        ).execute()

    # Stand-ins for "existing Academic inventory must never appear for GT".
    catalog = (
        local_sb.table("practice_sets")
        .select("id, description, practice_banks!inner(skill)")
        .eq("practice_banks.skill", "writing")
        .eq("exam_module", "academic")
        .neq("description", UAT_MARKER)
        .limit(3)
        .execute()
    ).data or []
    catalog_ids = [str(r["id"]) for r in catalog]
    if catalog_ids:
        local_sb.table("practice_sets").update({"status": "published"}).in_(
            "id", catalog_ids
        ).execute()

    from app.practice.catalog import clear_hub_catalog_cache

    clear_hub_catalog_cache()
    return catalog_ids


def test_writing_skill_remains_inactive(local_sb):
    rows = (
        local_sb.table("plans")
        .select("slug, is_active")
        .eq("slug", "writing_skill")
        .limit(1)
        .execute()
    ).data or []
    assert rows and rows[0]["is_active"] is False


def test_uat_sets_published_with_expected_modules(local_sb):
    rows = (
        local_sb.table("practice_sets")
        .select("id, title, status, exam_module")
        .in_(
            "id",
            [
                str(IDS["set_academic_t1"]),
                str(IDS["set_both_t2"]),
                str(IDS["set_gt_t1"]),
            ],
        )
        .execute()
    ).data or []
    by_id = {str(r["id"]): r for r in rows}
    assert by_id[str(IDS["set_academic_t1"])]["status"] == "published"
    assert by_id[str(IDS["set_academic_t1"])]["exam_module"] == "academic"
    assert by_id[str(IDS["set_both_t2"])]["status"] == "published"
    assert by_id[str(IDS["set_both_t2"])]["exam_module"] == "both"
    assert by_id[str(IDS["set_gt_t1"])]["status"] == "published"
    assert by_id[str(IDS["set_gt_t1"])]["exam_module"] == "general_training"


def test_fsp_matrix_on_assignable_writing_pool(local_sb, ensure_uat_published):
    from app.practice.catalog import clear_hub_catalog_cache, get_hub_exam_modules
    from app.practice.repository import list_assignable_hubs_grouped
    from app.practice.writing_track import filter_writing_hub_ids

    clear_hub_catalog_cache()
    writing_hubs = list_assignable_hubs_grouped().get("writing") or []
    writing_ids = [str(h["id"]) for h in writing_hubs]
    exam_map = get_hub_exam_modules()

    # Controlled UAT hubs must be in the published assignable pool.
    for hid in (HUB_ACAD, HUB_BOTH, HUB_GT):
        assert hid in writing_ids, f"missing published UAT hub {hid}"

    academic_visible = set(
        filter_writing_hub_ids(
            writing_ids,
            hub_exam_module_by_id=exam_map,
            user_exam_module="academic",
        )
    )
    gt_visible = set(
        filter_writing_hub_ids(
            writing_ids,
            hub_exam_module_by_id=exam_map,
            user_exam_module="general_training",
        )
    )

    # Matrix on controlled UAT inventory
    assert HUB_ACAD in academic_visible and HUB_ACAD not in gt_visible
    assert HUB_GT in gt_visible and HUB_GT not in academic_visible
    assert HUB_BOTH in academic_visible and HUB_BOTH in gt_visible

    # All published Academic hubs (UAT Academic T1 + any other assignable Academic)
    # must never appear for the GT user.
    academic_hubs = {
        hid for hid in writing_ids if exam_map.get(hid) == "academic"
    }
    assert academic_hubs, "expected published Academic writing hubs for exclusion test"
    assert HUB_ACAD in academic_hubs
    assert academic_hubs.isdisjoint(gt_visible)
    # Catalog migration stubs may stay non-assignable (no bank content); that is OK.
    # When they are assignable, they must also be excluded from GT.
    for set_id in ensure_uat_published:
        hubs = (
            local_sb.table("practice_hubs")
            .select("id")
            .eq("set_id", set_id)
            .execute()
        ).data or []
        for h in hubs:
            hid = str(h["id"])
            if hid in writing_ids:
                assert exam_map.get(hid) == "academic"
                assert hid not in gt_visible


def test_writing_skill_pci_matrix(local_sb):
    """PCI attachment filter (does not require writing_skill.is_active / purchase)."""
    from app.practice.writing_skill_course import list_writing_skill_program_items

    plan = (
        local_sb.table("plans")
        .select("id, is_active")
        .eq("slug", "writing_skill")
        .limit(1)
        .execute()
    ).data or []
    assert plan and plan[0]["is_active"] is False
    plan_id = str(plan[0]["id"])

    academic_items = list_writing_skill_program_items(
        plan_id=plan_id, exam_module="academic"
    )
    gt_items = list_writing_skill_program_items(
        plan_id=plan_id, exam_module="general_training"
    )
    academic_hubs = {str(i["item_id"]) for i in academic_items}
    gt_hubs = {str(i["item_id"]) for i in gt_items}

    assert HUB_ACAD in academic_hubs and HUB_ACAD not in gt_hubs
    assert HUB_GT in gt_hubs and HUB_GT not in academic_hubs
    assert HUB_BOTH in academic_hubs and HUB_BOTH in gt_hubs
