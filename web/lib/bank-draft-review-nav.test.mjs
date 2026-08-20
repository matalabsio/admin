import assert from "node:assert/strict";
import test from "node:test";

function computeDraftReviewNav(items, setId) {
  const index = items.findIndex((item) => item.set_id === setId);
  if (index < 0 || items.length === 0) {
    return {
      positionLabel: null,
      prevHref: null,
      nextHref: null,
      index: -1,
      total: items.length,
    };
  }
  const current = items[index];
  const prev = index > 0 ? items[index - 1] : null;
  const next = index < items.length - 1 ? items[index + 1] : null;
  const href = (item) =>
    `/admin/question-bank/${item.skill}/${item.set_id}/1?preview=1`;
  return {
    positionLabel: `Draft ${index + 1}/${items.length} · ${current.title}`,
    prevHref: prev ? href(prev) : null,
    nextHref: next ? href(next) : null,
    index,
    total: items.length,
  };
}

test("computeDraftReviewNav returns prev/next hrefs with preview query", () => {
  const items = [
    {
      set_id: "c3000000-0000-4000-8000-000000000001",
      skill: "listening",
      title: "MT3_LT_S1",
      set_number: 5,
      bank_number: 5,
      status: "draft",
      hub_id: null,
    },
    {
      set_id: "c3000000-0000-4000-8000-000000000002",
      skill: "listening",
      title: "MT3_LT_S2",
      set_number: 6,
      bank_number: 5,
      status: "draft",
      hub_id: null,
    },
  ];

  const middle = computeDraftReviewNav(items, items[1].set_id);
  assert.equal(middle.index, 1);
  assert.equal(middle.total, 2);
  assert.ok(middle.prevHref?.includes(items[0].set_id));
  assert.match(middle.prevHref ?? "", /preview=1$/);
  assert.equal(middle.nextHref, null);

  const first = computeDraftReviewNav(items, items[0].set_id);
  assert.equal(first.prevHref, null);
  assert.ok(first.nextHref?.includes(items[1].set_id));
});
