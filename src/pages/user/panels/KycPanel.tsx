import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../hooks/useAuth";
import {
  DocumentUpload,
  type UploadedDoc,
} from "../../../components/DocumentUpload";

/*
 * KYC panel — feature `kyc`. The submit form is SUBJECT-TYPE AWARE:
 *
 *   Individual → NIDA (national ID)
 *   Business   → TIN + BRELA + business license
 *   Both       → all of the above (e.g. a sole proprietor)
 *
 * Each identity field explains what it's for, so a user who only has a NIDA
 * isn't confused by BRELA. None are hard-required except legal name — a user
 * provides whatever they actually have.
 *
 * Supporting DOCUMENTS upload to the Documents domain inline (next to the field
 * they support); the returned document_ids are submitted with the KYC record.
 *
 * The admin REVIEW side is NOT here — it lives in the admin console
 * (Admin → KYC Review), because reviewing across all tenants is a platform-
 * operator act, not a container-member one.
 */

const API = import.meta.env.VITE_PLATFORM_API_URL ?? "http://127.0.0.1:8000";

async function api(method: string, path: string, body?: unknown) {
  const token = localStorage.getItem("sindano_token");
  const res = await fetch(`${API}/api/kyc${path}`, {
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

type KycRecord = {
  id: string;
  actor_id: string;
  status: string;
  legal_name?: string;
  nida_id?: string;
  tin_number?: string;
  brela_number?: string;
  business_license?: string;
  created_at: string;
};

type SubjectType = "individual" | "business" | "both";

export default function KycPanel({
  containerId,
  permissions,
  actorId: actorIdProp,
}: {
  containerId: string;
  permissions: string[];
  actorId?: string;
}) {
  const { actor } = useAuth();
  const actorId = actorIdProp ?? actor?.id;
  const can = (p: string) => permissions.includes(`kyc.${p}`);

  if (!actorId) {
    return <p className="text-sm text-neutral-400">Loading your account…</p>;
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {can("record.submit") && (
        <SubmitKyc containerId={containerId} actorId={actorId} />
      )}
      {can("record.view") && (
        <MyRecords containerId={containerId} actorId={actorId} />
      )}
      {!can("record.submit") && !can("record.view") && (
        <p className="text-sm text-neutral-400">
          You don't have access to KYC here.
        </p>
      )}
    </div>
  );
}

/* ── SUBMIT (guided, subject-type aware) ──────────────────────────── */

function SubmitKyc({
  containerId,
  actorId,
}: {
  containerId: string;
  actorId: string;
}) {
  const qc = useQueryClient();
  const [subjectType, setSubjectType] = useState<SubjectType>("individual");
  const [f, setF] = useState({
    legal_name: "",
    nida_id: "",
    tin_number: "",
    brela_number: "",
    business_license: "",
    dob: "",
    nationality: "TZ",
    address: "",
    city: "",
    gender: "",
  });
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const addDoc = (d: UploadedDoc) =>
    setDocs((prev) => [...prev.filter((x) => x.typeName !== d.typeName), d]);

  const showIndividual = subjectType === "individual" || subjectType === "both";
  const showBusiness = subjectType === "business" || subjectType === "both";

  const submit = useMutation({
    mutationFn: async () => {
      const rec = await api("POST", `/containers/${containerId}/records`, {
        subject_actor_id: actorId,
        legal_name: f.legal_name.trim(),
        nida_id: showIndividual ? f.nida_id.trim() || undefined : undefined,
        tin_number: showBusiness ? f.tin_number.trim() || undefined : undefined,
        brela_number: showBusiness
          ? f.brela_number.trim() || undefined
          : undefined,
        business_license: showBusiness
          ? f.business_license.trim() || undefined
          : undefined,
        document_ids: docs.map((d) => d.id),
        metadata: {
          subject_type: subjectType,
          dob: f.dob,
          nationality: f.nationality,
          address: f.address.trim(),
          city: f.city.trim(),
          gender: f.gender,
        },
      });
      return api("POST", `/containers/${containerId}/records/${rec.id}/submit`);
    },
    onSuccess: () => {
      setMsg("KYC submitted for review.");
      qc.invalidateQueries({ queryKey: ["kyc"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const valid = f.legal_name.trim().length > 0;

  const field = (
    k: keyof typeof f,
    label: string,
    hint: string,
    opts?: { type?: string },
  ) => (
    <div>
      <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300 block mb-0.5">
        {label}
      </label>
      <input
        type={opts?.type ?? "text"}
        value={f[k]}
        onChange={(e) => set(k, e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-black dark:text-white"
      />
      <p className="text-[10px] text-neutral-400 mt-0.5 m-0">{hint}</p>
    </div>
  );

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
      <p className="text-sm font-semibold text-black dark:text-white m-0 mb-1">
        Submit KYC
      </p>
      <p className="text-[11px] text-neutral-400 m-0 mb-3">
        Provide whatever identity documents you have. You don't need all of them
        — an individual usually has a NIDA; a business has TIN, BRELA and a
        licence. Required before virtual cards can be issued.
      </p>

      {/* subject type toggle */}
      <div className="mb-4">
        <label className="text-[11px] font-medium text-neutral-600 dark:text-neutral-300 block mb-1">
          What are you verifying?
        </label>
        <div className="inline-flex rounded-md border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          {(
            [
              ["individual", "An individual"],
              ["business", "A business"],
              ["both", "Both"],
            ] as [SubjectType, string][]
          ).map(([val, lbl]) => (
            <button
              key={val}
              onClick={() => setSubjectType(val)}
              className={`px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                subjectType === val
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "bg-white dark:bg-neutral-950 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-neutral-400 mt-1 m-0">
          {subjectType === "individual" &&
            "You'll provide your national ID (NIDA)."}
          {subjectType === "business" &&
            "You'll provide the business's TIN, BRELA registration and licence."}
          {subjectType === "both" &&
            "You'll provide both personal and business identity — e.g. a sole proprietor."}
        </p>
      </div>

      {/* legal name — always */}
      <div className="mb-3">
        {field(
          "legal_name",
          "Legal name",
          subjectType === "business"
            ? "Registered business name."
            : "Full name as it appears on your ID.",
        )}
      </div>

      {/* individual identity */}
      {showIndividual && (
        <div className="mb-3 space-y-3">
          <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide m-0">
            Individual identity
          </p>
          {field(
            "nida_id",
            "NIDA number",
            "Your National Identification Authority number. Individuals only.",
          )}
          <DocumentUpload
            containerId={containerId}
            label="Upload NIDA document"
            defaultTitle="NIDA ID"
            suggestType="national"
            onUploaded={addDoc}
          />
          <div className="grid grid-cols-2 gap-2">
            {field(
              "dob",
              "Date of birth",
              "Needed for virtual card issuance.",
              { type: "date" },
            )}
            {field(
              "nationality",
              "Nationality",
              "Two-letter country code, e.g. TZ.",
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {field("gender", "Gender", "As on your ID.")}
            {field("city", "City", "Your city of residence.")}
          </div>
          {field(
            "address",
            "Address",
            "Residential address — needed for card issuance.",
          )}
        </div>
      )}

      {/* business identity */}
      {showBusiness && (
        <div className="mb-3 space-y-3">
          <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide m-0">
            Business identity
          </p>
          {field(
            "tin_number",
            "TIN",
            "Taxpayer Identification Number from TRA.",
          )}
          <DocumentUpload
            containerId={containerId}
            label="Upload TIN certificate"
            defaultTitle="TIN certificate"
            suggestType="tin"
            onUploaded={addDoc}
          />
          {field(
            "brela_number",
            "BRELA number",
            "Business registration number from BRELA.",
          )}
          <DocumentUpload
            containerId={containerId}
            label="Upload BRELA certificate"
            defaultTitle="BRELA registration"
            suggestType="registration"
            onUploaded={addDoc}
          />
          {field(
            "business_license",
            "Business licence",
            "Your trading/business licence number.",
          )}
          <DocumentUpload
            containerId={containerId}
            label="Upload business licence"
            defaultTitle="Business licence"
            suggestType="licen"
            onUploaded={addDoc}
          />
        </div>
      )}

      {docs.length > 0 && (
        <p className="text-[11px] text-neutral-500 m-0 mb-3">
          {docs.length} document{docs.length > 1 ? "s" : ""} attached:{" "}
          {docs.map((d) => d.typeName).join(", ")}
        </p>
      )}

      <button
        onClick={() => valid && submit.mutate()}
        disabled={!valid || submit.isPending}
        className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
      >
        {submit.isPending ? "Submitting…" : "Submit for review"}
      </button>
      {!valid && (
        <p className="text-[10px] text-amber-600 mt-1 m-0">
          Legal name is required.
        </p>
      )}
      {msg && <p className="text-[11px] text-neutral-500 mt-2 m-0">{msg}</p>}
    </div>
  );
}

/* ── MY RECORDS ───────────────────────────────────────────────────── */

function MyRecords({
  containerId,
  actorId,
}: {
  containerId: string;
  actorId: string;
}) {
  const q = useQuery({
    queryKey: ["kyc", "mine", containerId, actorId],
    queryFn: () => api("GET", `/containers/${containerId}/actors/${actorId}`),
    enabled: Boolean(actorId) && actorId !== "undefined",
  });

  const rows: KycRecord[] = Array.isArray(q.data) ? q.data : [];

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
      <p className="text-sm font-semibold text-black dark:text-white m-0 mb-3">
        My KYC records
      </p>
      {q.isLoading ? (
        <p className="text-[11px] text-neutral-400 m-0">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-[11px] text-neutral-400 m-0">No records yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between py-2 border-b border-neutral-100 dark:border-neutral-900 last:border-0"
            >
              <div>
                <p className="text-sm text-black dark:text-white m-0">
                  {r.legal_name ?? "—"}
                </p>
                <p className="text-[11px] text-neutral-400 m-0">
                  {[
                    r.nida_id && `NIDA ${r.nida_id}`,
                    r.tin_number && `TIN ${r.tin_number}`,
                    r.brela_number && `BRELA ${r.brela_number}`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
              </div>
              <KycStatus status={r.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function KycStatus({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "text-neutral-500 bg-neutral-100 dark:bg-neutral-900",
    submitted: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
    under_review: "text-blue-600 bg-blue-50 dark:bg-blue-950/30",
    approved: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
    rejected: "text-red-600 bg-red-50 dark:bg-red-950/30",
  };
  return (
    <span
      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${map[status] ?? "text-neutral-500 bg-neutral-100 dark:bg-neutral-900"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
