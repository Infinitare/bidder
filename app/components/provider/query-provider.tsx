"use client";

import { ReactNode } from "react";
import { QueryCache, QueryClientProvider } from "@tanstack/react-query";
import { QueryClient } from "@tanstack/query-core";

// TODO toasts
const queryCache = new QueryCache({
  onError: (error) => {
    console.log(error);
  },
  onSuccess: (data) => {
    // console.log(data);
  },
  onSettled: (data, error) => {
    // console.log(data, error);
  },
});

const queryClient = new QueryClient({
  queryCache,
});

export default function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
