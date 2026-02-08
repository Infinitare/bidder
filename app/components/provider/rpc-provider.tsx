"use client";

import { createContext, ReactNode, useContext, useMemo } from "react";
import { QueryObserverResult, useQuery } from "@tanstack/react-query";
import {
  AnchorWallet,
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { AnchorProvider, Idl, Program, setProvider } from "@anchor-lang/core";
import { Bidder } from "../../../target/types/bidder";
import idl from "../../../target/idl/bidder.json";
import {
  PublicKey,
  Signer,
  Transaction,
  TransactionConfirmationStrategy,
  VersionedTransaction,
} from "@solana/web3.js";
import { Buffer } from "buffer";

interface RpcContext {
  getPoolAddressAndDay: (offset?: number) => [PublicKey, number];
  solPrice?: number;
  program?: Program<Idl>;

  poolSize?: number;
  userInvest?: number;
  lastPool?: Pool | null;
  refetchLastPool: () => Promise<QueryObserverResult<Pool | null, Error>>;
  refetchPoolSize: () => Promise<
    QueryObserverResult<number | undefined, Error>
  >;
  refetchUserInvest: () => Promise<
    QueryObserverResult<number | undefined, Error>
  >;
  sendAndConfirmTx: (
    tx: Transaction | VersionedTransaction,
    skipSigning?: boolean,
    signer?: Array<Signer>
  ) => Promise<string>;
}

export interface Pool {
  status: number;
  totalEntries: number;
  currentPage: number;
  dayId: number;
  closeSlot: number;
  randomnessAccount: PublicKey;
  winningEntry: number;
  winningPage: number;
  winner: PublicKey;
}

const RpcContext = createContext<RpcContext | null>(null);

export function RpcProvider({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const { sendTransaction } = useWallet();
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  const program = useMemo(() => {
    const provider = new AnchorProvider(connection, wallet as AnchorWallet, {});
    setProvider(provider);

    return new Program(idl as Bidder, {
      connection,
    });
  }, [connection, wallet]);

  const getPoolAddressAndDay = (offset?: number): [PublicKey, number] => {
    const now = new Date().getTime() / 1000;
    const unixTimestamp = Math.floor(now);
    const dayId = Math.floor(unixTimestamp / 86400) + (offset || 0);

    const dayIdBuffer = Buffer.alloc(8);
    dayIdBuffer.writeBigInt64LE(BigInt(dayId));

    return [
      PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), dayIdBuffer],
        program!.programId
      )[0],
      dayId,
    ];
  };

  const { data: solPrice } = useQuery({
    queryKey: ["solPrice"],
    queryFn: async () => {
      const res = await fetch("/api/sol-price", { cache: "no-store" });
      const { priceUsd } = await res.json();
      return priceUsd as number;
    },
  });

  const { data: poolSize, refetch: refetchPoolSize } = useQuery({
    queryKey: ["poolSize"],
    enabled: !!solPrice,
    refetchInterval: 30000,
    queryFn: async () => {
      const [poolPda] = getPoolAddressAndDay();
      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), poolPda.toBuffer()],
        program!.programId
      );

      const lamports = await connection.getBalance(vaultPda);
      const sol = lamports / 1e9;
      return sol * solPrice!;
    },
  });

  const { data: userInvest, refetch: refetchUserInvest } = useQuery({
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
        program!.programId
      )[0];

      // @ts-expect-error user account is not typed
      const data = await program.account.user.fetchNullable(user);
      const lamports = data?.entries || 0;
      const sol = lamports / 1e9;
      return sol * solPrice!;
    },
  });

  const { data: lastPool, refetch: refetchLastPool } = useQuery({
    queryKey: ["lastPool"],
    queryFn: async () => {
      const [poolAddress] = getPoolAddressAndDay(-1);
      // @ts-expect-error pool account is not typed
      const poolAccount: Pool | null = await program.account.pool.fetchNullable(
        poolAddress
      );

      return poolAccount;
    },
  });

  const sendAndConfirmTx = async (
    tx: Transaction | VersionedTransaction,
    skipSigning?: boolean,
    signer?: Array<Signer>
  ): Promise<string> => {
    let txSig;
    if (skipSigning) {
      if ("message" in tx) {
        txSig = await connection.sendTransaction(tx, {
          skipPreflight: true,
          maxRetries: 0,
        });
      } else {
        txSig = await connection.sendTransaction(tx, signer || [], {
          skipPreflight: true,
          maxRetries: 0,
        });
      }
    } else {
      txSig = await sendTransaction(tx, connection);
    }

    const confirmation = await connection.confirmTransaction(
      {
        signature: txSig,
      } as TransactionConfirmationStrategy,
      connection.commitment
    );

    if (confirmation.value.err) {
      throw new Error(
        `Transaction failed: ${confirmation.value.err.toString()}`
      );
    }

    return txSig;
  };

  return (
    <RpcContext.Provider
      value={{
        getPoolAddressAndDay,
        program: program!,

        solPrice,
        poolSize,
        userInvest,

        lastPool,
        refetchLastPool,
        refetchPoolSize,
        refetchUserInvest,
        sendAndConfirmTx,
      }}
    >
      {children}
    </RpcContext.Provider>
  );
}

export default function useRpcContext(): RpcContext {
  const context = useContext(RpcContext);
  if (!context) {
    throw new Error("useRpcContext must be used within a RpcProvider");
  }

  return context;
}
