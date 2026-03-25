import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Signal, Status } from "../backend.d";
import { useActor } from "./useActor";

export function useGetAllSignals() {
  const { actor, isFetching } = useActor();
  return useQuery<Signal[]>({
    queryKey: ["signals"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllSignals();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
  });
}

export function useAddSignal() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (signal: Signal) => {
      if (!actor) throw new Error("No actor");
      return actor.addSignal(signal);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["signals"] }),
  });
}

export function useUpdateSignalStatus() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: bigint; status: Status }) => {
      if (!actor) throw new Error("No actor");
      return actor.updateSignalStatus(id, status);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["signals"] }),
  });
}
