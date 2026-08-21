"""Phase 3: Admin Writing exam_module + task1_general taxonomy."""

from __future__ import annotations

from unittest.mock import MagicMock, patch
from uuid import UUID

import pytest
from fastapi import HTTPException

from app.admin import question_bank as qb
from app.admin.schemas import (
    PatchQuestionBankSetRequest,
    QuestionBankCreateSetRequest,
    WritingBuilderSaveRequest,
)
from app.admin.writing_taxonomy import (
    assert_valid_exam_module,
    assert_valid_writing_question_type,
    assert_writing_task_exam_module_compatible,
    writing_task_exam_module_compatible,
    writing_taxonomy_publish_blockers,
)

SET_ID = UUID("11111111-1111-4111-8111-111111111111")
ADMIN_ID = UUID("22222222-2222-4222-8222-222222222222")
HUB_ID = "33333333-3333-4333-8333-333333333333"
BANK_ID = "55555555-5555-4555-8555-555555555555"
SECTION_ID = "66666666-6666-4666-8666-666666666666"


# ---------------------------------------------------------------------------
# Fixtures (test-only synthetic content shapes)
# ---------------------------------------------------------------------------


def fixture_task1_academic_prompt() -> str:
    return "The chart below shows energy consumption. Summarise the information."


def fixture_task1_general_letter_prompt() -> str:
    return (
        "You recently bought a product online that arrived damaged. "
        "Write a letter to the company. In your letter: describe the problem, "
        "explain how you felt, and say what you want them to do."
    )


def fixture_task2_both_prompt() -> str:
    return (
        "Some people think universities should focus on practical skills. "
        "Discuss both views and give your own opinion."
    )


# ---------------------------------------------------------------------------
# Exam module validation
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("value", ["academic", "general_training", "both"])
def test_exam_module_accepted(value: str):
    assert assert_valid_exam_module(value) == value


def test_exam_module_invalid_rejected():
    with pytest.raises(HTTPException) as exc:
        assert_valid_exam_module("foundation")
    assert exc.value.status_code == 400
    assert exc.value.detail["code"] == "exam_module_invalid"


def test_exam_module_required_when_empty():
    with pytest.raises(HTTPException) as exc:
        assert_valid_exam_module(None, required=True)
    assert exc.value.detail["code"] == "exam_module_required"


# ---------------------------------------------------------------------------
# Task types
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "raw,part,expected",
    [
        ("task1_academic", 1, "task1_academic"),
        ("task1_general", 1, "task1_general"),
        ("task2", 2, "task2"),
        (None, 1, "task1_academic"),
        ("", 2, "task2"),
    ],
)
def test_writing_question_types_accepted(raw, part, expected):
    assert assert_valid_writing_question_type(raw, part=part) == expected


def test_invalid_question_type_rejected():
    with pytest.raises(HTTPException) as exc:
        assert_valid_writing_question_type("task1_chart", part=1)
    assert exc.value.detail["code"] == "question_type_invalid"


# ---------------------------------------------------------------------------
# Combinations
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "q_type,exam_module,ok",
    [
        ("task1_academic", "academic", True),
        ("task1_academic", "both", True),
        ("task1_academic", "general_training", False),
        ("task1_general", "general_training", True),
        ("task1_general", "both", True),
        ("task1_general", "academic", False),
        ("task2", "academic", True),
        ("task2", "general_training", True),
        ("task2", "both", True),
    ],
)
def test_task_exam_module_combinations(q_type, exam_module, ok):
    assert (
        writing_task_exam_module_compatible(
            question_type=q_type, exam_module=exam_module
        )
        is ok
    )
    if ok:
        assert_writing_task_exam_module_compatible(
            question_type=q_type, exam_module=exam_module
        )
    else:
        with pytest.raises(HTTPException) as exc:
            assert_writing_task_exam_module_compatible(
                question_type=q_type, exam_module=exam_module
            )
        assert exc.value.detail["code"] == "writing_taxonomy_mismatch"


# ---------------------------------------------------------------------------
# Persistence: create / update / read exam_module
# ---------------------------------------------------------------------------


