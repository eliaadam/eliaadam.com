import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Package, X, Users } from "lucide-react";
import {
  sdk,
  type InventoryItem,
  type InventoryItemStatus,
  type OwnershipShape,
  type InventoryParticipant,
} from "../../lib/sdk";
import { API_BASE_URL } from "../../lib/query/Api";
import { useAuth } from "../../components/context/Authcontext";
import { useContainer } from "../../components/context/ContainerContext";
import { useCanManageInventory } from "../../lib/hooks/useCanManageInventory";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

function statusClasses(status: InventoryItemStatus): string {
  if (status === "active") {
    return "bg-neutral-100 text-black dark:bg-neutral-900 dark:text-white";
  }
  if (status === "draft") {
    return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
  }
  return "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"; // archived
}

const OWNERSHIP_SHAPE_OPTIONS: {
  value: OwnershipShape;
  label: string;
  hint: string;
}[] = [
  {
    value: "personal",
    label: "Just me",
    hint: "Only you can manage this item.",
  },
  {
    value: "container",
    label: "Container-owned",
    hint: "Anyone with the inventory role can manage this.",
  },
  {
    value: "shared",
    label: "Specific people",
    hint: "Only people you invite — not everyone with the role.",
  },
  {
    value: "container_shared",
    label: "Container + specific people",
    hint: "Anyone with the role, plus people you invite.",
  },
];

function shapeBadgeLabel(shape: OwnershipShape): string {
  switch (shape) {
    case "personal":
      return "Personal";
    case "container":
      return "Container";
    case "shared":
      return "Shared";
    case "container_shared":
      return "Container + members";
  }
}

export function Inventory() {
  const { currentContainerId } = useContainer();
  const { user } = useAuth();
  const { data: canManage } = useCanManageInventory();
  const [showCreate, setShowCreate] = useState(false);

  const { data: items, isLoading } = useQuery({
    queryKey: ["inventory", "items", currentContainerId],
    queryFn: () => sdk.inventory.listItems(currentContainerId!),
    enabled: Boolean(currentContainerId),
  });

  if (!currentContainerId) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Select a container first — inventory items belong to whichever container
        you're currently in.
      </p>
    );
  }

  const drafts = items?.filter((i) => i.status === "draft") ?? [];
  const active = items?.filter((i) => i.status === "active") ?? [];
  const archived = items?.filter((i) => i.status === "archived") ?? [];

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Inventory</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Products and services this container can sell — pricing,
            descriptions, and branding, kept separate from where and how they're
            actually listed.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className={`flex flex-none items-center gap-1.5 ${primaryButtonClass}`}
          >
            <Plus size={15} />
            New item
          </button>
        )}
      </div>

      {!canManage && (
        <p className="mt-4 rounded-md bg-neutral-100 px-3 py-2 text-sm text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
          You don't have permission to create inventory items on this container
          — showing what's here, but the "New item" control is hidden. You may
          still see management controls on items you personally own or
          participate in.
        </p>
      )}

      {showCreate && canManage && (
        <ItemForm
          containerId={currentContainerId}
          onDone={() => setShowCreate(false)}
        />
      )}

      {isLoading && (
        <div className="mt-6 flex flex-col gap-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900"
            />
          ))}
        </div>
      )}

      {items && items.length === 0 && !showCreate && (
        <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <Package
            className="mx-auto text-neutral-400 dark:text-neutral-600"
            size={22}
          />
          <p className="mt-3 text-sm font-medium">No inventory items yet</p>
        </div>
      )}

      {drafts.length > 0 && (
        <ItemSection
          title="Drafts"
          items={drafts}
          currentActorId={user?.id}
          canManage={Boolean(canManage)}
        />
      )}
      {active.length > 0 && (
        <ItemSection
          title="Active"
          items={active}
          currentActorId={user?.id}
          canManage={Boolean(canManage)}
        />
      )}
      {archived.length > 0 && (
        <ItemSection
          title="Archived"
          items={archived}
          currentActorId={user?.id}
          canManage={Boolean(canManage)}
        />
      )}
    </div>
  );
}

