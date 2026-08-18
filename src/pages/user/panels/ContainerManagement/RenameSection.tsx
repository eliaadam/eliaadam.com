import Section from "./Section";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const API = import.meta.env.VITE_PLATFORM_API_URL ?? "http://127.0.0.1:8000";
import Msg from "./Msg";
async function api(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem("use_token");
  const res = await fetch(`${API}/api/hierarchy${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e: any = new Error(j.message ?? `HTTP ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return j.data ?? j;
}
export default function RenameSection({
  containerId,
}: {
  containerId: string;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const rename = useMutation({
    mutationFn: () =>
      api("PATCH", `/containers/${containerId}/name`, {
        display_name: name.trim(),
      }),
    onSuccess: () => {
      setMsg("Renamed.");
      setName("");
      qc.invalidateQueries({ queryKey: ["workspace", containerId] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  return (
    <Section
      title="Rename container"
      subtitle="Changes the display name everywhere it appears."
    >
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New name"
          className={inputClass}
        />
        <button
          onClick={() => name.trim() && rename.mutate()}
          disabled={rename.isPending || !name.trim()}
          className={primaryBtn}
        >
          Rename
        </button>
      </div>
      {msg && <Msg text={msg} />}
    </Section>
  );
}
/* ── shared ───────────────────────────────────────────────────────── */

const inputClass =
  "flex-1 px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white";
const primaryBtn =
  "px-3 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40";
