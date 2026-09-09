import { useState } from "react";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ChevronRight, Layers, Trash2 } from "lucide-react";
import { sdk } from "../../lib/sdk";

const selectClass =
  "rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs outline-none dark:border-neutral-700 dark:bg-neutral-900";

/**
 * Recursive, INTERACTIVE composition-graph editor — add or remove a
 * child at ANY node, at any depth, in one continuous flow.
 *
 * FIX: this used to be read-only (a preview), and the only place you
 * could add a child at all was a flat, one-level form on the
 * top-level template being edited (`TemplateEditor.tsx`'s old
 * "Sub-hierarchy" section). Going deeper meant leaving the page,
 * reselecting the child from the top-level template picker, and
 * repeating the whole flow separately for each level — the backend
 * itself has NO depth restriction on the composition graph at all
 * (`addChild(parentCode, ...)` already accepts any parent code); the
 * limitation was purely this component being read-only below depth 0.
 * `TemplateEditor.tsx`'s old flat add/remove form is gone — this tree
 * (rendered starting at the template being edited, depth 0) is now
 * the ONE place both add and remove happen, at every level.
 *
 * The backend only detects a CYCLE at instantiation time (see
 * `TemplateInstantiationService`'s own docstring — the graph itself
 * isn't forbidden from describing one, only walking one is rejected).
 * This still needs the same guard client-side, or a cyclic graph
 * would recurse forever in the browser — `visitedCodes` tracks the
 * path from the root down, same "visited set per recursive branch"
 * approach the backend uses.
 */
