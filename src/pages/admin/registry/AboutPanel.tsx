import type { CatalogEntry } from "./registry/types";
import { Row } from "./primitives";

export function AboutPanel({ meta }: { meta: CatalogEntry | null }) {
  if (!meta) {
    return (
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
        <p className="text-sm text-black dark:text-white m-0 mb-1">
          Not yet described
        </p>
        <p className="text-[11px] text-neutral-400 m-0">
          This capability's manifest doesn't implement{" "}
          <code>DescribesCapability</code>, so it has no family, industries or
          documented coupling. It works normally — it just won't appear in
          filtered discovery.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
        <Row
          label="Origin"
          value={
            meta.origin === "custom" ? "Custom (UI-created)" : "Manifest (code)"
          }
        />
        <Row
          label="Family"
          value={meta.family?.display_name ?? "Unclassified"}
        />
        <Row label="Tier" value={meta.tier} />
        <Row
          label="Interface"
          value={meta.has_frontend ? "Has a screen" : "Backend only"}
        />
        <Row
          label="Industries"
          value={
            meta.is_universal
              ? "Universal — offered to every industry"
              : meta.industries.map((i) => i.display_name).join(", ") || "—"
          }
        />
        {meta.tags.length > 0 && (
          <Row label="Tags" value={meta.tags.join(", ")} />
        )}
      </div>

      {meta.internal_uses.length > 0 && (
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
          <p className="text-xs font-semibold text-black dark:text-white m-0 mb-1">
            Uses internally
          </p>
          <p className="text-[11px] text-neutral-400 m-0 mb-3">
            Documented implementation coupling. Nothing here is enforced —
            enabling this capability does not require or enable the others.
          </p>
          <ul className="m-0 pl-4 space-y-1.5">
            {meta.internal_uses.map((u) => (
              <li key={u.feature_code} className="text-[11px] text-neutral-500">
                <span className="font-mono text-neutral-600 dark:text-neutral-300 break-all">
                  {u.feature_code}
                </span>
                {!u.optional && (
                  <span className="text-amber-600 font-semibold">
                    {" "}
                    (required by code)
                  </span>
                )}
                <br />
                {u.nature}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
