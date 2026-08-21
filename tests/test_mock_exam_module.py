"""Phase 4A: mock_tests.exam_module taxonomy (admin + schema; runtime inert)."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock, patch
from uuid import UUID

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.admin import mocks as mocks_mod
from app.admin.mocks import _publish_blockers
from app.admin.schemas import (
    CreateMockRequest,
    ModuleSectionStatus,
    PatchMockRequest,
    SectionStatus,
)
from app.admin.writing_taxonomy import assert_valid_exam_module

ADMIN_ID = UUID("22222222-2222-4222-8222-222222222222")
MOCK_ID = UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")


def _backend_root() -> Path:
    """Resolve backend/ whether this file lives under backend/tests or admin/tests symlink."""
    here = Path(__file__).resolve()
    for parent in [here.parent, *here.parents]:
        if (parent / "app").is_dir() and (parent / "supabase" / "migrations").is_dir():
            return parent
        nested = parent / "backend"
        if (nested / "app").is_dir() and (nested / "supabase" / "migrations").is_dir():
            return nested
    raise RuntimeError("Could not locate backend root")


BACKEND_ROOT = _backend_root()
MIGRATION = (
    BACKEND_ROOT
    / "supabase"
    / "migrations"
    / "20260821140000_mock_tests_exam_module.sql"
)


# ---------------------------------------------------------------------------
# Database / migration
# ---------------------------------------------------------------------------


def test_migration_adds_nullable_exam_module_with_check():
    sql = MIGRATION.read_text()
    assert "ADD COLUMN IF NOT EXISTS exam_module text" in sql
    assert "'academic'" in sql
    assert "'general_training'" in sql
    assert "'both'" in sql
    assert "exam_module IS NULL" in sql
    # No bulk backfill / retag of existing mocks
    assert "UPDATE mock_tests" not in sql.upper().replace("\n", " ")
    assert "SET exam_module" not in sql


@pytest.mark.parametrize("value", ["academic", "general_training", "both"])
def test_exam_module_values_accepted(value: str):
    assert assert_valid_exam_module(value, required=False) == value
    CreateMockRequest(title="Mock", exam_module=value)  # type: ignore[arg-type]


def test_exam_module_null_accepted_on_create():
    body = CreateMockRequest(title="Unclassified mock", exam_module=None)
    assert body.exam_module is None


@pytest.mark.parametrize("bad", ["GT", "general", "Academic", "foundation", "random"])
def test_invalid_exam_module_rejected_by_schema(bad: str):
    with pytest.raises(ValidationError):
        CreateMockRequest(title="Bad", exam_module=bad)  # type: ignore[arg-type]


def test_invalid_exam_module_rejected_by_validator():
    with pytest.raises(HTTPException) as exc:
        assert_valid_exam_module("GT", required=False)
    assert exc.value.detail["code"] == "exam_module_invalid"


# ---------------------------------------------------------------------------
# Admin create / patch / list item mapping
# ---------------------------------------------------------------------------


def test_create_mock_persists_academic_exam_module():
    body = CreateMockRequest(title="Academic Writing Mock", exam_module="academic")
    captured: dict = {}
    sb = MagicMock()
    chain = MagicMock()
    chain.insert.side_effect = lambda payload: (captured.update(payload) or chain)
    chain.execute.return_value = MagicMock(data=[{"id": str(MOCK_ID)}])
    sb.table.return_value = chain

    with (
        patch("app.admin.mocks.get_supabase", return_value=sb),
        patch("app.admin.mocks.next_catalog_number", return_value=9),
        patch("app.admin.mocks._seed_mock_modules"),
        patch("app.admin.mocks.log_admin_action"),
        patch("app.admin.mocks._invalidate_picker_catalog"),
        patch(
            "app.admin.mocks.get_mock_detail",
            return_value=MagicMock(exam_module="academic"),
        ),
        patch(
            "app.admin.mocks._exec",
            side_effect=lambda q, **kw: q.execute() if hasattr(q, "execute") else q,
        ),
    ):
        res = mocks_mod.create_mock(body=body, admin_id=ADMIN_ID)

    assert captured.get("exam_module") == "academic"
    assert res.exam_module == "academic"


@pytest.mark.parametrize("mod", ["general_training", "both"])
def test_create_mock_supports_gt_and_both(mod: str):
    body = CreateMockRequest(title=f"Mock {mod}", exam_module=mod)  # type: ignore[arg-type]
    captured: dict = {}
    sb = MagicMock()
    chain = MagicMock()
    chain.insert.side_effect = lambda payload: (captured.update(payload) or chain)
    chain.execute.return_value = MagicMock(data=[{"id": str(MOCK_ID)}])
    sb.table.return_value = chain

    with (
        patch("app.admin.mocks.get_supabase", return_value=sb),
        patch("app.admin.mocks.next_catalog_number", return_value=10),
        patch("app.admin.mocks._seed_mock_modules"),
        patch("app.admin.mocks.log_admin_action"),
        patch("app.admin.mocks._invalidate_picker_catalog"),
        patch(
            "app.admin.mocks.get_mock_detail",
            return_value=MagicMock(exam_module=mod),
        ),
        patch(
            "app.admin.mocks._exec",
            side_effect=lambda q, **kw: q.execute() if hasattr(q, "execute") else q,
        ),
    ):
        res = mocks_mod.create_mock(body=body, admin_id=ADMIN_ID)
    assert captured["exam_module"] == mod
    assert res.exam_module == mod


def test_create_mock_omits_exam_module_when_unset():
    body = CreateMockRequest(title="Unclassified")
    captured: dict = {}
    sb = MagicMock()
    chain = MagicMock()
    chain.insert.side_effect = lambda payload: (captured.update(payload) or chain)
    chain.execute.return_value = MagicMock(data=[{"id": str(MOCK_ID)}])
    sb.table.return_value = chain

    with (
        patch("app.admin.mocks.get_supabase", return_value=sb),
        patch("app.admin.mocks.next_catalog_number", return_value=11),
        patch("app.admin.mocks._seed_mock_modules"),
        patch("app.admin.mocks.log_admin_action"),
        patch("app.admin.mocks._invalidate_picker_catalog"),
        patch(
            "app.admin.mocks.get_mock_detail",
            return_value=MagicMock(exam_module=None),
        ),
        patch(
            "app.admin.mocks._exec",
            side_effect=lambda q, **kw: q.execute() if hasattr(q, "execute") else q,
        ),
    ):
        mocks_mod.create_mock(body=body, admin_id=ADMIN_ID)
    assert "exam_module" not in captured


def test_patch_mock_persists_exam_module():
    body = PatchMockRequest(exam_module="both")
    assert "exam_module" in body.model_fields_set
    updates_seen: dict = {}
    sb = MagicMock()
    chain = MagicMock()
    chain.update.side_effect = lambda payload: (updates_seen.update(payload) or chain)
    chain.eq.return_value = chain
    chain.execute.return_value = MagicMock(data=[])
    sb.table.return_value = chain

    with (
        patch("app.admin.mocks.get_supabase", return_value=sb),
        patch("app.admin.mocks.log_admin_action"),
        patch("app.admin.mocks._invalidate_picker_catalog"),
        patch(
            "app.admin.mocks.get_mock_detail",
            return_value=MagicMock(exam_module="both"),
        ),
        patch(
            "app.admin.mocks._exec",
            side_effect=lambda q, **kw: q.execute() if hasattr(q, "execute") else q,
        ),
    ):
        res = mocks_mod.patch_mock(mock_id=MOCK_ID, body=body, admin_id=ADMIN_ID)
    assert updates_seen.get("exam_module") == "both"
    assert res.exam_module == "both"


def test_build_mock_list_item_returns_exam_module():
    row = {
        "id": str(MOCK_ID),
        "title": "Mock 1",
        "description": None,
        "status": "draft",
        "is_published": False,
        "is_free": False,
        "catalog_number": 1,
        "exam_module": "academic",
        "created_at": "2026-08-01T00:00:00Z",
    }
    item = mocks_mod._build_mock_list_item(
        row, module_rows=[], counts={}, attempt_count=0
    )
    assert item.exam_module == "academic"


def test_build_mock_list_item_null_exam_module():
    row = {
        "id": str(MOCK_ID),
        "title": "Mock 1",
        "description": None,
        "status": "published",
        "is_published": True,
        "is_free": False,
        "catalog_number": 1,
        "exam_module": None,
        "created_at": "2026-08-01T00:00:00Z",
    }
    item = mocks_mod._build_mock_list_item(
        row, module_rows=[], counts={}, attempt_count=0
    )
    assert item.exam_module is None


# ---------------------------------------------------------------------------
# Publish validation
# ---------------------------------------------------------------------------


def _ok_sections() -> list[ModuleSectionStatus]:
    return [
        ModuleSectionStatus(
            module="listening",
            sections=[
                SectionStatus(part=1, question_count=1, has_audio=True),
            ],
        ),
        ModuleSectionStatus(
            module="writing",
            sections=[SectionStatus(part=1, question_count=1, has_audio=False)],
        ),
    ]


def test_publish_allows_null_exam_module():
    blockers = _publish_blockers(
        section_status=_ok_sections(),
        enabled_modules={"listening", "writing"},
        exam_module=None,
        writing_question_types=["task1_academic"],
    )
    assert blockers == []


def test_publish_rejects_gt_module_with_task1_academic():
    blockers = _publish_blockers(
        section_status=_ok_sections(),
        enabled_modules={"listening", "writing"},
        exam_module="general_training",
        writing_question_types=["task1_academic"],
    )
    assert any("incompatible" in b for b in blockers)


def test_publish_rejects_academic_module_with_task1_general():
    blockers = _publish_blockers(
        section_status=_ok_sections(),
        enabled_modules={"listening", "writing"},
        exam_module="academic",
        writing_question_types=["task1_general"],
    )
    assert any("incompatible" in b for b in blockers)


def test_publish_allows_both_with_either_task1():
    for q in ("task1_academic", "task1_general"):
        blockers = _publish_blockers(
            section_status=_ok_sections(),
            enabled_modules={"listening", "writing"},
            exam_module="both",
            writing_question_types=[q],
        )
        assert blockers == []


# ---------------------------------------------------------------------------
# Runtime inert — Writing Skill / FSP do not read mock_tests.exam_module
# ---------------------------------------------------------------------------


def test_writing_skill_mock_resolver_does_not_select_mock_exam_module():
    src = (BACKEND_ROOT / "app" / "practice" / "writing_skill_mock.py").read_text()
    assert "program_content_items" in src
    assert '.select("id")' in src
    mock_block = src[
        src.index('table("mock_tests")') : src.index('table("mock_tests")') + 200
    ]
    assert "exam_module" not in mock_block
    assert src.index("program_content_items") < src.index('table("mock_tests")')


def test_writing_skill_mock_source_uses_program_content_items_for_track():
    src = (BACKEND_ROOT / "app" / "practice" / "writing_skill_mock.py").read_text()
    assert "program_content_items" in src
    assert 'in_("exam_module"' in src or '.in_("exam_module"' in src


def test_fsp_writing_track_still_uses_practice_sets_only():
    src = (BACKEND_ROOT / "app" / "practice" / "writing_track.py").read_text()
    assert "set_exam_module" in src
    assert "mock_tests" not in src
