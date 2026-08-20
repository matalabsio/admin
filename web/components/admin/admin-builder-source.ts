export type BuilderSkill = "listening" | "reading" | "writing" | "speaking";

export type BuilderSource =
  | { kind: "mock"; mockId: string }
  | { kind: "bank"; setId: string; skill: BuilderSkill };

export function builderBackHref(source: BuilderSource): string {
  if (source.kind === "mock") return `/admin/mocks/${source.mockId}`;
  return "/admin/question-bank";
}

export function builderPartHref(
  source: BuilderSource,
  module: BuilderSkill,
  part: number,
  opts?: { preview?: boolean },
): string {
  if (source.kind === "mock") {
    return `/admin/mocks/${source.mockId}/${module}/${part}`;
  }
  return builderBankHref(source.skill, source.setId, part, opts);
}

export function builderBankHref(
  skill: BuilderSkill,
  setId: string,
  part: number,
  opts?: { preview?: boolean },
): string {
  const base = `/admin/question-bank/${skill}/${setId}/${part}`;
  if (opts?.preview) {
    return `${base}?preview=1`;
  }
  return base;
}

export function builderModuleHref(
  source: BuilderSource,
  module: BuilderSkill,
): string {
  return builderPartHref(source, module, 1);
}

export function builderSourceId(source: BuilderSource): string {
  return source.kind === "mock" ? source.mockId : source.setId;
}
