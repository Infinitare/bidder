import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useMutation } from "@tanstack/react-query";
import useRpcContext from "@/components/provider/rpc-provider";
import * as sb from "@switchboard-xyz/on-demand";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import {
  Keypair,
  PublicKey,
  Signer,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { Buffer } from "buffer";
import { useMemo, useState } from "react";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Check, Copy, Share } from "lucide-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import Image from "next/image";

export default function LastPoolDialog() {
  const {
    getPoolAddressAndDay,
    program,
    sendAndConfirmTx,
    lastPool,
    refetchLastPool,
  } = useRpcContext();
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const { setVisible: setModalVisible } = useWalletModal();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const tempWalletKp = useMemo(() => {
    // eslint-disable-next-line react-hooks/set-state-in-render
    setConfirm(false);
    return Keypair.generate();
  }, []);

  const copySecretKey = async () => {
    if (copied) return;
    await navigator.clipboard.writeText(
      "[" + tempWalletKp.secretKey.toString() + "]"
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fundTempWallet = async () => {
    const transferIx = SystemProgram.transfer({
      fromPubkey: wallet!.publicKey,
      toPubkey: tempWalletKp.publicKey,
      lamports: 100_000_000,
    });

    const transferTx = new Transaction().add(transferIx);
    await sendAndConfirmTx(transferTx);
  };

  const refundTempWallet = async () => {
    const currentBalance = await connection.getBalance(tempWalletKp.publicKey);
    if (currentBalance === 0) return;

    const transferIx = SystemProgram.transfer({
      fromPubkey: tempWalletKp.publicKey,
      toPubkey: wallet!.publicKey,
      lamports: currentBalance,
    });

    const transferTx = new Transaction().add(transferIx);
    const recentBlockhash = await connection.getLatestBlockhash();

    transferTx.recentBlockhash = recentBlockhash.blockhash;
    transferTx.feePayer = wallet?.publicKey;

    transferTx.sign(tempWalletKp);
    await sendAndConfirmTx(transferTx);
  };

  const closePool = async (
    poolPda: PublicKey,
    pagesPda: PublicKey,
    rngKp: Keypair,
    queue: sb.Queue,
    createIx: TransactionInstruction,
    randomness: sb.Randomness
  ) => {
    const createTx = await sb.asV0Tx({
      connection,
      ixs: [createIx],
      payer: tempWalletKp.publicKey,
      signers: [tempWalletKp, rngKp],
      computeUnitPrice: 75_000,
      computeUnitLimitMultiple: 1.3,
    });

    await sendAndConfirmTx(createTx, true);
    let commitIx;
    for (let i = 0; i < 10; i++) {
      try {
        commitIx = await randomness.commitIx(queue.pubkey);
      } catch (error) {
        console.error("Error creating commit instruction, retrying...", error);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    if (!commitIx) {
      throw new Error(
        "Failed to create commit instruction after multiple attempts"
      );
    }

    const closeIx = await program!.methods
      .close()
      .accounts({
        signer: tempWalletKp.publicKey,
        pool: poolPda,
        pages: pagesPda,
        randomnessAccountData: rngKp.publicKey,
      })
      .instruction();

    const closeTx = await sb.asV0Tx({
      connection,
      ixs: [commitIx, closeIx],
      payer: tempWalletKp.publicKey,
      signers: [tempWalletKp],
      computeUnitPrice: 75_000,
      computeUnitLimitMultiple: 1.3,
    });

    await sendAndConfirmTx(closeTx, true);
  };

  const selectPool = async (
    poolPda: PublicKey,
    pagesPda: PublicKey,
    rngKp: Keypair,
    randomness: sb.Randomness
  ) => {
    const revealIx = await randomness.revealIx(tempWalletKp.publicKey);

    const selectIx = await program!.methods
      .select()
      .accounts({
        signer: tempWalletKp.publicKey,
        pool: poolPda,
        pages: pagesPda,
        randomnessAccountData: rngKp.publicKey,
      })
      .instruction();

    const selectTx = await sb.asV0Tx({
      connection,
      ixs: [revealIx, selectIx],
      payer: tempWalletKp.publicKey,
      signers: [tempWalletKp],
      computeUnitPrice: 75_000,
      computeUnitLimitMultiple: 1.3,
    });

    await sendAndConfirmTx(selectTx, true);
  };

  const resolvePool = async (poolPda: PublicKey, winning_page: number) => {
    const currentPageBuffer = Buffer.alloc(8);
    currentPageBuffer.writeBigInt64LE(BigInt(winning_page));

    const [pagePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("page"), poolPda.toBuffer(), currentPageBuffer],
      program!.programId
    );

    const resolveTx = await program!.methods
      .resolve()
      .accounts({
        signer: tempWalletKp.publicKey,
        pool: poolPda,
        page: pagePda,
      })
      .transaction();

    return await sendAndConfirmTx(resolveTx, true, [tempWalletKp]);
  };

  const payoutPool = async (poolPda: PublicKey, winner: PublicKey) => {
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), poolPda.toBuffer()],
      program!.programId
    );

    const payoutTx = await program!.methods
      .payout()
      .accounts({
        signer: tempWalletKp.publicKey,
        pool: poolPda,
        vault: vaultPda,
        winner,
        fee: new PublicKey("TjgnAqExKJKAGmWKxr5sKuZE648nwvqYE8c4MQVqbdr"),
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    return await sendAndConfirmTx(payoutTx, true, [tempWalletKp]);
  };

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      let pool = lastPool;
      await fundTempWallet();
      const [poolPda] = getPoolAddressAndDay(-1);
      const [pagesPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("pages"), poolPda.toBuffer()],
        program!.programId
      );

      const rngKp = Keypair.generate();
      const queue = await sb.getDefaultQueue(connection.rpcEndpoint);
      const sbProgram = await sb.AnchorUtils.loadProgramFromConnection(
        connection
      );

      const [randomness, createIx] = await sb.Randomness.create(
        sbProgram,
        rngKp,
        queue.pubkey,
        tempWalletKp.publicKey
      );

      for (let i = 0; i < 5; i++) {
        if (!pool) throw new Error("No pool to resolve");
        if (pool.status === 4) {
          toast.success("Pool already resolved");
          return;
        }

        let status = pool.status;
        if (
          status === 1 &&
          pool.randomnessAccount.toString() !== rngKp.publicKey.toString()
        ) {
          status = 0;
        }

        switch (status) {
          case 0: {
            await closePool(
              poolPda,
              pagesPda,
              rngKp,
              queue,
              createIx,
              randomness
            );
            break;
          }
          case 1: {
            await selectPool(poolPda, pagesPda, rngKp, randomness);
            break;
          }
          case 2: {
            await resolvePool(poolPda, pool.winningPage);
            break;
          }
          case 3: {
            await payoutPool(poolPda, pool.winner);
            await refundTempWallet();
            toast.success("Pool resolved successfully");
            return;
          }
        }

        pool = (await refetchLastPool()).data;
        if (pool?.status === status) {
          throw new Error("Pool status did not update, aborting");
        }
      }
    },
    onError: async (error) => {
      toast.error("Error resolving pool. Refunding wallet.");
      console.error("Transaction failed:", error);
      await refundTempWallet();
    },
  });

  const formattedUsd = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format((lastPool?.totalEntries || 0) / 1e9);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <a
          className={
            "cursor-pointer text-sm underline-offset-4 hover:underline"
          }
        >
          Last Pool:{" "}
          {!lastPool?.status
            ? "Unknown"
            : lastPool.status === 4
            ? "Resolved"
            : "Waiting"}
        </a>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Last Pool:{" "}
            {!lastPool?.status
              ? "Unknown"
              : lastPool.status === 4
              ? "Resolved"
              : "Waiting"}
          </DialogTitle>
          {lastPool?.status !== 4 && (
            <DialogDescription>
              Click the button below to resolve the last pool. You&#39;ll need
              to sign a transaction to temporarily hold 0.1 SOL to the temporary
              wallet you see below. Please save the private key in case of an
              error. For resolving the pool, you&#39;ll receive a fee paid from
              the pool.
            </DialogDescription>
          )}
        </DialogHeader>
        <FieldGroup>
          {lastPool?.status === 4 ? (
            <Field>
              <Label htmlFor="amount">Winner</Label>
              <div>
                <Input
                  value={lastPool.winner.toString()}
                  readOnly
                  className="pr-11"
                />
                <Button
                  type="button"
                  variant={"ghost"}
                  onClick={() => {
                    window.open(
                      `https://solscan.io/account/${lastPool.winner.toString()}`,
                      "_blank"
                    );
                  }}
                  aria-label="Copy private key"
                  className={"absolute right-6 mr-0.5 mt-0.5"}
                  size={"sm"}
                  title="Copy"
                >
                  <Share className="h-4 w-4" />
                </Button>
              </div>
              <FieldDescription>Poolsize: {formattedUsd}</FieldDescription>
            </Field>
          ) : (
            <Field>
              <div>
                <Input
                  value={"[" + tempWalletKp.secretKey.toString() + "]"}
                  readOnly
                  className="pr-11"
                />
                <Button
                  type="button"
                  variant={"ghost"}
                  onClick={copySecretKey}
                  aria-label="Copy private key"
                  className={"absolute right-6 mr-0.5 mt-0.5"}
                  size={"sm"}
                  title="Copy"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Field orientation="horizontal">
                <Checkbox
                  id={"confirm"}
                  name={"confirm"}
                  checked={confirm}
                  onCheckedChange={() => setConfirm(!confirm)}
                />
                <FieldLabel htmlFor="confirm" className={"-mb-0.5"}>
                  I have saved the private key.
                </FieldLabel>
              </Field>
            </Field>
          )}
        </FieldGroup>
        {lastPool?.status !== 4 && (
          <DialogFooter>
            <Button
              disabled={isPending || !lastPool || !confirm}
              type="submit"
              onClick={() =>
                wallet
                  ? mutate()
                  : (() => {
                      setOpen(false);
                      setModalVisible(true);
                    })()
              }
            >
              {isPending && <Spinner data-icon="inline-start" />}
              {wallet
                ? lastPool
                  ? "Resolve"
                  : "No pool to resolve"
                : "Connect"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
