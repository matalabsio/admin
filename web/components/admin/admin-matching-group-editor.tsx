"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Plus, X } from "lucide-react";
import {
  assignMatchingLabel,
  nextMatchingLabel,
  normalizeMatchingLabel,
  relabelOptions,
  type MatchingGroupDraft,
  type MatchingLabelFormat,
} from "@/lib/matching-group";
import {
  adminBtnPrimary,
  adminBtnSecondary,
  adminInput,
  adminMutedLabel,
} from "@/components/admin/admin-ui";
import { cn } from "@/lib/utils";

type Props = {
  draft: MatchingGroupDraft;
  editing: boolean;
  onChange: (next: MatchingGroupDraft) => void;
  onSave: () => void;
  onCancel: () => void;
};

const ASSIGNED_SEP = "__";

function formatLabel(label: string, format: MatchingLabelFormat): string {
  return format === "roman" ? `${label.toLowerCase()}.` : label.toUpperCase();
}

function poolDragId(label: string, index: number): string {
  return `pool-${encodeURIComponent(label)}${ASSIGNED_SEP}${index}`;
}

function assignedDragId(slotId: string, label: string): string {
  return `assigned-${slotId}${ASSIGNED_SEP}${label}`;
}

function parseDragSource(
  id: string,
): { kind: "pool"; label: string } | { kind: "assigned"; slotId: string; label: string } | null {
  if (id.startsWith("pool-")) {
    const rest = id.slice(5);
    const sep = rest.lastIndexOf(ASSIGNED_SEP);
    const encoded = sep === -1 ? rest : rest.slice(0, sep);
    try {
      return { kind: "pool", label: decodeURIComponent(encoded) };
    } catch {
      return { kind: "pool", label: encoded };
    }
  }
  if (id.startsWith("assigned-")) {
    const rest = id.slice(9);
    const sep = rest.indexOf(ASSIGNED_SEP);
    if (sep === -1) return null;
    return {
      kind: "assigned",
      slotId: rest.slice(0, sep),
      label: rest.slice(sep + ASSIGNED_SEP.length),
    };
  }
  return null;
}

function parseDropTarget(id: string): string | null {
  return id.startsWith("slot-") ? id.slice(5) : null;
}

function PoolCard({
  dragId,
  label,
  text,
  format,
  used,
  pending,
  onTap,
}: {
  dragId: string;
  label: string;
  text: string;
  format: MatchingLabelFormat;
  used: boolean;
  pending: boolean;
  onTap: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    disabled: used,
    data: { kind: "pool", label },
  });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      disabled={used}
      onClick={onTap}
      {...(used ? {} : { ...listeners, ...attributes })}
      className={cn(
        "w-full rounded-[11px] border px-3 py-2.5 text-left text-sm leading-snug",
        used
          ? "cursor-not-allowed border-[#EAEEF3] bg-[#F8FAFC] text-[#94A3B8]"
          : "cursor-grab border-[#E4E9F0] bg-white text-navy active:cursor-grabbing",
        pending && "border-cyan bg-cyan-soft/50",
        isDragging && "opacity-40",
      )}
    >
      <span className="font-bold text-teal">{formatLabel(label, format)}</span>{" "}
      <span className={used ? "text-[#94A3B8]" : "text-[#28374E]"}>{text}</span>
    </button>
  );
}

