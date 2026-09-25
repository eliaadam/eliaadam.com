import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, UserCog } from "lucide-react";
import { useAuth } from "../../components/context/Authcontext";
import { sdk } from "../../lib/sdk";
import type { OperatorStatus, Operator } from "../../lib/sdk/domains/logistics";
 
/**
 * Fleet-admin surface for Operator — registration, self-or-manage
 * updates, suspend/reactivate/deactivate. "My operator profile" sits
 * at the top since self-update needs no fleet_admin role at all
 * (Ownership OR Authority, pattern #3) — an operator managing their
 * own contact/credential info is a different, lower-bar action than
 * registering a new one.
 *
 * transport_mode offers only "land" for now — the platform's own
 * confirmed v1 scoping — though the field itself stays open text
 * server-side (see the backend's own OperatorState module docstring)
 * so sea/air fit later without a schema change.
 */

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

function statusClasses(status: OperatorStatus): string {
  if (status === "active") {
    return "bg-neutral-100 text-black dark:bg-neutral-900 dark:text-white";
  }
  if (status === "suspended") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
  }
  return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"; // inactive
}

export function PersonnelTab({ containerId }: { containerId: string }) {
  const { user } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  const { data: myProfile } = useQuery({
    queryKey: ["logistics", "operator-mine", containerId],
    queryFn: () => sdk.logistics.myOperatorProfile(containerId),
    retry: false,
  });

  const { data: operators, isLoading } = useQuery({
    queryKey: ["logistics", "operators", containerId],
    queryFn: () => sdk.logistics.listOperators(containerId),
  });

  return (
    <div className="flex flex-col gap-5">
      {myProfile && (
        <div className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Your own operator profile
          </p>
          <OperatorRow operator={myProfile} currentActorId={user?.id} isSelf />
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Operators</p>
        <button
          type="button"
          onClick={() => setShowRegister((v) => !v)}
          className={`flex items-center gap-1 ${primaryButtonClass}`}
        >
          <Plus size={13} />
          {showRegister ? "Close" : "Register operator"}
        </button>
      </div>

      {showRegister && (
        <RegisterOperatorForm
          containerId={containerId}
          onDone={() => setShowRegister(false)}
        />
      )}

      {isLoading && (
        <p className="text-sm text-neutral-500 dark:text-neutral-500">
          Loading…
        </p>
      )}

      {operators && operators.length === 0 && !showRegister && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <UserCog
            className="mx-auto text-neutral-400 dark:text-neutral-600"
            size={22}
          />
          <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-500">
            No operators registered yet.
          </p>
        </div>
      )}

      {operators && operators.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {operators.map((o) => (
            <OperatorRow
              key={o.id}
              operator={o}
              currentActorId={user?.id}
              isSelf={o.actor_id === user?.id}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function OperatorRow({
  operator,
  currentActorId,
  isSelf,
}: {
  operator: Operator;
  currentActorId: string | undefined;
  isSelf: boolean;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["logistics", "operators"] });
    queryClient.invalidateQueries({
      queryKey: ["logistics", "operator-mine"],
    });
  };

  const suspendMutation = useMutation({
    mutationFn: () => sdk.logistics.suspendOperator(operator.id),
    onSuccess: invalidate,
  });
  const reactivateMutation = useMutation({
    mutationFn: () => sdk.logistics.reactivateOperator(operator.id),
    onSuccess: invalidate,
  });
  const deactivateMutation = useMutation({
    mutationFn: () => sdk.logistics.deactivateOperator(operator.id),
    onSuccess: invalidate,
  });

  if (editing) {
    return (
      <li className="p-4">
        <UpdateOperatorForm
          operator={operator}
          onDone={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">
            {operator.credential_type} · {operator.credential_number}
          </p>
          <span
            className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClasses(operator.status)}`}
          >
            {operator.status}
          </span>
          {isSelf && (
            <span className="flex-none text-[11px] text-neutral-400 dark:text-neutral-600">
              (you)
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-500">
          {operator.transport_mode}
          {operator.phone && ` · ${operator.phone}`}
          {operator.credential_expires_at &&
            ` · expires ${new Date(operator.credential_expires_at).toLocaleDateString()}`}
        </p>
      </div>

      <div className="flex flex-none items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
        >
          Edit
        </button>
        {operator.status !== "active" && (
          <button
            type="button"
            onClick={() => reactivateMutation.mutate()}
            disabled={reactivateMutation.isPending}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 disabled:opacity-60 dark:text-neutral-400 dark:hover:bg-neutral-900"
          >
            Reactivate
          </button>
        )}
        {operator.status === "active" && (
          <button
            type="button"
            onClick={() => suspendMutation.mutate()}
            disabled={suspendMutation.isPending}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-60 dark:text-amber-400 dark:hover:bg-amber-500/10"
          >
            Suspend
          </button>
        )}
        {operator.status !== "inactive" && (
          <button
            type="button"
            onClick={() => deactivateMutation.mutate()}
            disabled={deactivateMutation.isPending}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            Deactivate
          </button>
        )}
      </div>
    </li>
  );
}

function RegisterOperatorForm({
  containerId,
  onDone,
}: {
  containerId: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [actorId, setActorId] = useState("");
  const [credentialNumber, setCredentialNumber] = useState("");
  const [credentialType, setCredentialType] = useState("drivers_license");
  const [credentialExpiresAt, setCredentialExpiresAt] = useState("");
  const [phone, setPhone] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      sdk.logistics.registerOperator(containerId, {
        actor_id: actorId,
        transport_mode: "land",
        credential_number: credentialNumber,
        credential_type: credentialType,
        credential_expires_at: credentialExpiresAt || undefined,
        phone: phone || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logistics", "operators"] });
      onDone();
    },
  });

  const canSubmit = Boolean(actorId && credentialNumber && credentialType);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Actor id
        </label>
        <input
          className={inputClass}
          placeholder="The container member becoming an operator…"
          value={actorId}
          onChange={(e) => setActorId(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Credential type
          </label>
          <input
            className={inputClass}
            placeholder="drivers_license, certificate_of_competency…"
            value={credentialType}
            onChange={(e) => setCredentialType(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Credential number
          </label>
          <input
            className={inputClass}
            value={credentialNumber}
            onChange={(e) => setCredentialNumber(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Credential expires
          </label>
          <input
            className={inputClass}
            type="date"
            value={credentialExpiresAt}
            onChange={(e) => setCredentialExpiresAt(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Phone (optional)
          </label>
          <input
            className={inputClass}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!canSubmit || mutation.isPending}
          className={primaryButtonClass}
        >
          {mutation.isPending ? "Registering…" : "Register"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-xs font-medium text-neutral-500 hover:text-black dark:hover:text-white"
        >
          Cancel
        </button>
        {mutation.isError && (
          <p className="text-xs text-red-600 dark:text-red-400">
            Couldn't register this operator.
          </p>
        )}
      </div>
    </div>
  );
}

function UpdateOperatorForm({
  operator,
  onDone,
}: {
  operator: Operator;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [credentialNumber, setCredentialNumber] = useState(
    operator.credential_number,
  );
  const [credentialType, setCredentialType] = useState(
    operator.credential_type,
  );
  const [credentialExpiresAt, setCredentialExpiresAt] = useState(
    operator.credential_expires_at?.slice(0, 10) ?? "",
  );
  const [phone, setPhone] = useState(operator.phone ?? "");

  const mutation = useMutation({
    mutationFn: () =>
      sdk.logistics.updateOperator(operator.id, {
        credential_number: credentialNumber,
        credential_type: credentialType,
        credential_expires_at: credentialExpiresAt || undefined,
        phone: phone || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logistics", "operators"] });
      queryClient.invalidateQueries({
        queryKey: ["logistics", "operator-mine"],
      });
      onDone();
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Credential type
          </label>
          <input
            className={inputClass}
            value={credentialType}
            onChange={(e) => setCredentialType(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Credential number
          </label>
          <input
            className={inputClass}
            value={credentialNumber}
            onChange={(e) => setCredentialNumber(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Credential expires
          </label>
          <input
            className={inputClass}
            type="date"
            value={credentialExpiresAt}
            onChange={(e) => setCredentialExpiresAt(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Phone
          </label>
          <input
            className={inputClass}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className={primaryButtonClass}
        >
          {mutation.isPending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-xs font-medium text-neutral-500 hover:text-black dark:hover:text-white"
        >
          Cancel
        </button>
        {mutation.isError && (
          <p className="text-xs text-red-600 dark:text-red-400">
            Couldn't save changes.
          </p>
        )}
      </div>
    </div>
  );
}
