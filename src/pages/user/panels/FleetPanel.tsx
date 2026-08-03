import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { logisticsApi as api } from "./logistics-api";

type Vehicle = {
  id: string;
  plate: string;
  vehicle_type: string;
  label: string | null;
  capacity_seats: number;
  capacity_weight_kg: number;
  status: string;
};
type Driver = {
  id: string;
  actor_id: string;
  display_name: string | null;
  license_class: string | null;
  availability: string;
  status: string;
  personnel_record_id: string | null;
};

/**
 * Fleet — vehicles + drivers, common to both passenger and freight. Two sub-
 * sections. Gated per-action; a driver with only self-serve sees their own record.
 */
export default function FleetPanel({
  containerId,
  permissions,
}: {
  containerId: string;
  permissions: string[];
}) {
  const can = (c: string) => permissions.includes(c);
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);

  const canVehicles = can("system.logistics.vehicle.view");
  const canAddVehicle = can("system.logistics.vehicle.create");
  const canDrivers = can("system.logistics.driver.view");
  const canAddDriver = can("system.logistics.driver.register");

  const vehicles = useQuery({
    queryKey: ["log", "vehicles", containerId],
    queryFn: () => api("GET", `/containers/${containerId}/vehicles`),
    enabled: canVehicles,
  });
  const drivers = useQuery({
    queryKey: ["log", "drivers", containerId],
    queryFn: () =>
      canDrivers
        ? api("GET", `/containers/${containerId}/drivers`)
        : api("GET", `/containers/${containerId}/drivers/me`).then(
            (d: Driver | null) => (d ? [d] : []),
          ),
  });

  const [plate, setPlate] = useState("");
  const [vtype, setVtype] = useState("bus");
  const [seats, setSeats] = useState("14");

  const addVehicle = useMutation({
    mutationFn: () =>
      api("POST", `/containers/${containerId}/vehicles`, {
        plate: plate.trim(),
        vehicle_type: vtype,
        capacity_seats: Number(seats) || 0,
      }),
    onSuccess: () => {
      setPlate("");
      setMsg("Vehicle added.");
      qc.invalidateQueries({ queryKey: ["log", "vehicles", containerId] });
    },
    onError: (e: any) => setMsg(e.message),
  });
  const retireVehicle = useMutation({
    mutationFn: (id: string) =>
      api("DELETE", `/containers/${containerId}/vehicles/${id}`),
    onSuccess: () => {
      setMsg("Vehicle retired.");
      qc.invalidateQueries({ queryKey: ["log", "vehicles", containerId] });
    },
    onError: (e: any) => setMsg(e.message),
  });

  const [dActor, setDActor] = useState("");
  const [dName, setDName] = useState("");
  const [dClass, setDClass] = useState("");

  const addDriver = useMutation({
    mutationFn: () =>
      api("POST", `/containers/${containerId}/drivers`, {
        actor_id: dActor.trim(),
        display_name: dName.trim() || undefined,
        license_class: dClass.trim() || undefined,
      }),
    onSuccess: () => {
      setDActor("");
      setDName("");
      setMsg("Driver registered.");
      qc.invalidateQueries({ queryKey: ["log", "drivers", containerId] });
    },
    onError: (e: any) => setMsg(e.message),
  });

  const vlist: Vehicle[] = Array.isArray(vehicles.data) ? vehicles.data : [];
  const dlist: Driver[] = Array.isArray(drivers.data) ? drivers.data : [];

  return (
    <div className="p-4 space-y-6">
      {msg && (
        <div className="text-xs px-3 py-2 rounded-md bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">
          {msg}
        </div>
      )}

      {canVehicles && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-black dark:text-white">
            Vehicles
          </h3>
          {canAddVehicle && (
            <div className="flex flex-wrap gap-2 items-end">
              <input
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                placeholder="Plate"
                className="px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white w-32"
              />
              <select
                value={vtype}
                onChange={(e) => setVtype(e.target.value)}
                className="px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white"
              >
                {["car", "bus", "truck", "van", "bike", "boat"].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              <input
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
                placeholder="Seats"
                type="number"
                className="px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white w-20"
              />
              <button
                onClick={() => addVehicle.mutate()}
                disabled={!plate.trim() || addVehicle.isPending}
                className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
              >
                Add vehicle
              </button>
            </div>
          )}
          <div className="border border-neutral-200 dark:border-neutral-800 rounded-md divide-y divide-neutral-100 dark:divide-neutral-900">
            {vlist.length === 0 ? (
              <div className="px-3 py-2 text-sm text-neutral-500">
                No vehicles.
              </div>
            ) : (
              vlist.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <div className="text-sm text-black dark:text-white">
                    {v.plate}{" "}
                    <span className="text-[11px] text-neutral-400">
                      {v.vehicle_type} · {v.capacity_seats} seats
                      {v.status !== "active" ? ` · ${v.status}` : ""}
                    </span>
                  </div>
                  {can("system.logistics.vehicle.retire") &&
                    v.status === "active" && (
                      <button
                        onClick={() => retireVehicle.mutate(v.id)}
                        className="px-2 py-1 text-[11px] rounded border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400"
                      >
                        Retire
                      </button>
                    )}
                </div>
              ))
            )}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-black dark:text-white">
          Drivers
        </h3>
        {canAddDriver && (
          <div className="flex flex-wrap gap-2 items-end">
            <input
              value={dActor}
              onChange={(e) => setDActor(e.target.value)}
              placeholder="Actor ID (UUID)"
              className="px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white flex-1 min-w-[200px]"
            />
            <input
              value={dName}
              onChange={(e) => setDName(e.target.value)}
              placeholder="Name"
              className="px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white w-40"
            />
            <input
              value={dClass}
              onChange={(e) => setDClass(e.target.value)}
              placeholder="License class"
              className="px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-black dark:text-white w-32"
            />
            <button
              onClick={() => addDriver.mutate()}
              disabled={!dActor.trim() || addDriver.isPending}
              className="px-4 py-2 text-xs font-semibold rounded-md bg-black text-white dark:bg-white dark:text-black disabled:opacity-40"
            >
              Register driver
            </button>
          </div>
        )}
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-md divide-y divide-neutral-100 dark:divide-neutral-900">
          {dlist.length === 0 ? (
            <div className="px-3 py-2 text-sm text-neutral-500">
              No drivers.
            </div>
          ) : (
            dlist.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between px-3 py-2"
              >
                <div className="text-sm text-black dark:text-white">
                  {d.display_name ?? d.actor_id.slice(0, 8)}
                  <span className="text-[11px] text-neutral-400">
                    {" "}
                    {d.license_class ?? "—"} · {d.availability}
                    {d.personnel_record_id ? " · HR-linked" : ""}
                  </span>
                </div>
                {can("system.logistics.driver.deactivate") &&
                  d.status === "active" && (
                    <button
                      onClick={() =>
                        api(
                          "DELETE",
                          `/containers/${containerId}/drivers/${d.id}`,
                        ).then(() =>
                          qc.invalidateQueries({
                            queryKey: ["log", "drivers", containerId],
                          }),
                        )
                      }
                      className="px-2 py-1 text-[11px] rounded border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400"
                    >
                      Deactivate
                    </button>
                  )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