function SlotDrop({
  slotId,
  empty,
  pending,
  placeholder,
  children,
  onTap,
}: {
  slotId: string;
  empty: boolean;
  pending: boolean;
  placeholder: string;
  children?: ReactNode;
  onTap: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${slotId}`,
    disabled: !empty,
    data: { slotId },
  });
  if (!empty) return <>{children}</>;
  return (
    <button
      type="button"
      ref={setNodeRef}
      onClick={onTap}
      className={cn(
        "flex min-h-[44px] w-full items-center rounded-[11px] border-2 border-dashed px-3 py-2 text-left text-[13px] text-[#94A3B8]",
        isOver || pending
          ? "border-cyan bg-cyan-soft/40 text-teal"
          : "border-[#D5DCE6] bg-white",
      )}
    >
      {pending ? "Tap to assign" : placeholder}
    </button>
  );
}

export function AdminMatchingGroupEditor({
  draft,
  editing,
  onChange,
  onSave,
  onCancel,
}: Props) {
  const format = draft.format;
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const [activeDrag, setActiveDrag] = useState<{ label: string; text: string } | null>(
    null,
  );

  const answers = useMemo(() => {
    const map: Record<string, string> = {};
    for (const slot of draft.slots) {
      map[slot.id] = slot.assignedLabel;
    }
    return map;
  }, [draft.slots]);

  const used = useMemo(() => {
    const set = new Set<string>();
    for (const slot of draft.slots) {
      const label = normalizeMatchingLabel(slot.assignedLabel, format);
      if (label) set.add(label);
    }
    return set;
  }, [draft.slots, format]);

  const optionByLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of draft.options) {
      map.set(normalizeMatchingLabel(o.label, format), o.text);
    }
    return map;
  }, [draft.options, format]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  );

  function applyAnswers(next: Record<string, string>) {
    onChange({
      ...draft,
      slots: draft.slots.map((s) => ({
        ...s,
        assignedLabel: next[s.id] ?? "",
      })),
    });
  }

  function tryAssign(targetId: string, label: string, sourceId?: string | null) {
    const result = assignMatchingLabel({
      answers,
      slotIds: draft.slots.map((s) => s.id),
      targetId,
      label,
      format,
      sourceId,
    });
    if (!result.ok) return false;
    applyAnswers(result.next);
    return true;
  }

  function handleDragStart(event: DragStartEvent) {
    const source = parseDragSource(String(event.active.id));
    if (!source) return;
    setActiveDrag({
      label: source.label,
      text: optionByLabel.get(normalizeMatchingLabel(source.label, format)) ?? "",
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null);
    const source = parseDragSource(String(event.active.id));
    const targetId = event.over ? parseDropTarget(String(event.over.id)) : null;
    if (!source || !targetId) return;
    tryAssign(
      targetId,
      source.label,
      source.kind === "assigned" ? source.slotId : null,
    );
  }

  const poolTitle =
    format === "roman" ? "List of headings" : "Options";
  const slotPlaceholder =
    format === "roman" ? "Drop heading here" : "Drop option here";

  return (
    <div className="mt-5 rounded-[18px] border-[1.5px] border-cyan/40 bg-cyan-soft/20 p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className={adminMutedLabel}>
          {editing ? "Editing matching group" : "New matching group"} · {draft.type}
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-semibold text-[#94A3B8] hover:text-navy"
        >
          Cancel
        </button>
      </div>

      <label className={cn(adminMutedLabel, "mb-2 block")}>Difficulty</label>
      <select
        value={draft.difficulty}
        onChange={(e) =>
          onChange({
            ...draft,
            difficulty: e.target.value as MatchingGroupDraft["difficulty"],
          })
        }
        className={cn(adminInput, "mt-0 mb-5 max-w-[200px]")}
      >
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>

      <label className={cn(adminMutedLabel, "mb-2 block")}>
        Instruction (optional)
      </label>
      <textarea
        placeholder="Choose the correct heading from the list…"
        value={draft.instruction}
        onChange={(e) => onChange({ ...draft, instruction: e.target.value })}
        rows={2}
        className={cn(adminInput, "mt-0 mb-5 resize-y")}
      />

      <div className="mb-2.5 flex items-center justify-between">
        <span className={adminMutedLabel}>{poolTitle} — edit cards, then drag</span>
        <button
          type="button"
          onClick={() =>
            onChange({
              ...draft,
              options: relabelOptions(
                [
                  ...draft.options,
                  {
                    id: `opt-${Date.now()}`,
                    label: nextMatchingLabel(format, draft.options.length),
                    text: "",
                  },
                ],
                format,
              ),
            })
          }
          className="text-xs font-semibold text-teal hover:text-cyan"
        >
          + Add option
        </button>
      </div>
      <div className="mb-5 flex flex-col gap-2">
        {draft.options.map((o, i) => (
          <div key={o.id} className="flex items-center gap-2.5">
            <span className="w-8 shrink-0 font-mono text-sm font-bold text-teal">
              {formatLabel(o.label, format)}
            </span>
            <input
              type="text"
              placeholder="Option / heading text…"
              value={o.text}
              onChange={(e) =>
                onChange({
                  ...draft,
                  options: draft.options.map((x) =>
                    x.id === o.id ? { ...x, text: e.target.value } : x,
                  ),
                })
              }
              className={cn(adminInput, "mt-0 flex-1")}
            />
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...draft,
                  options: relabelOptions(
                    draft.options.filter((x) => x.id !== o.id),
                    format,
                  ),
                  slots: draft.slots.map((s) =>
                    normalizeMatchingLabel(s.assignedLabel, format) ===
                    normalizeMatchingLabel(o.label, format)
                      ? { ...s, assignedLabel: "" }
                      : s,
                  ),
                })
              }
              className="px-1 text-red-500 hover:text-red-700"
              aria-label={`Remove option ${o.label}`}
            >
              <X className="size-4" />
            </button>
            <span className="sr-only">{i}</span>
          </div>
        ))}
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <p className={cn(adminMutedLabel, "mb-2")}>Drag cards onto slots</p>
        <div className="mb-5 rounded-[13px] border border-[#EAEEF3] bg-white p-3">
          <div className="flex flex-col gap-2">
            {draft.options.map((o, index) => {
              const label = normalizeMatchingLabel(o.label, format);
              return (
                <PoolCard
                  key={o.id}
                  dragId={poolDragId(label, index)}
                  label={label}
                  text={o.text || "(empty)"}
                  format={format}
                  used={used.has(label)}
                  pending={pendingLabel === label}
                  onTap={() => {
                    if (used.has(label)) return;
                    setPendingLabel((prev) => (prev === label ? null : label));
                  }}
                />
              );
            })}
          </div>
        </div>

        <div className="mb-2.5 flex items-center justify-between">
          <span className={adminMutedLabel}>Question slots</span>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...draft,
                slots: [
                  ...draft.slots,
                  {
                    id: `slot-${Date.now()}`,
                    prompt: "",
                    assignedLabel: "",
                  },
                ],
              })
            }
            className="inline-flex items-center gap-1 text-xs font-semibold text-teal hover:text-cyan"
          >
            <Plus className="size-3.5" />
            Add slot
          </button>
        </div>
        <div className="mb-5 flex flex-col gap-3">
          {draft.slots.map((slot, i) => {
            const assigned = normalizeMatchingLabel(slot.assignedLabel, format);
            const assignedText = assigned ? optionByLabel.get(assigned) : "";
            return (
              <div
                key={slot.id}
                className="rounded-[13px] border border-[#EAEEF3] bg-white p-3"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="shrink-0 rounded-[7px] bg-cyan-soft px-2 py-1 font-mono text-xs font-semibold text-teal">
                    Q{i + 1}
                  </span>
                  <input
                    type="text"
                    placeholder="Paragraph C / sentence stem…"
                    value={slot.prompt}
                    onChange={(e) =>
                      onChange({
                        ...draft,
                        slots: draft.slots.map((s) =>
                          s.id === slot.id ? { ...s, prompt: e.target.value } : s,
                        ),
                      })
                    }
                    className={cn(adminInput, "mt-0 flex-1")}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...draft,
                        slots: draft.slots.filter((s) => s.id !== slot.id),
                      })
                    }
                    className="px-1 text-red-500 hover:text-red-700"
                    aria-label={`Remove slot ${i + 1}`}
                  >
                    <X className="size-4" />
                  </button>
                </div>
                {assigned ? (
                  <div className="flex items-start gap-2">
                    <AssignedChip
                      slotId={slot.id}
                      label={assigned}
                      text={assignedText || assigned}
                      format={format}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        applyAnswers({ ...answers, [slot.id]: "" });
                        setPendingLabel(null);
                      }}
                      className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-[#CDD7E2] text-[#94A3B8]"
                      aria-label={`Clear slot ${i + 1}`}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <SlotDrop
                    slotId={slot.id}
                    empty
                    pending={Boolean(pendingLabel)}
                    placeholder={slotPlaceholder}
                    onTap={() => {
                      if (!pendingLabel) return;
                      if (tryAssign(slot.id, pendingLabel)) setPendingLabel(null);
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        <DragOverlay dropAnimation={null} zIndex={60}>
          {activeDrag ? (
            <div className="max-w-[min(90vw,20rem)] rounded-[11px] border border-cyan bg-white px-3 py-2 text-sm shadow-lg">
              <span className="font-bold text-teal">
                {formatLabel(activeDrag.label, format)}
              </span>{" "}
              {activeDrag.text}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {pendingLabel ? (
        <p className="mb-4 text-[13px] text-[#5A6B82]">
          Selected {formatLabel(pendingLabel, format)} — tap an empty slot to assign.
        </p>
      ) : null}

      <div className="flex gap-2.5">
        <button type="button" onClick={onSave} className={adminBtnPrimary}>
          {editing ? "Save group" : "Save matching group"}
        </button>
        <button type="button" onClick={onCancel} className={adminBtnSecondary}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function AssignedChip({
  slotId,
  label,
  text,
  format,
}: {
  slotId: string;
  label: string;
  text: string;
  format: MatchingLabelFormat;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: assignedDragId(slotId, label),
    data: { kind: "assigned", slotId, label },
  });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "flex min-h-[44px] min-w-0 flex-1 cursor-grab items-start gap-2 rounded-[11px] border border-[#E4E9F0] bg-white px-3 py-2 text-sm active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <span className="shrink-0 font-bold text-teal">{formatLabel(label, format)}</span>
      <span className="min-w-0 flex-1 break-words text-[#5A6B82]">{text}</span>
    </div>
  );
}
