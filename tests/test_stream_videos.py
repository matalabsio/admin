"""Unit tests for Stream placement tags and hub video replace-one."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from app.admin.stream_videos import (
    assert_valid_tag,
    skill_hub_videos_entry,
    videos_for_skill,
)
from app.practice.schemas import PracticeVideo
from app.storage.stream import (
    StreamError,
    normalize_customer_code,
    parse_stream_uid,
    playback_iframe_url,
)


def test_normalize_customer_code_strips_domain():
    assert normalize_customer_code("customer-wuneb9oc6rarkn8k") == "customer-wuneb9oc6rarkn8k"
    assert (
        normalize_customer_code("customer-wuneb9oc6rarkn8k.cloudflarestream.com")
        == "customer-wuneb9oc6rarkn8k"
    )
    assert (
        normalize_customer_code("https://customer-abc.cloudflarestream.com/")
        == "customer-abc"
    )


def test_parse_stream_uid_accepts_raw_and_urls():
    uid = "479d46fb3847e47b3a569d6a9ae05586"
    assert parse_stream_uid(uid) == uid
    assert (
        parse_stream_uid(
            f"https://customer-v3lxo54ja5bjxf7e.cloudflarestream.com/{uid}/iframe"
        )
        == uid
    )
    assert parse_stream_uid(f"https://watch.cloudflarestream.com/{uid}") == uid
    with pytest.raises(StreamError):
        parse_stream_uid("")
    with pytest.raises(StreamError):
        parse_stream_uid("https://example.com/video.mp4")


def test_playback_iframe_url():
    url = playback_iframe_url(
        customer_code="customer-wuneb9oc6rarkn8k.cloudflarestream.com",
        stream_uid="ea95132c15732412d22c1476fa83f27a",
    )
    assert url == (
        "https://customer-wuneb9oc6rarkn8k.cloudflarestream.com/"
        "ea95132c15732412d22c1476fa83f27a/iframe"
    )


def test_assert_valid_tag_rejects_unknown():
    with pytest.raises(HTTPException) as exc:
        assert_valid_tag("random-intro")
    assert exc.value.status_code == 400


def test_assert_valid_tag_accepts_hero_intro():
    assert assert_valid_tag("hero-intro") == "hero-intro"


def test_skill_hub_videos_entry_is_exactly_one():
    out = skill_hub_videos_entry(
        title="Listening intro",
        url="https://customer-x.cloudflarestream.com/abc/iframe",
        duration_min=12,
        tag="listening-intro",
        stream_uid="abc",
    )
    assert len(out) == 1
    assert out[0]["stream_uid"] == "abc"
    assert out[0]["tag"] == "listening-intro"
    assert out[0]["url"].endswith("/iframe")
    assert out[0]["duration_min"] == 12


def test_videos_for_skill_empty_when_missing():
    sb = MagicMock()
    chain = MagicMock()
    chain.select.return_value = chain
    chain.eq.return_value = chain
    chain.limit.return_value = chain
    chain.execute.return_value = MagicMock(data=[])
    sb.table.return_value = chain
    with patch("app.admin.stream_videos.get_supabase", return_value=sb):
        assert videos_for_skill("listening") == []


def test_videos_for_skill_returns_single_entry():
    sb = MagicMock()
    chain = MagicMock()
    chain.select.return_value = chain
    chain.eq.return_value = chain
    chain.limit.return_value = chain
    chain.execute.return_value = MagicMock(
        data=[
            {
                "tag": "listening-intro",
                "title": "Listening intro",
                "stream_uid": "abc",
                "playback_url": "https://customer-x.cloudflarestream.com/abc/iframe",
                "duration_min": 12,
            }
        ]
    )
    sb.table.return_value = chain
    with patch("app.admin.stream_videos.get_supabase", return_value=sb):
        out = videos_for_skill("listening")
    assert len(out) == 1
    assert out[0]["stream_uid"] == "abc"
    assert out[0]["tag"] == "listening-intro"


def test_videos_for_skill_rejects_unknown_skill():
    assert videos_for_skill("math") == []


def test_practice_video_accepts_stream_fields():
    video = PracticeVideo(
        title="Reading intro",
        url="https://customer-x.cloudflarestream.com/uid/iframe",
        duration_min=10,
        tag="reading-intro",
        stream_uid="uid",
    )
    assert video.tag == "reading-intro"
    legacy = PracticeVideo(title="Old", url="", duration_min=8)
    assert legacy.tag is None


def test_status_from_video_maps_stream_states():
    from app.admin.stream_videos import _status_from_video

    assert _status_from_video(None) == "processing"
    assert _status_from_video({"status": {"state": "inprogress"}}) == "processing"
    assert _status_from_video({"status": {"state": "ready"}}) == "ready"
    assert _status_from_video({"status": {"state": "complete"}}) == "ready"
    assert _status_from_video({"status": {"state": "error"}}) == "error"


def test_list_stream_library_merges_assigned_tag():
    from app.admin import stream_videos as sv

    remote = [
        {
            "uid": "aaa111aaa111aaa111aaa111aaa111aa",
            "meta": {"name": "listening-intro-720p.mp4"},
            "duration": 361,
            "status": {"state": "ready"},
            "thumbnail": "https://example.com/a.jpg",
            "requireSignedURLs": True,
            "created": "2026-08-12T00:00:00Z",
        },
        {
            "uid": "bbb222bbb222bbb222bbb222bbb222bb",
            "meta": {"name": "IELTS intro"},
            "duration": 324,
            "status": {"state": "ready"},
            "requireSignedURLs": False,
        },
    ]
    with (
        patch.object(sv, "list_account_videos", return_value=remote),
        patch.object(
            sv,
            "list_stream_videos",
            return_value=[{"stream_uid": "bbb222bbb222bbb222bbb222bbb222bb", "tag": "ielts-intro"}],
        ),
    ):
        out = sv.list_stream_library()
    assert len(out) == 2
    by_uid = {row["uid"]: row for row in out}
    assert by_uid["aaa111aaa111aaa111aaa111aaa111aa"]["assigned_tag"] is None
    assert by_uid["aaa111aaa111aaa111aaa111aaa111aa"]["name"] == "listening-intro-720p.mp4"
    assert by_uid["bbb222bbb222bbb222bbb222bbb222bb"]["assigned_tag"] == "ielts-intro"


def test_delete_video_treats_404_as_success():
    from app.storage import stream as stream_mod

    fake = MagicMock()
    fake.status_code = 404
    fake.json.return_value = {"success": False, "errors": [{"message": "not found"}]}
    fake_client = MagicMock()
    fake_client.__enter__.return_value.delete.return_value = fake
    fake_client.__exit__.return_value = False
    with (
        patch.object(stream_mod, "_credentials", return_value=("acct", "token")),
        patch.object(stream_mod.httpx, "Client", return_value=fake_client),
    ):
        stream_mod.delete_video("479d46fb3847e47b3a569d6a9ae05586")


def test_delete_stream_library_video_unassigns_and_clears_hubs():
    from app.admin import stream_videos as sv

    chain = MagicMock()
    chain.select.return_value = chain
    chain.delete.return_value = chain
    chain.eq.return_value = chain
    chain.execute.side_effect = [
        MagicMock(data=[{"tag": "listening-intro"}]),
        MagicMock(data=[]),
    ]
    sb = MagicMock()
    sb.table.return_value = chain

    with (
        patch.object(sv, "delete_video") as delete_remote,
        patch.object(sv, "_clear_skill_hubs", return_value=2) as clear_hubs,
        patch.object(sv, "log_admin_action"),
        patch("app.admin.stream_videos.get_supabase", return_value=sb),
    ):
        out = sv.delete_stream_library_video(
            stream_uid="479d46fb3847e47b3a569d6a9ae05586",
            admin_id="admin-1",
        )
    delete_remote.assert_called_once_with("479d46fb3847e47b3a569d6a9ae05586")
    clear_hubs.assert_called_once_with("listening-intro")
    assert out["ok"] is True
    assert out["unassigned_tag"] == "listening-intro"
    assert out["hubs_updated"] == 2


def test_create_direct_upload_maps_quota_error():
    from app.storage import stream as stream_mod

    payload = {
        "success": False,
        "errors": [{"code": 10011, "message": "Storage capacity exceeded"}],
        "messages": [{"code": 10011, "message": "allocated 0 minutes"}],
    }
    fake = MagicMock()
    fake.status_code = 403
    fake.json.return_value = payload
    fake_client = MagicMock()
    fake_client.__enter__.return_value.post.return_value = fake
    fake_client.__exit__.return_value = False
    with (
        patch.object(stream_mod, "_credentials", return_value=("acct", "token")),
        patch.object(stream_mod.httpx, "Client", return_value=fake_client),
        pytest.raises(StreamError) as exc,
    ):
        stream_mod.create_direct_upload(title="Intro")
    assert exc.value.status_code == 409
    assert "Stream plan" in str(exc.value)
