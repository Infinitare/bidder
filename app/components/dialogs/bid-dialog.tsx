import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { Checkbox } from "@/components/ui/checkbox";
import { ChangeEvent, useState } from "react";
import useRpcContext from "@/components/provider/rpc-provider";
import { useWalletDisconnectButton } from "@solana/wallet-adapter-base-ui";
import { useMutation } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Buffer } from "buffer";
import BN from "bn.js";
import { toast } from "sonner";

export default function BidDialog() {
  const wallet = useAnchorWallet();
  const { onButtonClick } = useWalletDisconnectButton();
  const {
    program,
    solPrice,
    getPoolAddressAndDay,
    sendAndConfirmTx,
    refetchPoolSize,
    refetchUserInvest,
  } = useRpcContext();

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [amountNumber, setAmountNumber] = useState(0);
  const [confirm, setConfirm] = useState(false);

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replaceAll("e", "");
    if (value.includes("-")) return;

    setAmount(value);
    const numberValue = parseFloat(value);
    if (!isNaN(numberValue)) {
      setAmountNumber(numberValue);
    } else {
      setAmountNumber(0);
    }
  };

  const formattedUsd = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amountNumber * solPrice! || 0);

  const disconnectWallet = () => {
    onButtonClick?.();
  };

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (!program) throw new Error("Program not initialized");
      if (!wallet) throw new Error("Wallet not connected");

      const signer = wallet.publicKey;
      const [poolPda, dayId] = getPoolAddressAndDay();

      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), poolPda.toBuffer()],
        program.programId
      );

      const [pagesPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("pages"), poolPda.toBuffer()],
        program.programId
      );

      const [userPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), poolPda.toBuffer(), signer.toBuffer()],
        program.programId
      );

      const poolAccount: { currentPage: number } | null =
        // @ts-expect-error pool account is not typed
        await program.account.pool.fetchNullable(poolPda);
      const currentPage = poolAccount?.currentPage || 0;

      const currentPageBuffer = Buffer.alloc(8);
      currentPageBuffer.writeBigInt64LE(BigInt(currentPage));

      const [pagePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("page"), poolPda.toBuffer(), currentPageBuffer],
        program.programId
      );

      const amountBN = new BN(amountNumber * 1e9);
      const dayIdBN = new BN(dayId);
      const tx = await program.methods
        .entry(amountBN, dayIdBN)
        .accounts({
          signer,
          pool: poolPda,
          vault: vaultPda,
          pages: pagesPda,
          page: pagePda,
          user: userPda,
          systemProgram: SystemProgram.programId,
        })
        .transaction();

      const txSig = await sendAndConfirmTx(tx);
      await Promise.any([refetchPoolSize(), refetchUserInvest()]);
      toast.success("Transaction confirmed! " + txSig, {
        description: (
          <div>
            Your bid has been successfully placed.
            <a
              className={"text-sm underline-offset-4 hover:underline"}
              href={"https://solscan.io/tx/" + txSig}
              target={"_blank"}
            >
              View on Solscan
            </a>
          </div>
        ),
      });
      setOpen(false);
    },
    onError: (error) => {
      toast.error("Transaction failed: " + error.message);
      console.error("Transaction failed:", error);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={"lg"} variant={"outline"}>
          BID
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Contribute to the Pool?</DialogTitle>
          <DialogDescription>
            The more you contribute, the greater your chances of winning, but
            there is no guarantee and you may lose your contribution.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup className={"mt-5"}>
          <Field>
            <Label htmlFor="amount">
              <Image
                className={"dark:invert"}
                src={"solana-black.svg"}
                alt={"SOL"}
                width={18}
                height={18}
              />
              Amount
            </Label>
            <Input
              autoComplete={"off"}
              id="amount"
              name="amount"
              placeholder={"0.00"}
              type={"number"}
              value={amount}
              onChange={handleAmountChange}
            />
            <FieldDescription>
              Contribution amount: {formattedUsd}
            </FieldDescription>
          </Field>
          <Field orientation="horizontal">
            <Checkbox
              id={"confirm"}
              name={"confirm"}
              checked={confirm}
              onCheckedChange={() => setConfirm(!confirm)}
            />
            <FieldLabel htmlFor="confirm" className={"-mb-0.5"}>
              I understand that this is irreversible.
            </FieldLabel>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={disconnectWallet}>
              Disconnect Wallet
            </Button>
          </DialogClose>
          <Button
            disabled={!confirm || isPending}
            type="submit"
            onClick={() => mutate()}
          >
            {isPending && <Spinner data-icon="inline-start" />}
            BID
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
