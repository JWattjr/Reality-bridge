"use client";

import React, { useEffect } from "react";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { getBackendUrl } from "@/lib/utils";
import { useSocketStore } from "@/store/useSocketStore";

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const setSocket = useSocketStore((state) => state.setSocket);

  useEffect(() => {
    const socketUrl = getBackendUrl();
    const socketInstance = io(socketUrl, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });

    socketInstance.on("connect", () => {
      console.log("Connected to WebSocket server");
      setSocket(socketInstance);
    });

    socketInstance.on("predictionUpdated", (prediction) => {
      console.log("WebSocket event: predictionUpdated", prediction);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["walletBalance"] });
      queryClient.invalidateQueries({ queryKey: ["predictions"] });
      queryClient.invalidateQueries({ queryKey: ["games"] });
      queryClient.invalidateQueries({ queryKey: ["gameDetails"] });
      queryClient.invalidateQueries({ queryKey: ["gameMarkets"] });
    });

    socketInstance.on("profileUpdated", (profile) => {
      console.log("WebSocket event: profileUpdated", profile);
      if (profile?.userId) {
        queryClient.invalidateQueries({ queryKey: ["profile", profile.userId] });
      }
    });

    socketInstance.on("disconnect", () => {
      console.log("Disconnected from WebSocket server");
      setSocket(null);
    });

    return () => {
      socketInstance.disconnect();
      setSocket(null);
    };
  }, [queryClient, setSocket]);

  return <>{children}</>;
}