def _create_set_mock(skill: str = "writing"):
    sb = MagicMock()
    caches: dict[str, MagicMock] = {}
    counters = {"banks": 0, "sets": 0, "hubs": 0}

    def make_chain(name: str) -> MagicMock:
        if name in caches:
            return caches[name]
        m = MagicMock()
        m.select.return_value = m
        m.eq.return_value = m
        m.order.return_value = m
        m.limit.return_value = m
        m.insert.return_value = m
        m.update.return_value = m

        def exec_fn():
            if name == "practice_banks":
                counters["banks"] += 1
                if counters["banks"] == 1:
                    return MagicMock(data=[{"id": BANK_ID}])
                return MagicMock(data=[{"id": BANK_ID}])
            if name == "practice_sets":
                counters["sets"] += 1
                if counters["sets"] == 1:
                    return MagicMock(data=[{"set_number": 1}])
                return MagicMock(
                    data=[
                        {
                            "id": str(SET_ID),
                            "set_number": 2,
                            "title": "W set",
                        }
                    ]
                )
            if name == "practice_hubs":
                counters["hubs"] += 1
                if counters["hubs"] == 1:
                    return MagicMock(data=[{"sort_order": 1}])
                return MagicMock(
                    data=[{"id": HUB_ID, "slug": f"{skill}-custom-abcd"}]
                )
            return MagicMock(data=[])

        m.execute.side_effect = exec_fn
        caches[name] = m
        return m

    sb.table.side_effect = make_chain
    return sb, caches


def test_create_writing_set_stores_exam_module():
    body = QuestionBankCreateSetRequest(
        skill="writing",
        title="GT letter set",
        exam_module="general_training",
    )
    sb, caches = _create_set_mock("writing")
    with (
        patch("app.admin.question_bank.get_supabase", return_value=sb),
        patch("app.admin.question_bank.log_admin_action"),
        patch("app.admin.question_bank.videos_for_skill", return_value=[]),
    ):
        res = qb.create_question_bank_set(body=body, admin_id=ADMIN_ID)
    assert res.exam_module == "general_training"
    insert_payload = caches["practice_sets"].insert.call_args.args[0]
    assert insert_payload["exam_module"] == "general_training"


def test_create_writing_set_requires_exam_module():
    body = QuestionBankCreateSetRequest(skill="writing", title="Missing module")
    with pytest.raises(HTTPException) as exc:
        qb.create_question_bank_set(body=body, admin_id=ADMIN_ID)
    assert exc.value.detail["code"] == "exam_module_required"


def test_create_writing_set_rejects_invalid_exam_module():
    with pytest.raises(Exception):
        QuestionBankCreateSetRequest(
            skill="writing",
            title="Bad",
            exam_module="foundation",  # type: ignore[arg-type]
        )


def test_create_listening_rejects_exam_module():
    body = QuestionBankCreateSetRequest(
        skill="listening",
        title="L set",
        exam_module="academic",
    )
    with pytest.raises(HTTPException) as exc:
        qb.create_question_bank_set(body=body, admin_id=ADMIN_ID)
    assert exc.value.detail["code"] == "exam_module_skill_mismatch"


def test_patch_writing_set_changes_exam_module():
    sb = MagicMock()
    chain = MagicMock()
    chain.select.return_value = chain
    chain.eq.return_value = chain
    chain.in_.return_value = chain
    chain.limit.return_value = chain
    chain.update.return_value = chain
    chain.execute.return_value = MagicMock(data=[])
    sb.table.return_value = chain

    with (
        patch(
            "app.admin.question_bank._load_set_skill",
            return_value=(
                {"id": str(SET_ID), "status": "draft", "exam_module": "academic"},
                "writing",
            ),
        ),
        patch("app.admin.question_bank.get_supabase", return_value=sb),
        patch("app.admin.question_bank._after_question_bank_mutation"),
        patch("app.admin.question_bank.log_admin_action"),
    ):
        res = qb.patch_question_bank_set(
            set_id=SET_ID,
            body=PatchQuestionBankSetRequest(exam_module="both"),
            admin_id=ADMIN_ID,
        )
    assert res.exam_module == "both"
    assert res.ok is True


def test_get_question_bank_set_returns_exam_module():
    sb = MagicMock()

    def table(name: str):
        m = MagicMock()
        m.select.return_value = m
        m.eq.return_value = m
        m.limit.return_value = m
        if name == "practice_sets":
            m.execute.return_value = MagicMock(
                data=[
                    {
                        "id": str(SET_ID),
                        "set_number": 1,
                        "title": "Academic W",
                        "difficulty": "medium",
                        "bank_id": BANK_ID,
                        "description": None,
                        "status": "draft",
                        "exam_module": "academic",
                        "practice_banks": {
                            "id": BANK_ID,
                            "bank_number": 5,
                            "title": "Custom",
                            "skill": "writing",
                        },
                    }
                ]
            )
        elif name == "practice_hubs":
            m.execute.return_value = MagicMock(
                data=[{"id": HUB_ID, "slug": "writing-custom-x"}]
            )
        elif name == "bank_sections":
            m.execute.return_value = MagicMock(data=[])
        else:
            m.execute.return_value = MagicMock(data=[], count=0)
        return m

    sb.table.side_effect = table
    with patch("app.admin.question_bank.get_supabase", return_value=sb):
        item = qb.get_question_bank_set(set_id=SET_ID)
    assert item.exam_module == "academic"
    assert item.skill == "writing"


