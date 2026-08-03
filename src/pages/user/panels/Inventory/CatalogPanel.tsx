import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { inventoryApi as api, toMinor, toMajor } from "./inventory-api";

type Offering = {
  id: string;
  name: string;
  sku: string | null;
  offering_type: "product" | "service";
  tangibility: "tangible" | "intangible";
  price: number;
  currency: string;
  price_unit: string | null;
  stock_quantity: number | null;
  status: string;
  availability: string;
};

/**
 * Catalog — products and services in one list, subtyped. Tangible products show
 * stock (with a quick adjust); services/intangibles show availability. Managers
 * create/edit/archive; clerks edit + adjust stock; viewers browse.
 */
export default function CatalogPanel({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const can = (c: string) => permissions.includes(c);
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const canCreate = can("system.inventory.offering.create");
  const canUpdate = can("system.inventory.offering.update");
  const canStock = can("system.inventory.offering.adjust_stock");
  const canArchive = can("system.inventory.offering.archive");

  const offerings = useQuery({
    queryKey: ["inv", "offerings", containerId, filter],
    queryFn: () =>
      api(
        "GET",
        `/containers/${containerId}/offerings${filter !== "all" ? `?offering_type=${filter}` : ""}`,
      ),
  });

  const adjust = useMutation({
    mutationFn: ({ id, delta }: { id: string; delta: number }) =>
      api("POST", `/containers/${containerId}/offerings/${id}/stock`, {
        delta,
        reason: "adjustment",
      }),
    onSuccess: () => {
      setMsg("Stock updated.");
      qc.invalidateQueries({ queryKey: ["inv", "offerings", containerId] });
    },
    onError: (e: any) => setMsg(e.message),
  });

  const archive = useMutation({
    mutationFn: (id: string) =>
      api("DELETE", `/containers/${containerId}/offerings/${id}`),
    onSuccess: () => {
      setMsg("Archived.");
      qc.invalidateQueries({ queryKey: ["inv", "offerings", containerId] });
    },
    onError: (e: any) => setMsg(e.message),
  });

  const list: Offering[] = Array.isArray(offerings.data) ? offerings.data : [];

  return (
    <div className="p-4 space-y-4">
      {msg && (
        <div className="text-xs px-3 py-2 rounded-md bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">
          {msg}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1">
          {["all", "product", "service"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-md border ${filter === f ? "bg-black text-white dark:bg-white dark:text-black border-transparent" : "border-neutral-300 dark:border-neutral-700 text-neutral-500"}`}
            >
              {f === "all" ? "All" : f === "product" ? "Products" : "Services"}
            </button>
          ))}
        </div>
        {canCreate && (
          <button
            onClick={() => setCreating(!creating)}
            className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black"
          >
            {creating ? "Close" : "+ New offering"}
          </button>
        )}
      </div>

      {creating && canCreate && (
        <OfferingForm
          containerId={containerId}
          onSaved={(m) => {
            setMsg(m);
            setCreating(false);
            qc.invalidateQueries({
              queryKey: ["inv", "offerings", containerId],
            });
          }}
        />
      )}

      <div className="border border-neutral-200 dark:border-neutral-800 rounded-md divide-y divide-neutral-100 dark:divide-neutral-900">
        {offerings.isLoading ? (
          <div className="px-3 py-2 text-sm text-neutral-500">Loading…</div>
        ) : list.length === 0 ? (
          <div className="px-3 py-2 text-sm text-neutral-500">
            No offerings yet.
          </div>
        ) : (
          list.map((o) => (
            <div
              key={o.id}
              className="flex items-center justify-between px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="text-sm text-black dark:text-white flex items-center gap-2">
                  {o.name}
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                    {o.offering_type}
                    {o.offering_type === "product" ? ` · ${o.tangibility}` : ""}
                  </span>
                  {o.status !== "active" && (
                    <span className="text-[10px] text-neutral-400">
                      {o.status}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  {toMajor(o.price)} {o.currency}
                  {o.price_unit ? `/${o.price_unit}` : ""}
                  {o.sku ? ` · ${o.sku}` : ""}
                  {o.stock_quantity !== null
                    ? ` · stock: ${o.stock_quantity}`
                    : o.offering_type === "service"
                      ? ` · ${o.availability}`
                      : ""}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Stock adjust — only for tracked (tangible) offerings */}
                {canStock && o.stock_quantity !== null && (
                  <>
                    <button
                      onClick={() => adjust.mutate({ id: o.id, delta: -1 })}
                      className="w-6 h-6 text-xs rounded border border-neutral-300 dark:border-neutral-700"
                    >
                      −
                    </button>
                    <button
                      onClick={() => adjust.mutate({ id: o.id, delta: 1 })}
                      className="w-6 h-6 text-xs rounded border border-neutral-300 dark:border-neutral-700"
                    >
                      +
                    </button>
                  </>
                )}
                {canArchive && o.status === "active" && (
                  <button
                    onClick={() => archive.mutate(o.id)}
                    className="px-2 py-1 text-[11px] rounded border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400"
                  >
                    Archive
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/** New offering — type drives which fields show (stock vs duration). */
function OfferingForm({
  containerId,
  onSaved,
}: {
  containerId: string;
  onSaved: (m: string) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"product" | "service">("product");
  const [tangibility, setTangibility] = useState<"tangible" | "intangible">(
    "tangible",
  );
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("TZS");
  const [priceUnit, setPriceUnit] = useState("");
  const [stock, setStock] = useState("");
  const [duration, setDuration] = useState("");
  const [sku, setSku] = useState("");

  const isTangibleProduct = type === "product" && tangibility === "tangible";

  const save = useMutation({
    mutationFn: () => {
      const body: any = {
        name: name.trim(),
        offering_type: type,
        tangibility: type === "service" ? "intangible" : tangibility,
        price: toMinor(price),
        currency,
        price_unit: priceUnit.trim() || null,
        sku: sku.trim() || null,
      };
      if (isTangibleProduct) body.stock_quantity = Number(stock) || 0;
      if (type === "service" && duration)
        body.duration_minutes = Number(duration);
      return api("POST", `/containers/${containerId}/offerings`, body);
    },
    onSuccess: () => onSaved("Offering created."),
  });

  const input =
    "px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white";

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className={`${input} flex-1 min-w-[160px]`}
        />
        <input
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          placeholder="SKU (optional)"
          className={`${input} w-32`}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as any)}
          className={input}
        >
          <option value="product">Product</option>
          <option value="service">Service</option>
        </select>
        {type === "product" && (
          <select
            value={tangibility}
            onChange={(e) => setTangibility(e.target.value as any)}
            className={input}
          >
            <option value="tangible">Tangible</option>
            <option value="intangible">Intangible (digital/licence)</option>
          </select>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          type="number"
          placeholder="Price"
          className={`${input} w-28`}
        />
        <input
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          placeholder="TZS"
          className={`${input} w-20`}
        />
        <input
          value={priceUnit}
          onChange={(e) => setPriceUnit(e.target.value)}
          placeholder="per (each/hour/kg)"
          className={`${input} w-32`}
        />
        {isTangibleProduct && (
          <input
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            type="number"
            placeholder="Opening stock"
            className={`${input} w-28`}
          />
        )}
        {type === "service" && (
          <input
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            type="number"
            placeholder="Duration (min)"
            className={`${input} w-32`}
          />
        )}
      </div>

      <button
        onClick={() => save.mutate()}
        disabled={!name.trim() || save.isPending}
        className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
      >
        Create offering
      </button>
      {save.isError && (
        <span className="ml-2 text-xs text-red-600">
          {(save.error as any)?.message}
        </span>
      )}
    </div>
  );
}
