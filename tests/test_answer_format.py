"""Tests for admin answer format + choose-two expand (Phase 3)."""

from __future__ import annotations

from app.admin.answer_format import (
    expand_choose_two_rows,
    join_answers,
    parse_choose_two_letters,
    split_answers,
)


def test_join_split_slash_alts():
    joined = join_answers("colour", ["color", "Colour"])
    assert joined == "colour/color/Colour"
    primary, alts = split_answers(joined)
    assert primary == "colour"
    assert alts == ["color", "Colour"]


def test_parse_choose_two_letters():
    assert parse_choose_two_letters("A,B") == ["A", "B"]
    assert parse_choose_two_letters("A/B") == ["A", "B"]
    assert parse_choose_two_letters("AB") == []
    assert parse_choose_two_letters("A") == ["A"]


def test_expand_choose_two_rows():
    rows = expand_choose_two_rows(
        base={"prompt": "Pick two", "question_type": "mcq", "options": []},
        correct_answer="A,E",
    )
    assert len(rows) == 2
    assert rows[0]["correct_answer"] == "A"
    assert rows[1]["correct_answer"] == "E"
    assert all(r["question_type"] == "mcq" for r in rows)