# ---------------------------------------------------------------------------
# Question bank: task1_general create / load / validate / update
# ---------------------------------------------------------------------------


def test_save_bank_writing_task1_general():
    body = WritingBuilderSaveRequest(
        prompt=fixture_task1_general_letter_prompt(),
        question_type="task1_general",
        exam_module="general_training",
        image_url=None,
    )
    with (
        patch(
            "app.admin.question_bank._load_set_skill",
            return_value=(
                {
                    "id": str(SET_ID),
                    "status": "draft",
                    "exam_module": "academic",
                },
                "writing",
            ),
        ),
        patch(
            "app.admin.question_bank._upsert_section",
            return_value=SECTION_ID,
        ) as upsert,
        patch("app.admin.question_bank._replace_questions") as replace,
        patch("app.admin.question_bank.refresh_hub_submit_configs"),
        patch("app.admin.question_bank._after_question_bank_mutation"),
        patch("app.admin.question_bank.log_admin_action"),
        patch("app.admin.question_bank.get_supabase", return_value=MagicMock()),
    ):
        res = qb.save_bank_writing(
            set_id=SET_ID, part=1, body=body, admin_id=ADMIN_ID
        )
    assert res.ok is True
    assert res.question_type == "task1_general"
    assert res.image_url is None
    replace.assert_called_once()
    inserts = replace.call_args.kwargs["inserts"]
    assert inserts[0]["question_type"] == "task1_general"
    assert "chart" not in inserts[0]["options"]
    upsert.assert_called_once()


def test_save_bank_writing_rejects_academic_plus_task1_general():
    body = WritingBuilderSaveRequest(
        prompt=fixture_task1_general_letter_prompt(),
        question_type="task1_general",
    )
    with (
        patch(
            "app.admin.question_bank._load_set_skill",
            return_value=(
                {"id": str(SET_ID), "status": "draft", "exam_module": "academic"},
                "writing",
            ),
        ),
        patch("app.admin.question_bank.get_supabase", return_value=MagicMock()),
    ):
        with pytest.raises(HTTPException) as exc:
            qb.save_bank_writing(
                set_id=SET_ID, part=1, body=body, admin_id=ADMIN_ID
            )
    assert exc.value.detail["code"] == "writing_taxonomy_mismatch"


def test_save_bank_writing_rejects_gt_plus_task1_academic():
    body = WritingBuilderSaveRequest(
        prompt=fixture_task1_academic_prompt(),
        question_type="task1_academic",
    )
    with (
        patch(
            "app.admin.question_bank._load_set_skill",
            return_value=(
                {
                    "id": str(SET_ID),
                    "status": "draft",
                    "exam_module": "general_training",
                },
                "writing",
            ),
        ),
        patch("app.admin.question_bank.get_supabase", return_value=MagicMock()),
    ):
        with pytest.raises(HTTPException) as exc:
            qb.save_bank_writing(
                set_id=SET_ID, part=1, body=body, admin_id=ADMIN_ID
            )
    assert exc.value.detail["code"] == "writing_taxonomy_mismatch"


def test_save_bank_writing_task1_academic_with_both():
    body = WritingBuilderSaveRequest(
        prompt=fixture_task1_academic_prompt(),
        question_type="task1_academic",
        exam_module="both",
    )
    with (
        patch(
            "app.admin.question_bank._load_set_skill",
            return_value=(
                {"id": str(SET_ID), "status": "draft", "exam_module": None},
                "writing",
            ),
        ),
        patch("app.admin.question_bank._upsert_section", return_value=SECTION_ID),
        patch("app.admin.question_bank._replace_questions"),
        patch("app.admin.question_bank.refresh_hub_submit_configs"),
        patch("app.admin.question_bank._after_question_bank_mutation"),
        patch("app.admin.question_bank.log_admin_action"),
        patch("app.admin.question_bank.get_supabase", return_value=MagicMock()),
    ):
        res = qb.save_bank_writing(
            set_id=SET_ID, part=1, body=body, admin_id=ADMIN_ID
        )
    assert res.question_type == "task1_academic"


def test_save_bank_writing_task2_both():
    body = WritingBuilderSaveRequest(
        prompt=fixture_task2_both_prompt(),
        question_type="task2",
        exam_module="both",
    )
    with (
        patch(
            "app.admin.question_bank._load_set_skill",
            return_value=(
                {"id": str(SET_ID), "status": "draft", "exam_module": "both"},
                "writing",
            ),
        ),
        patch("app.admin.question_bank._upsert_section", return_value=SECTION_ID),
        patch("app.admin.question_bank._replace_questions") as replace,
        patch("app.admin.question_bank.refresh_hub_submit_configs"),
        patch("app.admin.question_bank._after_question_bank_mutation"),
        patch("app.admin.question_bank.log_admin_action"),
        patch("app.admin.question_bank.get_supabase", return_value=MagicMock()),
    ):
        res = qb.save_bank_writing(
            set_id=SET_ID, part=2, body=body, admin_id=ADMIN_ID
        )
    assert res.question_type == "task2"
    assert replace.call_args.kwargs["inserts"][0]["options"]["min_words"] == 250