function ItemSection({
  title,
  items,
  currentActorId,
  canManage,
}: {
  title: string;
  items: InventoryItem[];
  currentActorId: string | undefined;
  canManage: boolean;
}) {
  return (
    <div className="mt-6">
      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
        {title}
      </p>
      <ul className="mt-2 flex flex-col divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            currentActorId={currentActorId}
            canManage={canManage}
          />
        ))}
      </ul>
    </div>
  );
}

function ItemRow({
  item,
  currentActorId,
  canManage,
}: {
  item: InventoryItem;
  currentActorId: string | undefined;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [managingBranding, setManagingBranding] = useState(false);
  const [managingParticipants, setManagingParticipants] = useState(false);

  // Ownership retrofit — is_owned_by_me is computed SERVER-SIDE (see
  // backend views.py's own note on why: current ownership can no
  // longer be derived purely from fields already on the item). This
  // alone is NOT sufficient for button visibility though: the backend
  // gates these same actions with AccessMode.EITHER (participation OR
  // role), so a role-holder with no participant row — the only way a
  // "container"-shaped item is ever manageable at all, since it has
  // zero participants by design — must also see the controls. Mirrors
  // Events' own canManageThis = isOwner || canManage exactly.
  const isParticipant = Boolean(item.ownership.is_owned_by_me);
  const canManageThis = isParticipant || canManage;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["inventory", "items"] });

  const publishMutation = useMutation({
    mutationFn: () => sdk.inventory.publishItem(item.id),
    onSuccess: invalidate,
  });
  const archiveMutation = useMutation({
    mutationFn: () => sdk.inventory.archiveItem(item.id),
    onSuccess: invalidate,
  });

  if (editing) {
    return (
      <li className="p-4">
        <ItemForm
          containerId={item.container_id}
          existing={item}
          onDone={() => setEditing(false)}
        />
      </li>
    );
  }

  if (managingBranding) {
    return (
      <li className="p-4">
        <BrandingSection
          item={item}
          onDone={() => setManagingBranding(false)}
        />
      </li>
    );
  }

  if (managingParticipants) {
    return (
      <li className="p-4">
        <ParticipantsSection
          item={item}
          currentActorId={currentActorId}
          onDone={() => setManagingParticipants(false)}
        />
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{item.title}</p>
          <span
            className={`flex-none rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClasses(item.status)}`}
          >
            {item.status}
          </span>
          <span
            className="flex-none rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400"
            title={item.ownership.label ?? undefined}
          >
            {shapeBadgeLabel(item.ownership.shape)}
          </span>
          {!item.branding.assets.length ? null : (
            <span className="flex-none text-[11px] text-neutral-400 dark:text-neutral-600">
              {item.branding.assets.length} media
            </span>
          )}
        </div>
        <p className="truncate text-xs text-neutral-500 dark:text-neutral-500">
          {item.item_type}
          {" · "}
          {item.price.is_free
            ? "Free"
            : `${item.price.currency} ${(item.price.total / 100).toFixed(2)}`}
          {item.price.discount_percent > 0 && !item.price.is_free && (
            <span className="ml-1 text-neutral-400 dark:text-neutral-600">
              ({item.price.discount_percent}% off)
            </span>
          )}
        </p>
      </div>
      {canManageThis && (
        <div className="flex flex-none items-center gap-2">
          {item.ownership.allows_participants && (
            <button
              type="button"
              onClick={() => setManagingParticipants(true)}
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
            >
              <Users size={13} />
              Participants
            </button>
          )}
          <button
            type="button"
            onClick={() => setManagingBranding(true)}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
          >
            Branding
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
          >
            Edit
          </button>
          {item.status === "draft" && (
            <button
              type="button"
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
              className="rounded-md bg-black px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black"
            >
              {publishMutation.isPending ? "Publishing…" : "Publish"}
            </button>
          )}
          {item.status !== "archived" && (
            <button
              type="button"
              onClick={() => archiveMutation.mutate()}
              disabled={archiveMutation.isPending}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              Archive
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function ParticipantsSection({
  item,
  currentActorId,
  onDone,
}: {
  item: InventoryItem;
  currentActorId: string | undefined;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [newActorId, setNewActorId] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "member">("member");

  const { data: participants, isLoading } = useQuery({
    queryKey: ["inventory", "participants", item.id],
    queryFn: () => sdk.inventory.listParticipants(item.id),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["inventory", "participants", item.id],
    });

  const addMutation = useMutation({
    mutationFn: () =>
      sdk.inventory.addParticipant(item.id, newActorId, newRole),
    onSuccess: () => {
      setNewActorId("");
      invalidate();
    },
  });

  const removeMutation = useMutation({
    mutationFn: (actorId: string) =>
      sdk.inventory.removeParticipant(item.id, actorId),
    onSuccess: invalidate,
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Participants — {item.title}</p>
        <button
          type="button"
          onClick={onDone}
          className="text-xs font-medium text-neutral-500 hover:text-black dark:hover:text-white"
        >
          Done
        </button>
      </div>

      {item.ownership.shape === "container_shared" && (
        <p className="text-xs text-neutral-500 dark:text-neutral-500">
          This item is container-owned — anyone with the inventory role can
          already manage it. Adding people here gives them access even without
          that role.
        </p>
      )}

      {isLoading && (
        <p className="text-xs text-neutral-500 dark:text-neutral-500">
          Loading…
        </p>
      )}

      {participants && participants.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {participants.map((p) => (
            <ParticipantRow
              key={p.id}
              participant={p}
              isSelf={p.actor_id === currentActorId}
              onRemove={() => removeMutation.mutate(p.actor_id)}
              removing={
                removeMutation.isPending &&
                removeMutation.variables === p.actor_id
              }
            />
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <input
          className={inputClass}
          placeholder="Actor id to add…"
          value={newActorId}
          onChange={(e) => setNewActorId(e.target.value)}
        />
        <select
          className={`${inputClass} max-w-[7rem]`}
          value={newRole}
          onChange={(e) => setNewRole(e.target.value as "admin" | "member")}
        >
          <option value="member">member</option>
          <option value="admin">admin</option>
        </select>
        <button
          type="button"
          onClick={() => addMutation.mutate()}
          disabled={!newActorId || addMutation.isPending}
          className={`flex-none ${primaryButtonClass}`}
        >
          {addMutation.isPending ? "Adding…" : "Add"}
        </button>
      </div>
      {addMutation.isError && (
        <p className="text-xs text-red-600 dark:text-red-400">
          Couldn't add that participant.
        </p>
      )}
    </div>
  );
}

function ParticipantRow({
  participant,
  isSelf,
  onRemove,
  removing,
}: {
  participant: InventoryParticipant;
  isSelf: boolean;
  onRemove: () => void;
  removing: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium">
          {participant.actor_id}
          {isSelf && (
            <span className="ml-1.5 text-neutral-400 dark:text-neutral-600">
              (you)
            </span>
          )}
        </p>
        <p className="text-[11px] text-neutral-500 dark:text-neutral-500">
          {participant.role}
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={removing}
        aria-label="Remove participant"
        className="flex-none text-neutral-400 transition-colors hover:text-red-600 disabled:opacity-60 dark:hover:text-red-400"
      >
        <X size={14} />
      </button>
    </li>
  );
}

const BRANDING_ROLES = ["logo", "banner", "gallery", "video"] as const;

function BrandingSection({
  item,
  onDone,
}: {
  item: InventoryItem;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [role, setRole] = useState<string>("logo");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["inventory", "items"] });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const uploaded = await sdk.inventory.uploadBrandingAsset(file);
      const nextAssets = [
        ...item.branding.assets,
        { file_id: uploaded.id, role },
      ];
      return sdk.inventory.setBranding(item.id, nextAssets);
    },
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (fileId: string) => {
      const nextAssets = item.branding.assets.filter(
        (a) => a.file_id !== fileId,
      );
      return sdk.inventory.setBranding(item.id, nextAssets);
    },
    onSuccess: invalidate,
  });

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    event.target.value = "";
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Branding — {item.title}</p>
        <button
          type="button"
          onClick={onDone}
          className="text-xs font-medium text-neutral-500 hover:text-black dark:hover:text-white"
        >
          Done
        </button>
      </div>

      {item.branding.assets.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {item.branding.assets.map((asset) => (
            <BrandingAssetTile
              key={asset.file_id}
              asset={asset}
              onRemove={() => removeMutation.mutate(asset.file_id)}
              removing={
                removeMutation.isPending &&
                removeMutation.variables === asset.file_id
              }
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <select
          className={`${inputClass} max-w-[8rem]`}
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          {BRANDING_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <label className="cursor-pointer rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-900">
          {uploadMutation.isPending ? "Uploading…" : "Upload file"}
          <input
            type="file"
            accept="image/*,video/*"
            className="hidden"
            disabled={uploadMutation.isPending}
            onChange={handleFileSelected}
          />
        </label>
        {uploadMutation.isError && (
          <p className="text-xs text-red-600 dark:text-red-400">
            Couldn't upload that file.
          </p>
        )}
      </div>
    </div>
  );
}

function BrandingAssetTile({
  asset,
  onRemove,
  removing,
}: {
  asset: { file_id: string; role: string };
  onRemove: () => void;
  removing: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const url = `${API_BASE_URL}/api/document/files/${asset.file_id}/raw/`;

  return (
    <div className="group relative overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800">
      {imgFailed ? (
        <div className="flex h-20 items-center justify-center bg-neutral-100 text-xs text-neutral-500 dark:bg-neutral-900 dark:text-neutral-500">
          {asset.role}
        </div>
      ) : (
        <img
          src={url}
          alt={asset.role}
          onError={() => setImgFailed(true)}
          className="h-20 w-full object-cover"
        />
      )}
      <span className="absolute bottom-0 left-0 right-0 truncate bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
        {asset.role}
      </span>
      <button
        type="button"
        onClick={onRemove}
        disabled={removing}
        aria-label="Remove"
        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-red-600 disabled:opacity-60 group-hover:opacity-100"
      >
        <X size={11} />
      </button>
    </div>
  );
}

function ItemForm({
  containerId,
  existing,
  onDone,
}: {
  containerId: string;
  existing?: InventoryItem;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(existing);

  const [title, setTitle] = useState(existing?.title ?? "");
  const [itemType, setItemType] = useState(
    existing?.item_type ?? "digital_product",
  );
  const [description, setDescription] = useState(existing?.description ?? "");
  const [baseAmount, setBaseAmount] = useState(
    existing ? String(existing.price.base_amount / 100) : "",
  );
  const [currency, setCurrency] = useState(existing?.price.currency ?? "USD");
  const [taxAmount, setTaxAmount] = useState(
    existing ? String(existing.price.tax_amount / 100) : "0",
  );
  const [transportAmount, setTransportAmount] = useState(
    existing ? String(existing.price.transport_amount / 100) : "0",
  );
  const [discountPercent, setDiscountPercent] = useState(
    existing ? String(existing.price.discount_percent) : "0",
  );
  // Ownership shape — create-time only. The backend has no way to
  // change a shape once set (UpdateInventoryItemDto carries no
  // ownership fields at all), so this section is simply omitted when
  // editing rather than shown disabled.
  const [ownerType, setOwnerType] = useState<OwnershipShape>("personal");
  const [label, setLabel] = useState("");

  const toCents = (v: string) => Math.round(Number(v || "0") * 100);

  const mutation = useMutation({
    mutationFn: () =>
      isEdit
        ? sdk.inventory.updateItem(existing!.id, {
            title,
            description,
            base_amount: toCents(baseAmount),
            currency: currency.toUpperCase(),
            tax_amount: toCents(taxAmount),
            transport_amount: toCents(transportAmount),
            discount_percent: Number(discountPercent || "0"),
          })
        : sdk.inventory.createItem(containerId, {
            title,
            item_type: itemType,
            description,
            base_amount: toCents(baseAmount),
            currency: currency.toUpperCase(),
            tax_amount: toCents(taxAmount),
            transport_amount: toCents(transportAmount),
            discount_percent: Number(discountPercent || "0"),
            owner_type: ownerType,
            label:
              ownerType === "personal" || ownerType === "shared"
                ? label
                : undefined,
          }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory", "items"] });
      onDone();
    },
  });

  // Live total preview, mirroring exactly what Price's own subtotal/
  // discount/total computation does on the backend — base + tax +
  // transport, discount applied to that whole subtotal, floored.
  const subtotalCents =
    toCents(baseAmount) + toCents(taxAmount) + toCents(transportAmount);
  const discountCents = Math.floor(
    (subtotalCents * Number(discountPercent || "0")) / 100,
  );
  const totalCents = subtotalCents - discountCents;

  const needsLabel = ownerType === "personal" || ownerType === "shared";
  const canSubmit = Boolean(title) && (isEdit || !needsLabel || Boolean(label));

  return (
    <div
      className={
        isEdit
          ? "flex flex-col gap-3"
          : "mt-4 flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
      }
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Title
        </label>
        <input
          className={inputClass}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {!isEdit && (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              Type
            </label>
            <input
              className={inputClass}
              placeholder="digital_product, service, …"
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              Who owns this?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {OWNERSHIP_SHAPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setOwnerType(opt.value)}
                  title={opt.hint}
                  className={`rounded-md border px-3 py-2 text-left text-xs font-medium transition-colors ${
                    ownerType === opt.value
                      ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                      : "border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-500">
              {OWNERSHIP_SHAPE_OPTIONS.find((o) => o.value === ownerType)?.hint}
            </p>
          </div>

          {needsLabel && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
                Label
              </label>
              <input
                className={inputClass}
                placeholder="A name to tell this apart from your other items…"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
          )}
        </>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
          Description (Markdown)
        </label>
        <textarea
          className={`${inputClass} min-h-[5rem] font-mono text-xs`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Price
          </label>
          <input
            className={inputClass}
            type="number"
            min="0"
            step="0.01"
            value={baseAmount}
            onChange={(e) => setBaseAmount(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Tax
          </label>
          <input
            className={inputClass}
            type="number"
            min="0"
            step="0.01"
            value={taxAmount}
            onChange={(e) => setTaxAmount(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Transport
          </label>
          <input
            className={inputClass}
            type="number"
            min="0"
            step="0.01"
            value={transportAmount}
            onChange={(e) => setTransportAmount(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            Discount %
          </label>
          <input
            className={inputClass}
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={discountPercent}
            onChange={(e) => setDiscountPercent(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          className={`${inputClass} max-w-[6rem]`}
          placeholder="USD"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-500">
          Total the buyer pays:{" "}
          <span className="font-medium text-black dark:text-white">
            {currency.toUpperCase()} {(totalCents / 100).toFixed(2)}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!canSubmit || mutation.isPending}
          className={primaryButtonClass}
        >
          {mutation.isPending
            ? isEdit
              ? "Saving…"
              : "Creating…"
            : isEdit
              ? "Save changes"
              : "Create item"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-sm font-medium text-neutral-500 hover:text-black dark:hover:text-white"
        >
          Cancel
        </button>
        {mutation.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Couldn't save this item.
          </p>
        )}
      </div>
    </div>
  );
}