export function TemplateTree({
  templateCode,
  depth = 0,
  visitedCodes = [],
}: {
  templateCode: string;
  depth?: number;
  visitedCodes?: string[];
}) {
  const isCycle = visitedCodes.includes(templateCode);
  const queryClient = useQueryClient();
  const [showAddChild, setShowAddChild] = useState(false);
  const [newChildCode, setNewChildCode] = useState("");

  const { data: thisTemplate } = useQuery({
    queryKey: ["admin", "template", templateCode],
    queryFn: () => sdk.provisioning.getTemplate(templateCode),
  });

  const { data: children, isLoading } = useQuery({
    queryKey: ["admin", "template-children", templateCode],
    queryFn: () => sdk.provisioning.listChildren(templateCode),
    enabled: !isCycle,
  });

  const { candidates, isLoading: candidatesLoading } =
    useCandidateChildTemplates(
      templateCode,
      thisTemplate?.container_kind_code ?? null,
    );

  const invalidateHere = () => {
    queryClient.invalidateQueries({
      queryKey: ["admin", "template-children", templateCode],
    });
    // Broader invalidation too — adding/removing a child anywhere can
    // change which templates are "leaf" (childless) and therefore
    // eligible as a candidate ELSEWHERE in the tree, not just here.
    queryClient.invalidateQueries({
      queryKey: ["admin", "template-children"],
    });
  };

  const addChildMutation = useMutation({
    mutationFn: () =>
      sdk.provisioning.addChild(templateCode, {
        child_template_code: newChildCode,
      }),
    onSuccess: () => {
      invalidateHere();
      setNewChildCode("");
      setShowAddChild(false);
    },
  });

  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-1 text-sm"
        style={{ paddingLeft: `${depth * 1.25}rem` }}
      >
        {depth > 0 && (
          <ChevronRight size={13} className="flex-none text-neutral-400" />
        )}
        <Layers size={13} className="flex-none text-neutral-400" />
        <span className="font-medium">{templateCode}</span>
        {isCycle && (
          <span className="text-xs text-red-600 dark:text-red-400">
            circular reference — stops here
          </span>
        )}
        {!isCycle && (
          <button
            type="button"
            onClick={() => setShowAddChild((v) => !v)}
            className="ml-1 text-xs text-neutral-400 transition-colors hover:text-black dark:hover:text-white"
          >
            {showAddChild ? "cancel" : "+ add child"}
          </button>
        )}
      </div>

      {showAddChild && !isCycle && (
        <div
          className="flex flex-wrap items-center gap-2 py-1"
          style={{ paddingLeft: `${(depth + 1) * 1.25}rem` }}
        >
          <select
            className={selectClass}
            value={newChildCode}
            onChange={(e) => setNewChildCode(e.target.value)}
            disabled={candidatesLoading}
          >
            <option value="">
              {candidatesLoading
                ? "Checking eligible templates…"
                : "Choose a template…"}
            </option>
            {candidates.map((t) => (
              <option key={t.code} value={t.code}>
                {t.name} ({t.code})
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!newChildCode || addChildMutation.isPending}
            onClick={() => addChildMutation.mutate()}
            className="rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
          >
            Add
          </button>
          {!candidatesLoading && candidates.length === 0 && (
            <span className="text-xs text-neutral-500 dark:text-neutral-500">
              No eligible leaf templates of a different kind exist yet — create
              one in Step 2 first.
            </span>
          )}
          {addChildMutation.isError && (
            <span className="w-full text-xs text-red-600 dark:text-red-400">
              Couldn't add — check it isn't already a child here.
            </span>
          )}
        </div>
      )}

      {!isCycle && (
        <div>
          {isLoading && (
            <p
              className="text-xs text-neutral-500 dark:text-neutral-500"
              style={{ paddingLeft: `${(depth + 1) * 1.25}rem` }}
            >
              Loading…
            </p>
          )}
          {children?.map((edge) => (
            <TemplateChildResolved
              key={edge.id}
              edgeId={edge.id}
              parentCode={templateCode}
              childTemplateId={edge.child_template_id}
              nameOverride={edge.name_override}
              depth={depth + 1}
              visitedCodes={[...visitedCodes, templateCode]}
              onRemoved={invalidateHere}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Every template of a different kind than `excludeKindCode`, that
 * isn't `excludeCode` itself, and has NO children of its own — the
 * same "leaf-only, different kind" guardrail as before, now shared by
 * every node in the tree instead of computed once at the root. */
function useCandidateChildTemplates(
  excludeCode: string,
  excludeKindCode: string | null,
) {
  const { data: allTemplates } = useQuery({
    queryKey: ["admin", "templates"],
    queryFn: () => sdk.provisioning.listTemplates(),
  });

  const base = (allTemplates ?? []).filter(
    (t) => t.code !== excludeCode && t.container_kind_code !== excludeKindCode,
  );

  const childrenQueries = useQueries({
    queries: base.map((t) => ({
      queryKey: ["admin", "template-children", t.code],
      queryFn: () => sdk.provisioning.listChildren(t.code),
    })),
  });

  const candidates = base.filter((_, i) => {
    const result = childrenQueries[i];
    return result.isSuccess && result.data.length === 0;
  });
  // Still resolving `thisTemplate`'s own kind (excludeKindCode is
  // null until then) counts as loading too — otherwise candidates
  // would briefly compute against the wrong (missing) kind filter.
  const isLoading =
    excludeKindCode === null || childrenQueries.some((q) => q.isLoading);

  return { candidates, isLoading };
}

/** Edges store the child's internal id, not its code — resolve it via
 * `listTemplates()` (cached by react-query, so this doesn't re-fetch
 * per node) before recursing into `TemplateTree` by code. */
function TemplateChildResolved({
  edgeId,
  parentCode,
  childTemplateId,
  nameOverride,
  depth,
  visitedCodes,
  onRemoved,
}: {
  edgeId: string;
  parentCode: string;
  childTemplateId: string;
  nameOverride: string | null;
  depth: number;
  visitedCodes: string[];
  onRemoved: () => void;
}) {
  const { data: allTemplates } = useQuery({
    queryKey: ["admin", "templates"],
    queryFn: () => sdk.provisioning.listTemplates(),
  });

  const removeMutation = useMutation({
    mutationFn: () => sdk.provisioning.removeChild(parentCode, edgeId),
    onSuccess: onRemoved,
  });

  const child = allTemplates?.find((t) => t.id === childTemplateId);
  if (!child) {
    return (
      <p
        className="text-xs text-neutral-500 dark:text-neutral-500"
        style={{ paddingLeft: `${depth * 1.25}rem` }}
      >
        (unresolved child)
      </p>
    );
  }

  return (
    <div>
      <div
        className="flex items-center gap-2"
        style={{ paddingLeft: `${depth * 1.25}rem` }}
      >
        {nameOverride && (
          <p className="text-xs italic text-neutral-500 dark:text-neutral-500">
            shown as "{nameOverride}"
          </p>
        )}
        <button
          type="button"
          onClick={() => removeMutation.mutate()}
          disabled={removeMutation.isPending}
          aria-label={`Remove ${child.code}`}
          className="text-neutral-400 transition-colors hover:text-red-600 disabled:opacity-60 dark:hover:text-red-400"
        >
          <Trash2 size={12} />
        </button>
      </div>
      <TemplateTree
        templateCode={child.code}
        depth={depth}
        visitedCodes={visitedCodes}
      />
    </div>
  );
}
