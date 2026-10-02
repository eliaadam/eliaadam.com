import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sdk } from "../../lib/sdk";
import type { SettingDefinition, SettingScope, SettingValue, ValueType } from "../../lib/sdk/domains/settings";
import { ApiError } from "../../lib/query/Api";
import { ValueInput } from "./ValueInput";

const cardClass = "rounded-lg border border-neutral-200 dark:border-neutral-800";
const labelClass = "text-xs font-medium text-neutral-500";
const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-black dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";
const primaryButtonClass =
  "rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";
const secondaryButtonClass =
  "rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-60 dark:text-neutral-400 dark:hover:bg-neutral-900";
const dangerButtonClass = "rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10";

function formatDateTime(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export function SettingsScopePanel({ scope, containerId }: { scope: SettingScope; containerId?: string }) {
  const queryClient = useQueryClient();

  const listCurrent = () => {
    if (scope === "platform") return sdk.settings.listPlatform();
    if (scope === "container") return sdk.settings.listContainer(containerId!);
    return sdk.settings.listMySettings();
  };
  const setAt = (key: string, value: unknown) => {
    if (scope === "platform") return sdk.settings.setPlatform(key, value);
    if (scope === "container") return sdk.settings.setContainer(containerId!, key, value);
    return sdk.settings.setMySetting(key, value);
  };
  const clearAt = (key: string) => {
    if (scope === "platform") return sdk.settings.clearPlatform(key);
    if (scope === "container") return sdk.settings.clearContainer(containerId!, key);
    return sdk.settings.clearMySetting(key);
  };
  const { data: definitions } = useQuery({ queryKey: ["settings-definitions"], queryFn: () => sdk.settings.listDefinitions() });
  const { data: current, isLoading } = useQuery({
    queryKey: ["settings-current", scope, containerId],
    queryFn: listCurrent,
    enabled: scope !== "container" || !!containerId,
  });

  const currentByKey = useMemo(() => {
    const map = new Map<string, SettingValue>();
    for (const s of current ?? []) if (!s.is_cleared) map.set(s.key, s);
    return map;
  }, [current]);

  const relevantDefinitions = useMemo(
    () => (definitions ?? []).filter((d) => d.allowed_scopes.includes(scope)),
    [definitions, scope],
  );
  const registeredKeys = useMemo(() => new Set(relevantDefinitions.map((d) => d.key)), [relevantDefinitions]);
  const adHocValues = useMemo(() => (current ?? []).filter((s) => !s.is_cleared && !registeredKeys.has(s.key)), [current, registeredKeys]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["settings-current", scope, containerId] });
  const save = useMutation({ mutationFn: ({ key, value }: { key: string; value: unknown }) => setAt(key, value), onSuccess: invalidate });
  const clear = useMutation({ mutationFn: (key: string) => clearAt(key), onSuccess: invalidate });

  const [drafts, setDrafts] = useState<Record<string, unknown>>({});
  const [openHistory, setOpenHistory] = useState<string | null>(null);

  if (scope === "container" && !containerId) {
    return <p className="text-sm text-neutral-500">Select a container first.</p>;
  }
  if (isLoading) return <p className="text-sm text-neutral-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Known settings</h2>
        {relevantDefinitions.length === 0 && <p className="mt-2 text-sm text-neutral-500">Nothing registered for this scope yet.</p>}
        <div className="mt-2 space-y-2">
          {relevantDefinitions.map((def) => {
            const existing = currentByKey.get(def.key);
            const hasDraft = def.key in drafts;
            const value = hasDraft ? drafts[def.key] : existing ? existing.value : def.default;
            const isSaving = save.isPending && save.variables?.key === def.key;
            const isClearing = clear.isPending && clear.variables === def.key;
            return (
              <div key={def.key} className={`${cardClass} p-3`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">{def.label}</div>
                    {def.description && <p className="text-xs text-neutral-500">{def.description}</p>}
                    <p className="mt-0.5 font-mono text-[11px] text-neutral-400">{def.key}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {existing ? (
                      <span className="text-[11px] text-neutral-400">
                        set {formatDateTime(existing.set_at)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-neutral-400">using default</span>
                    )}
                    {scope !== "actor" && (
                      <button type="button" className={secondaryButtonClass} onClick={() => setOpenHistory(openHistory === def.key ? null : def.key)}>
                        History
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex items-end gap-2">
                  <div className="flex-1">
                    <ValueInput valueType={def.value_type} choices={def.choices} value={value} onChange={(v) => setDrafts((d) => ({ ...d, [def.key]: v }))} />
                  </div>
                  <button
                    type="button" className={primaryButtonClass} disabled={!hasDraft || isSaving}
                    onClick={() => { save.mutate({ key: def.key, value: drafts[def.key] }); setDrafts((d) => { const { [def.key]: _, ...rest } = d; return rest; }); }}
                  >
                    {isSaving ? "Saving…" : "Save"}
                  </button>
                  {existing && (
                    <button type="button" className={dangerButtonClass} disabled={isClearing} onClick={() => clear.mutate(def.key)}>
                      {isClearing ? "Clearing…" : "Clear"}
                    </button>
                  )}
                </div>
                {openHistory === def.key && <HistoryList scope={scope} containerId={containerId} settingKey={def.key} />}
                {save.isError && save.variables?.key === def.key && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {save.error instanceof ApiError ? save.error.message : "Couldn't save."}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Other settings currently set</h2>
        {adHocValues.length === 0 && <p className="mt-2 text-sm text-neutral-500">None.</p>}
        <div className={`mt-2 ${cardClass}`}>
          {adHocValues.map((s) => (
            <div key={s.key} className="border-b border-neutral-100 p-3 last:border-0 dark:border-neutral-900">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs">{s.key}</p>
                  <p className="mt-0.5 truncate text-sm text-neutral-600 dark:text-neutral-400">{JSON.stringify(s.value)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {scope !== "actor" && (
                    <button type="button" className={secondaryButtonClass} onClick={() => setOpenHistory(openHistory === s.key ? null : s.key)}>
                      History
                    </button>
                  )}
                  <button type="button" className={dangerButtonClass} disabled={clear.isPending && clear.variables === s.key} onClick={() => clear.mutate(s.key)}>
                    Clear
                  </button>
                </div>
              </div>
              {openHistory === s.key && <HistoryList scope={scope} containerId={containerId} settingKey={s.key} />}
            </div>
          ))}
        </div>
      </section>

      <AdHocSetForm onSet={(key, value) => save.mutate({ key, value })} saving={save.isPending} error={save.isError && !relevantDefinitions.some((d) => d.key === save.variables?.key) ? save.error : null} />
    </div>
  );
}

function HistoryList({ scope, containerId, settingKey }: { scope: SettingScope; containerId?: string; settingKey: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["settings-history", scope, containerId, settingKey],
    queryFn: () => {
      if (scope === "platform") return sdk.settings.platformHistory(settingKey);
      if (scope === "container") return sdk.settings.containerHistory(containerId!, settingKey);
      return Promise.resolve([] as SettingValue[]);   // no /me/ history endpoint — see wiring notes
    },
  });
  return (
    <div className="mt-2 rounded-md bg-neutral-50 p-2 dark:bg-neutral-900">
      {isLoading && <p className="text-xs text-neutral-500">Loading…</p>}
      {data?.length === 0 && <p className="text-xs text-neutral-500">No history.</p>}
      {data?.map((s) => (
        <div key={s.id} className="flex items-center justify-between py-0.5 text-xs">
          <span className="font-mono text-neutral-500">rev {s.revision}{s.is_cleared ? " (cleared)" : ""}</span>
          <span className="truncate text-neutral-600 dark:text-neutral-400">{s.is_cleared ? "—" : JSON.stringify(s.value)}</span>
          <span className="text-neutral-400">{formatDateTime(s.set_at)}</span>
        </div>
      ))}
    </div>
  );
}

function AdHocSetForm({ onSet, saving, error }: { onSet: (key: string, value: unknown) => void; saving: boolean; error: unknown }) {
  const [key, setKey] = useState("");
  const [valueType, setValueType] = useState<ValueType>("string");
  const [value, setValue] = useState<unknown>("");

  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Set a new key</h2>
      <div className={`mt-2 ${cardClass} space-y-2 p-3`}>
        <div>
          <label className={labelClass}>Key</label>
          <input className={inputClass} value={key} onChange={(e) => setKey(e.target.value)} placeholder="core.payment.gateway.for.marketplace" />
        </div>
        <div>
          <label className={labelClass}>Type</label>
          <select className={inputClass} value={valueType} onChange={(e) => { setValueType(e.target.value as ValueType); setValue(e.target.value === "boolean" ? false : e.target.value === "number" ? 0 : ""); }}>
            {(["string", "number", "boolean", "json"] as ValueType[]).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Value</label>
          <ValueInput valueType={valueType} choices={null} value={value} onChange={setValue} />
        </div>
        <button type="button" className={primaryButtonClass} disabled={!key.trim() || saving} onClick={() => onSet(key.trim(), value)}>
          {saving ? "Setting…" : "Set"}
        </button>
        {error != null && <p className="text-xs text-red-600 dark:text-red-400">{error instanceof ApiError ? error.message : "Couldn't set that key."}</p>}
      </div>
    </section>
  );
}
