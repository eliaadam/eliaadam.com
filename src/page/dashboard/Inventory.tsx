import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  Layers,
  Package,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import {
  sdk,
  type InventoryItem,
  type InventoryItemStatus,
  type OwnershipShape,
  type InventoryParticipant,
} from "../../lib/sdk";
import type {
  ItemWithAttributes,
  TreeItem,
} from "../../lib/sdk/domains/inventoryCatalog";
import { API_BASE_URL } from "../../lib/query/Api";
import { useAuth } from "../../components/context/Authcontext";
import { useContainer } from "../../components/context/ContainerContext";
import { useCanManageInventory } from "../../lib/hooks/useCanManageInventory";
import { ItemDetailsPanel } from "./inventory-catalog/ItemDetailsPanel";
import { ExpiringTab } from "./inventory-catalog/ExpiringTab";
import { FieldLabelsTab } from "./inventory-catalog/FieldLabelsTab";
import {
  errorMessage,
  errorTextClass,
  expiryClasses,
  formatMoney,
  inputClass as catalogInputClass,
  secondaryButtonClass,
} from "./inventory-catalog/ui";

/* ------------------------------------------------------------------ */
/* Shared styles                                                       */
/* ------------------------------------------------------------------ */

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-black/20 dark:ring-white/30 focus:border-black focus:ring-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white";

const primaryButtonClass =
  "rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60 dark:bg-white dark:text-black";

const ghostButtonClass =
  "rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900";

const emptyBoxClass =
  "rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-500";

/**
 * Items and the catalog tree describe the same underlying inventory, so a
 * change made in either tab (publish, archive, edit, branding…) refreshes
 * both.
 */
function useInvalidateInventory() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["inventory", "items"] });
    queryClient.invalidateQueries({ queryKey: ["inventory-catalog"] });
  };
}

/* ------------------------------------------------------------------ */
/* Dashboard (tabs)                                                    */
/* ------------------------------------------------------------------ */

type Tab = "items" | "catalog" | "expiring" | "fields";

const TABS: { key: Tab; label: string }[] = [
  { key: "items", label: "Items" },
  { key: "catalog", label: "Catalog" },
  { key: "expiring", label: "Expiring" },
  { key: "fields", label: "Field labels" },
];

/**
 * Inventory — one screen for everything a container sells: the sellable
 * items (pricing, branding, ownership), the catalog tree of
 * products/services, items nearing expiry, and the per-container labels
 * that give the reserved generic fields their meaning.
 */
