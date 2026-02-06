"use client";

import { createContext, ReactNode, useContext, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AnchorWallet,
  useAnchorWallet,
  useConnection,
} from "@solana/wallet-adapter-react";
import { AnchorProvider, Idl, Program, setProvider } from "@anchor-lang/core";
import { Bidder } from "../../../target/types/bidder";
import idl from "../../../target/idl/bidder.json";
import { PublicKey } from "@solana/web3.js";
import { Buffer } from "buffer";

interface RpcContext {
  getPoolAddressAndDay: () => [PublicKey, number];
  solPrice?: number;
  program?: Program<Idl>;

  poolSize?: number;
  userInvest?: number;
}

const RpcContext = createContext<RpcContext | null>(null);

export function RpcProvider({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const getPoolAddressAndDay = (): [PublicKey, number] => {
    const unixTimestamp = Math.floor(Date.now() / 1000);
    const dayId = Math.floor(unixTimestamp / 86400);

    const dayIdBuffer = Buffer.alloc(8);
    dayIdBuffer.writeBigInt64LE(BigInt(dayId));

    return [
      PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), dayIdBuffer],
        program.programId
      )[0],
      dayId,
    ];
  };

  const program = useMemo(() => {
    const provider = new AnchorProvider(connection, wallet as AnchorWallet, {});
    setProvider(provider);

    return new Program(idl as Bidder, {
      connection,
    });
  }, [connection, wallet]);

  const { data: solPrice } = useQuery({
    queryKey: ["solPrice"],
    queryFn: async () => {
      const res = await fetch("/api/sol-price", { cache: "no-store" });
      const { priceUsd } = await res.json();
      return priceUsd as number;
    },
  });

  const { data: poolSize } = useQuery({
    queryKey: ["poolSize"],
    enabled: !!solPrice,
    refetchInterval: 30000,
    queryFn: async () => {
      const lamports = await connection.getBalance(getPoolAddressAndDay()[0]);
      const sol = lamports / 1e9;
      return sol * solPrice!;
    },
  });

  const { data: userInvest } = useQuery({
    queryKey: ["userInvest", wallet?.publicKey.toBase58()],
    enabled: !!solPrice && !!wallet,
    refetchInterval: 60000,
    queryFn: async () => {
      const user = PublicKey.findProgramAddressSync(
        [
          Buffer.from("user"),
          getPoolAddressAndDay()[0].toBuffer(),
          wallet!.publicKey.toBuffer(),
        ],
        program.programId
      )[0];

      // @ts-ignore
      const data = await program.account.user.fetchNullable(user);
      const lamports = data?.entries || 0;
      const sol = lamports / 1e9;
      return sol * solPrice!;
    },
  });

  return (
    <RpcContext.Provider
      value={{
        getPoolAddressAndDay,
        program,

        solPrice,
        poolSize,
        userInvest,
      }}
    >
      {children}
    </RpcContext.Provider>
  );
}

export default function useRpcContext(): RpcContext {
  let context = useContext(RpcContext);
  if (!context) {
    throw new Error("useRpcContext must be used within a RpcProvider");
  }

  return context;
}
