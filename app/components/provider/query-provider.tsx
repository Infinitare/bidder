"use client";

import { ReactNode, useMemo } from "react";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { toast } from "sonner";

const queryCache = new QueryCache({
  onError: (error) => {
    toast.error(error?.message || "Something went wrong");
  },
});

const queryClient = new QueryClient({
  queryCache,
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24,
    },
  },
});

export default function QueryProvider({ children }: { children: ReactNode }) {
  const persister = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return createAsyncStoragePersister({
      storage: window.localStorage,
    });
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: persister! }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
