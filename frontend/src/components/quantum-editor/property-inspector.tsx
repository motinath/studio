import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trash2, Plug } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  componentMetadataQueryOptions,
  componentPinsQueryOptions,
} from "@/lib/bridge/queries";
import { useWorkspace } from "@/lib/editor/workspace-store";
import { metadataToFields } from "@/lib/bridge/adapters";
import type { Placement, Connection } from "@/lib/bridge/types";

export function PropertyInspector() {
  const { activeTab, dispatchActive: dispatch } = useWorkspace(); const state = activeTab.state;
  const sel = state.selection;

  if (!sel) {
    return (
      <EmptyState text="Select a placement or connection to inspect its properties." />
    );
  }
  if (sel.kind === "placement") {
    const placement = state.placements.find((p) => p.id === sel.id);
    if (!placement) return <EmptyState text="Placement no longer exists." />;
    return <PlacementInspector placement={placement} />;
  }
  const conn = state.connections.find((c) => c.id === sel.id);
  if (!conn) return <EmptyState text="Connection no longer exists." />;
  return <ConnectionInspector connection={conn} />;
}

function PlacementInspector({ placement }: { placement: Placement }) {
  const { activeTab, dispatchActive: dispatch } = useWorkspace(); const state = activeTab.state;
  const metaQ = useQuery(componentMetadataQueryOptions(placement.componentId));
  const pinsQ = useQuery(componentPinsQueryOptions(placement.componentId));

  const fields = useMemo(
    () => (metaQ.data ? metadataToFields(metaQ.data) : []),
    [metaQ.data],
  );

  const update = (patch: Partial<Placement>) =>
    dispatch({ type: "UPDATE_PLACEMENT", id: placement.id, patch });
  const updateParam = (k: string, v: string) =>
    update({ params: { ...placement.params, [k]: v } });

  const connectedPins = new Set(
    state.connections
      .filter(
        (c) => c.from.placementId === placement.id || c.to.placementId === placement.id,
      )
      .flatMap((c) => [
        c.from.placementId === placement.id ? c.from.pinName : null,
        c.to.placementId === placement.id ? c.to.pinName : null,
      ])
      .filter((x): x is string => x !== null),
  );

  return (
    <div className="flex flex-col gap-3 text-xs min-w-[190px]">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Placement
          </p>
          <p className="text-sm font-bold text-foreground">{placement.name}</p>
          <p className="text-[10px] text-muted-foreground">{placement.componentId}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => dispatch({ type: "DELETE_PLACEMENT", id: placement.id })}
          className="h-7 gap-1 px-2 text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3 w-3" /> Delete
        </Button>
      </div>

      <Section title="Position">
        <Field label="Name">
          <Input
            value={placement.name}
            onChange={(e) => update({ name: e.target.value })}
            className="h-7 text-[11px]"
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="x (mm)">
            <Input
              type="number"
              step="0.05"
              value={placement.x}
              onChange={(e) => update({ x: parseFloat(e.target.value) || 0 })}
              className="h-7 text-[11px]"
            />
          </Field>
          <Field label="y (mm)">
            <Input
              type="number"
              step="0.05"
              value={placement.y}
              onChange={(e) => update({ y: parseFloat(e.target.value) || 0 })}
              className="h-7 text-[11px]"
            />
          </Field>
        </div>
        <Field label="Rotation (deg)">
          <Select
            value={String(placement.rotation)}
            onValueChange={(v) => update({ rotation: parseInt(v, 10) })}
          >
            <SelectTrigger className="h-7 text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0, 90, 180, 270].map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d}°
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </Section>

      <Section title="Parameters (from bridge)">
        {metaQ.isLoading && <p className="text-muted-foreground">Loading metadata…</p>}
        {metaQ.error && (
          <p className="text-destructive">Bridge error: {String(metaQ.error)}</p>
        )}
        {fields.length === 0 && !metaQ.isLoading && !metaQ.error && (
          <p className="text-muted-foreground">No parameters declared.</p>
        )}
        {fields.map((f) => {
          const current = String(placement.params[f.name] ?? f.defaultValue);
          return (
            <Field key={f.name} label={`${f.label}${f.unit ? ` (${f.unit})` : ""}`}>
              {f.kind === "enum" && f.options ? (
                <Select value={current} onValueChange={(v) => updateParam(f.name, v)}>
                  <SelectTrigger className="h-7 text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {f.options.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : f.kind === "bool" ? (
                <Switch
                  checked={current === "true"}
                  onCheckedChange={(v) => updateParam(f.name, v ? "true" : "false")}
                />
              ) : (
                <Input
                  value={current}
                  onChange={(e) => updateParam(f.name, e.target.value)}
                  className="h-7 font-mono text-[11px]"
                />
              )}
              {f.description && (
                <span className="text-[10px] text-muted-foreground">{f.description}</span>
              )}
            </Field>
          );
        })}
      </Section>

      <Section title="Pins">
        {pinsQ.isLoading && <p className="text-muted-foreground">Loading pins…</p>}
        {pinsQ.error && (
          <p className="text-destructive">Bridge error: {String(pinsQ.error)}</p>
        )}
        {pinsQ.data && pinsQ.data.pins.length === 0 && (
          <p className="text-muted-foreground">No pins defined.</p>
        )}
        {pinsQ.data && pinsQ.data.pins.length > 0 && (
          <table className="w-full text-[10px]">
            <thead className="text-muted-foreground">
              <tr>
                <th className="px-1 py-1 text-left">Pin</th>
                <th className="px-1 py-1 text-left">Dir</th>
                <th className="px-1 py-1 text-right">Net</th>
              </tr>
            </thead>
            <tbody>
              {pinsQ.data.pins.map((p) => (
                <tr key={p.name} className="border-t border-border">
                  <td className="px-1 py-1 font-semibold">{p.name}</td>
                  <td className="px-1 py-1 uppercase text-muted-foreground">{p.direction}</td>
                  <td className="px-1 py-1 text-right">
                    {connectedPins.has(p.name) ? (
                      <span className="inline-flex items-center gap-1 text-primary">
                        <Plug className="h-3 w-3" /> connected
                      </span>
                    ) : (
                      <span className="text-muted-foreground">open</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}

function ConnectionInspector({ connection }: { connection: Connection }) {
  const { activeTab, dispatchActive: dispatch } = useWorkspace(); const state = activeTab.state;
  const fromP = state.placements.find((p) => p.id === connection.from.placementId);
  const toP = state.placements.find((p) => p.id === connection.to.placementId);
  // Pull supported route components from the originating placement's metadata.
  const metaQ = useQuery(componentMetadataQueryOptions(fromP?.componentId ?? ""));
  const routeOptions = metaQ.data?.supportedRouteComponents ?? [];

  return (
    <div className="flex flex-col gap-3 text-xs min-w-[190px]">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Connection
          </p>
          <p className="text-sm font-bold text-foreground">
            {fromP?.name ?? "?"}.{connection.from.pinName}
            <span className="mx-1 text-muted-foreground">→</span>
            {toP?.name ?? "?"}.{connection.to.pinName}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => dispatch({ type: "DELETE_CONNECTION", id: connection.id })}
          className="h-7 gap-1 px-2 text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3 w-3" /> Delete
        </Button>
      </div>

      <Section title="Route component">
        {routeOptions.length === 0 ? (
          <Input
            value={connection.routeComponentId ?? ""}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_CONNECTION",
                id: connection.id,
                patch: { routeComponentId: e.target.value || undefined },
              })
            }
            placeholder="e.g. RouteMeander"
            className="h-7 font-mono text-[11px]"
          />
        ) : (
          <Select
            value={connection.routeComponentId ?? ""}
            onValueChange={(v) =>
              dispatch({
                type: "UPDATE_CONNECTION",
                id: connection.id,
                patch: { routeComponentId: v },
              })
            }
          >
            <SelectTrigger className="h-7 text-[11px]">
              <SelectValue placeholder="Choose route component" />
            </SelectTrigger>
            <SelectContent>
              {routeOptions.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <p className="text-[10px] text-muted-foreground">
          Bridge will instantiate this QComponent to generate the route geometry.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      <div className="border-b border-border bg-muted/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground">
        {title}
      </div>
      <div className="flex flex-col gap-2 p-2">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
      {text}
    </div>
  );
}
