import { useEffect, useRef } from "react";

import { RealtimeChannel } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { getRealtimeQueryKeys } from "@/integrations/supabase/queryKeys";

interface UseRealtimeRefreshOptions {
  channelName?: string;
  enabled?: boolean;
  onRefresh?: () => void | Promise<void>;
  table?: string;
}

export function useRealtimeRefresh({
  channelName,
  enabled = true,
  onRefresh,
  table,
}: UseRealtimeRefreshOptions = {}) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onRefreshRef = useRef(onRefresh);

  /*
    Stable unique ID per hook instance.
    Prevents channel name collisions when multiple
    components subscribe to the same table.
  */
  const instanceId = useRef(
    `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled || !table) {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    /*
      Always unique: custom name gets instance suffix,
      so two components using the same channelName
      never share a Supabase channel object.
    */
    const realtimeChannelName = `${channelName || table}-${instanceId.current}`;

    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(realtimeChannelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
        },
        async (payload) => {
          console.debug("[Realtime Event]", realtimeChannelName, payload);

          try {
            if (onRefreshRef.current) {
              await onRefreshRef.current();
              return;
            }

            const keys = getRealtimeQueryKeys(table);

            await Promise.all(
              keys.map((queryKey) =>
                queryClient.invalidateQueries({ queryKey }),
              ),
            );
          } catch (error) {
            console.error("[Realtime Refresh Error]", error);
          }
        },
      )
      .subscribe((status) => {
        console.debug("[Realtime Status]", realtimeChannelName, status);
      });

    channelRef.current = channel;

    return () => {
      console.debug("[Realtime Cleanup]", realtimeChannelName);
      void supabase.removeChannel(channel);

      if (channelRef.current === channel) {
        channelRef.current = null;
      }
    };
  }, [enabled, table, channelName, queryClient]);

  return {};
}

export default useRealtimeRefresh;