export function Inventory() {
  const { currentContainerId } = useContainer();
  const [activeTab, setActiveTab] = useState<Tab>("items");

  if (!currentContainerId) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        Select a container first — inventory belongs to whichever container
        you're currently in.
      </p>
    );
  }

  return (
    <div className="max-w-6xl">
      <h1 className="text-xl font-semibold tracking-tight">Inventory</h1>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
        Manage what this container sells, organise it into a catalog, and record
        the details your business needs.
      </p>

      {/* Scrolls horizontally on narrow screens instead of wrapping */}
      <div
        role="tablist"
        aria-label="Inventory sections"
        className="-mx-4 mt-4 overflow-x-auto border-b border-neutral-200 px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 dark:border-neutral-800 [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex gap-5">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`inventory-tab-${t.key}`}
              aria-selected={activeTab === t.key}
              aria-controls={`inventory-panel-${t.key}`}
              onClick={() => setActiveTab(t.key)}
              className={`whitespace-nowrap border-b-2 pb-2.5 text-sm font-medium transition-colors ${
                activeTab === t.key
                  ? "border-black text-black dark:border-white dark:text-white"
                  : "border-transparent text-neutral-500 hover:text-black dark:text-neutral-500 dark:hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`inventory-panel-${activeTab}`}
        aria-labelledby={`inventory-tab-${activeTab}`}
        className="mt-5"
      >
        {activeTab === "items" && <ItemsTab containerId={currentContainerId} />}
        {activeTab === "catalog" && (
          <CatalogTab containerId={currentContainerId} />
        )}
        {activeTab === "expiring" && (
          <ExpiringTab containerId={currentContainerId} />
        )}
        {activeTab === "fields" && (
          <FieldLabelsTab containerId={currentContainerId} />
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/* ITEMS TAB                                                           */
/* ================================================================== */

/**
 * These three strings are the ones capabilities.core.fulfillment
 * actually registers a fulfillment_registry handler for (see
 * infrastructure/handlers.py's own HANDLERS_BY_ITEM_TYPE) — a
 * listing created from an item with any OTHER item_type silently
 * gets no automatic fulfillment at all (surfacing's own documented,
 * expected fallback for an unregistered source_type: payment-only,
 * no error). item_type itself stays open-ended at the schema level
 * (inventory's own domain never restricts it), so this is a UI-only
 * constraint — a "Custom…" escape hatch below still allows any
 * string, for a genuine future case with no automatic fulfillment at
 * all (e.g. something handled entirely through surfacing's own
 * subscription pricing_mode). Free-text entry here previously made
 * silently losing fulfillment the DEFAULT outcome for anyone not
 * typing the exact right string — this makes the safe path the easy
 * one instead.
 */
const KNOWN_ITEM_TYPES: { value: string; label: string; hint: string }[] = [
  {
    value: "digital_product",
    label: "Digital product",
    hint: "Access is granted automatically the moment payment succeeds.",
  },
  {
    value: "physical_product",
    label: "Physical product",
    hint: "Creates a shipment for Logistics to deliver once payment succeeds.",
  },
  {
    value: "service",
    label: "Service",
    hint: "Creates a booking you mark scheduled/performed yourself, from Fulfillment.",
  },
];

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

function ItemsTab({ containerId }: { containerId: string }) {
  const { user } = useAuth();
  const { data: canManage } = useCanManageInventory();
  const [showCreate, setShowCreate] = useState(false);

  const { data: items, isLoading } = useQuery({
    queryKey: ["inventory", "items", containerId],
    queryFn: () => sdk.inventory.listItems(containerId),
  });

  const drafts = items?.filter((i) => i.status === "draft") ?? [];
  const active = items?.filter((i) => i.status === "active") ?? [];
  const archived = items?.filter((i) => i.status === "archived") ?? [];

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Products and services this container can sell — pricing, descriptions,
          and branding, kept separate from where and how they're actually
          listed.
        </p>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            aria-label="New item"
            className={`flex flex-none items-center gap-1.5 ${primaryButtonClass}`}
          >
            <Plus size={15} />
            <span className="hidden sm:inline">New item</span>
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
          containerId={containerId}
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

  const invalidate = useInvalidateInventory();

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
    <li className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="max-w-full truncate text-sm font-medium">
            {item.title}
          </p>
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
        <div className="flex flex-wrap items-center gap-2 sm:flex-none sm:flex-nowrap">
          {item.ownership.allows_participants && (
            <button
              type="button"
              onClick={() => setManagingParticipants(true)}
              className={`flex items-center gap-1 ${ghostButtonClass}`}
            >
              <Users size={13} />
              Participants
            </button>
          )}
          <button
            type="button"
            onClick={() => setManagingBranding(true)}
            className={ghostButtonClass}
          >
            Branding
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={ghostButtonClass}
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
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-medium">
          Participants — {item.title}
        </p>
        <button
          type="button"
          onClick={onDone}
          className="flex-none text-xs font-medium text-neutral-500 hover:text-black dark:hover:text-white"
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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          className={inputClass}
          placeholder="Actor id to add…"
          value={newActorId}
          onChange={(e) => setNewActorId(e.target.value)}
        />
        <select
          className={`${inputClass} sm:max-w-[7rem]`}
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
  const [role, setRole] = useState<string>("logo");
  const invalidate = useInvalidateInventory();

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
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-medium">
          Branding — {item.title}
        </p>
        <button
          type="button"
          onClick={onDone}
          className="flex-none text-xs font-medium text-neutral-500 hover:text-black dark:hover:text-white"
        >
          Done
        </button>
      </div>

      {item.branding.assets.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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

      <div className="flex flex-wrap items-center gap-2">
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
      {/* Always visible on touch screens (no hover); hover-reveal on desktop */}
      <button
        type="button"
        onClick={onRemove}
        disabled={removing}
        aria-label="Remove"
        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white transition-opacity hover:bg-red-600 disabled:opacity-60 sm:opacity-0 sm:group-hover:opacity-100"
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
  const invalidate = useInvalidateInventory();
  const isEdit = Boolean(existing);

  const [title, setTitle] = useState(existing?.title ?? "");
  const [itemType, setItemType] = useState(
    existing?.item_type ?? "digital_product",
  );
  const isKnownType = KNOWN_ITEM_TYPES.some((t) => t.value === itemType);
  const [useCustomType, setUseCustomType] = useState(
    Boolean(existing) && !isKnownType,
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
      invalidate();
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
            {useCustomType ? (
              <>
                <input
                  className={inputClass}
                  placeholder="Custom item type…"
                  value={itemType}
                  onChange={(e) => setItemType(e.target.value)}
                />
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  A custom type gets no automatic fulfillment — you'll need to
                  handle delivery for this yourself.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setUseCustomType(false);
                    setItemType("digital_product");
                  }}
                  className="self-start text-[11px] font-medium text-neutral-500 hover:text-black dark:hover:text-white"
                >
                  Choose from the list instead
                </button>
              </>
            ) : (
              <>
                <select
                  className={inputClass}
                  value={itemType}
                  onChange={(e) => setItemType(e.target.value)}
                >
                  {KNOWN_ITEM_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-500">
                  {KNOWN_ITEM_TYPES.find((t) => t.value === itemType)?.hint}
                </p>
                <button
                  type="button"
                  onClick={() => setUseCustomType(true)}
                  className="self-start text-[11px] font-medium text-neutral-500 hover:text-black dark:hover:text-white"
                >
                  Use a custom type instead
                </button>
              </>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-500">
              Who owns this?
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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

      <div className="flex flex-wrap items-center gap-2">
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

      <div className="flex flex-wrap items-center gap-3">
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

/* ================================================================== */
/* CATALOG TAB                                                         */
/* ================================================================== */

/** Hides archived items — but keeps an archived parent that still has
 * visible children, so nothing is orphaned from view. */
function prune(nodes: TreeItem[], showArchived: boolean): TreeItem[] {
  return nodes.flatMap((n) => {
    const children = prune(n.children, showArchived);
    if (n.status === "archived" && !showArchived && children.length === 0)
      return [];
    return [{ ...n, children }];
  });
}

function CatalogTab({ containerId }: { containerId: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const {
    data: tree,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["inventory-catalog", "tree", containerId],
    queryFn: () => sdk.inventoryCatalog.getItemTree(containerId),
  });

  const visible = useMemo(
    () => prune(tree ?? [], showArchived),
    [tree, showArchived],
  );

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="flex flex-col gap-3">
        <LookupBox containerId={containerId} onPick={setSelectedId} />

        <label className="flex w-fit items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show archived
        </label>

        {isLoading && (
          <p className="text-sm text-neutral-500 dark:text-neutral-500">
            Loading…
          </p>
        )}
        {isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Couldn't load the catalog.
          </p>
        )}
        {tree && visible.length === 0 && (
          <p className={emptyBoxClass}>
            No items yet. Create items in the Items tab, then organise them
            here.
          </p>
        )}

        {visible.length > 0 && (
          <ul className="rounded-lg border border-neutral-200 py-1 dark:border-neutral-800">
            {visible.map((n) => (
              <TreeRows
                key={n.id}
                node={n}
                depth={0}
                selectedId={selectedId}
                collapsed={collapsed}
                onToggle={toggle}
                onSelect={setSelectedId}
              />
            ))}
          </ul>
        )}
      </div>

      <div>
        {selectedId && tree ? (
          <ItemDetailsPanel
            key={selectedId}
            containerId={containerId}
            itemId={selectedId}
            tree={tree}
            onSelect={setSelectedId}
          />
        ) : (
          <p className={emptyBoxClass}>
            Select an item to see and edit its details.
          </p>
        )}
      </div>
    </div>
  );
}

function TreeRows({
  node,
  depth,
  selectedId,
  collapsed,
  onToggle,
  onSelect,
}: {
  node: TreeItem;
  depth: number;
  selectedId: string | null;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = !collapsed.has(node.id);
  const selected = node.id === selectedId;

  return (
    <li>
      <div
        className={`flex items-center gap-1.5 py-1.5 pr-3 text-sm ${
          selected
            ? "bg-neutral-100 dark:bg-neutral-900"
            : "hover:bg-neutral-50 dark:hover:bg-neutral-900/60"
        }`}
        style={{ paddingLeft: 8 + depth * 18 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            className="flex-none text-neutral-400"
            aria-label={isOpen ? "Collapse" : "Expand"}
          >
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-[14px] flex-none" />
        )}
        <button
          type="button"
          onClick={() => onSelect(node.id)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span
            className={`truncate ${
              node.status === "archived"
                ? "text-neutral-400 line-through dark:text-neutral-600"
                : ""
            }`}
          >
            {node.title}
          </span>
          {node.node.is_bundle && (
            <Layers
              size={12}
              className="flex-none text-neutral-400"
              aria-label="Bundle"
            />
          )}
          {node.node.parent_item_id && node.node.quantity_in_parent !== 1 && (
            <span className="flex-none text-[11px] text-neutral-500 dark:text-neutral-500">
              ×{node.node.quantity_in_parent}
            </span>
          )}
        </button>
        {node.sku && (
          <span className="hidden flex-none text-[11px] text-neutral-500 sm:inline dark:text-neutral-500">
            {node.sku}
          </span>
        )}
        {node.expiry_status && node.expiry_status !== "ok" && (
          <span
            className={`flex-none rounded-full px-1.5 py-0.5 text-[10px] font-medium ${expiryClasses(node.expiry_status)}`}
          >
            {node.expiry_status === "expired" ? "expired" : "soon"}
          </span>
        )}
        <span className="flex-none text-[11px] text-neutral-500 dark:text-neutral-500">
          {formatMoney(node.price.total, node.price.currency)}
        </span>
      </div>
      {hasChildren && isOpen && (
        <ul>
          {node.children.map((c) => (
            <TreeRows
              key={c.id}
              node={c}
              depth={depth + 1}
              selectedId={selectedId}
              collapsed={collapsed}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function LookupBox({
  containerId,
  onPick,
}: {
  containerId: string;
  onPick: (id: string) => void;
}) {
  const [code, setCode] = useState("");
  const [results, setResults] = useState<ItemWithAttributes[] | null>(null);

  const lookup = useMutation({
    // A scan could be either — try the SKU, and the barcode too. The
    // server returns the union.
    mutationFn: (value: string) =>
      sdk.inventoryCatalog.lookupItems(containerId, {
        sku: value,
        barcode: value,
      }),
    onSuccess: setResults,
  });

  return (
    <div className="flex flex-col gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) lookup.mutate(code.trim());
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            className={`${catalogInputClass} pl-8`}
            placeholder="Scan or type a SKU / barcode…"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className={secondaryButtonClass}
          disabled={lookup.isPending}
        >
          Find
        </button>
      </form>
      {lookup.isError && (
        <p className={errorTextClass}>
          {errorMessage(lookup.error, "Lookup failed.")}
        </p>
      )}
      {results && results.length === 0 && (
        <p className="text-xs text-neutral-500 dark:text-neutral-500">
          Nothing matches that code.
        </p>
      )}
      {results && results.length > 0 && (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {results.map((r) => (
            <li key={r.item.id}>
              <button
                type="button"
                onClick={() => onPick(r.item.id)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs hover:bg-neutral-50 dark:hover:bg-neutral-900"
              >
                <span className="truncate font-medium">{r.item.title}</span>
                <span className="flex-none text-neutral-500 dark:text-neutral-500">
                  {r.attributes.sku ?? r.attributes.barcode}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
