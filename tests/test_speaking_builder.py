"""Unit tests for speaking builder option shaping / publish blockers."""

from __future__ import annotations

from app.admin.mocks import ModuleSectionStatus, SectionStatus, _publish_blockers
from app.admin.schemas import SpeakingBuilderQuestionIn
from app.admin.speaking_builder import _build_options, _default_kind


def test_build_options_part2_includes_video_and_prep():
    q = SpeakingBuilderQuestionIn(
        prompt="Describe a skill…",
        speak_time_sec=15,
        min_skip_sec=5,
        prep_sec=60,
        record_sec=120,
        video_url="speaking/mock/part-2/abc.mp4",
    )
    opts = _build_options(part=2, q=q)
    assert opts["kind"] == "part2_intro"
    assert opts["video_url"] == "speaking/mock/part-2/abc.mp4"
    assert opts["prep_sec"] == 60
    assert opts["record_sec"] == 120
    assert opts["speak_time_sec"] == 15


def test_build_options_clamps_min_skip():
    q = SpeakingBuilderQuestionIn(
        prompt="Hello?",
        speak_time_sec=10,
        min_skip_sec=30,
        video_url=None,
    )
    opts = _build_options(part=1, q=q)
    assert opts["kind"] == "question"
    assert opts["min_skip_sec"] == 10
    assert opts["video_url"] is None


def test_publish_blockers_require_speaking_when_enabled():
    section_status = [
        ModuleSectionStatus(
            module="listening",
            sections=[SectionStatus(part=1, question_count=1, has_audio=True)],
        ),
        ModuleSectionStatus(
            module="reading",
            sections=[SectionStatus(part=1, question_count=1, has_audio=False)],
        ),
        ModuleSectionStatus(
            module="speaking",
            sections=[
                SectionStatus(part=1, question_count=1, has_audio=False),
                SectionStatus(part=2, question_count=1, has_audio=False),
                SectionStatus(part=3, question_count=0, has_audio=False),
            ],
        ),
    ]
    blockers = _publish_blockers(
        section_status=section_status,
        enabled_modules={"listening", "reading", "speaking"},
    )
    assert any("Speaking Part 2" in b and "video" in b for b in blockers)
    assert any("Speaking Part 3" in b for b in blockers)


def test_default_kind():
    assert _default_kind(1) == "question"
    assert _default_kind(2) == "part2_intro"
    assert _default_kind(3) == "question"
