import { useQuery } from "@tanstack/react-query";
import { bridgeClient } from "@/lib/bridge/client";

export type BridgeStatusState = "online" | "offline";

export function useBridgeStatus(): { state: BridgeStatusState; count: number } {
  const { data, isError } = useQuery({
    queryKey: ["bridge", "health"],
    queryFn: () =>
      bridgeClient.listComponents().then((r) => ({ ok: !r.error, count: r.data?.length ?? 0 })),
    refetchInterval: 15_000,
    retry: false,
  });

  if (isError || !data) return { state: "offline", count: 0 };
  if (data.ok) return { state: "online", count: data.count };
  return { state: "offline", count: 0 };
}
