"""Mock writing builder accepts task1_general (Phase 3)."""

from __future__ import annotations

from unittest.mock import MagicMock, patch
from uuid import UUID

import pytest
from fastapi import HTTPException

from app.admin.schemas import WritingBuilderSaveRequest
from app.admin import writing_builder as wb

MOCK_ID = UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
ADMIN_ID = UUID("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")


def test_save_mock_writing_task1_general():
    body = WritingBuilderSaveRequest(
        prompt="Write a letter to your landlord about a repair.",
        question_type="task1_general",
    )
    sb = MagicMock()
    chain = MagicMock()
    chain.select.return_value = chain
    chain.eq.return_value = chain
    chain.in_.return_value = chain
    chain.delete.return_value = chain
    chain.insert.return_value = chain
    chain.limit.return_value = chain
    chain.execute.return_value = MagicMock(data=[{"id": str(MOCK_ID)}])
    sb.table.return_value = chain

    with (
        patch("app.admin.writing_builder.get_supabase", return_value=sb),
        patch("app.admin.writing_builder.log_admin_action"),
        patch("app.admin.writing_builder._invalidate_writing_caches"),
    ):
        res = wb.save_writing_part(
            mock_id=MOCK_ID, part=1, body=body, admin_id=ADMIN_ID
        )
    assert res.question_type == "task1_general"
    insert_payload = chain.insert.call_args.args[0]
    assert insert_payload["question_type"] == "task1_general"


def test_save_mock_writing_rejects_invalid_type():
    body = WritingBuilderSaveRequest(
        prompt="x",
        question_type="task1_unknown",
    )
    with pytest.raises(HTTPException) as exc:
        wb.save_writing_part(
            mock_id=MOCK_ID, part=1, body=body, admin_id=ADMIN_ID
        )
    assert exc.value.detail["code"] == "question_type_invalid"