def test_load_bank_writing_returns_task1_general():
    sb = MagicMock()

    def table(name: str):
        m = MagicMock()
        m.select.return_value = m
        m.eq.return_value = m
        m.order.return_value = m
        m.limit.return_value = m
        if name == "bank_sections":
            m.execute.return_value = MagicMock(
                data=[
                    {
                        "id": SECTION_ID,
                        "image_url": None,
                        "passage_text": fixture_task1_general_letter_prompt(),
                    }
                ]
            )
        else:
            m.execute.return_value = MagicMock(
                data=[
                    {
                        "id": "77777777-7777-4777-8777-777777777777",
                        "question_type": "task1_general",
                        "prompt": fixture_task1_general_letter_prompt(),
                        "options": {"min_words": 150},
                    }
                ]
            )
        return m

    sb.table.side_effect = table
    with (
        patch(
            "app.admin.question_bank._load_set_skill",
            return_value=({"id": str(SET_ID)}, "writing"),
        ),
        patch("app.admin.question_bank.get_supabase", return_value=sb),
    ):
        res = qb.load_bank_writing(set_id=SET_ID, part=1)
    assert res.question_type == "task1_general"
    assert res.image_url is None
    assert "letter" in res.prompt.lower() or "product" in res.prompt.lower()


# ---------------------------------------------------------------------------
# Publish validation
# ---------------------------------------------------------------------------


def test_publish_blockers_require_exam_module():
    blockers = writing_taxonomy_publish_blockers(
        exam_module=None,
        question_types=["task1_academic"],
        has_prompt=True,
    )
    assert any("exam_module" in b for b in blockers)


def test_publish_blockers_reject_mismatch():
    blockers = writing_taxonomy_publish_blockers(
        exam_module="academic",
        question_types=["task1_general"],
        has_prompt=True,
    )
    assert any("incompatible" in b for b in blockers)


def test_publish_blockers_accept_valid_academic():
    blockers = writing_taxonomy_publish_blockers(
        exam_module="academic",
        question_types=["task1_academic"],
        has_prompt=True,
    )
    assert blockers == []


def test_publish_blockers_accept_valid_gt():
    blockers = writing_taxonomy_publish_blockers(
        exam_module="general_training",
        question_types=["task1_general"],
        has_prompt=True,
    )
    assert blockers == []


def test_bank_publish_blockers_writing_taxonomy_integration():
    sb = MagicMock()

    def table(name: str):
        m = MagicMock()
        m.select.return_value = m
        m.eq.return_value = m
        m.in_.return_value = m
        m.order.return_value = m
        m.limit.return_value = m
        if name == "bank_sections":
            m.execute.return_value = MagicMock(
                data=[
                    {
                        "id": SECTION_ID,
                        "part": 1,
                        "audio_key": None,
                        "passage_text": fixture_task1_academic_prompt(),
                        "module": "writing",
                    }
                ]
            )
        elif name == "practice_sets":
            m.execute.return_value = MagicMock(
                data=[{"exam_module": "general_training"}]
            )
        else:
            m.execute.return_value = MagicMock(
                data=[
                    {
                        "id": "q1",
                        "section_id": SECTION_ID,
                        "prompt": fixture_task1_academic_prompt(),
                        "question_type": "task1_academic",
                        "passage_text": None,
                        "audio_url": None,
                        "correct_answer": None,
                        "options": {},
                    }
                ]
            )
        return m

    sb.table.side_effect = table
    with patch("app.admin.question_bank.get_supabase", return_value=sb):
        blockers = qb.bank_publish_blockers(set_id=SET_ID, skill="writing")
    assert any("incompatible" in b for b in blockers)


def test_bank_publish_blockers_writing_still_requires_prompt():
    sb = MagicMock()

    def table(name: str):
        m = MagicMock()
        m.select.return_value = m
        m.eq.return_value = m
        m.in_.return_value = m
        m.order.return_value = m
        m.limit.return_value = m
        if name == "practice_sets":
            m.execute.return_value = MagicMock(data=[{"exam_module": "academic"}])
        else:
            m.execute.return_value = MagicMock(data=[])
        return m

    sb.table.side_effect = table
    with patch("app.admin.question_bank.get_supabase", return_value=sb):
        blockers = qb.bank_publish_blockers(set_id=SET_ID, skill="writing")
    assert any("prompt" in b.lower() for b in blockers)
