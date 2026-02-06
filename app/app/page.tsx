"use client";

import useRpcContext from "@/components/provider/rpc-provider";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import BidDialog from "@/components/dialogs/bid-dialog";

export default function Home() {
  const wallet = useAnchorWallet();
  const { setVisible: setModalVisible } = useWalletModal();
  const { poolSize, userInvest } = useRpcContext();

  let formattedPool = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(poolSize ?? 0);

  let formattedUser = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(userInvest ?? 0);

  return (
    <div id={"root"} className={"flex flex-col w-full h-screen"}>
      <div
        className={"flex w-full justify-end items-center p-4 pb-4 -mb-14 z-10"}
      >
        {wallet ? (
          <BidDialog />
        ) : (
          <Button
            size={"lg"}
            variant={"outline"}
            onClick={() => setModalVisible(true)}
          >
            Connect
          </Button>
        )}
      </div>
      <div
        className={
          "flex flex-col w-full h-full justify-center items-center gap-4 sm:gap-0"
        }
      >
        <h1 className={"text-[clamp(32px,12vw,92px)] font-space font-semibold"}>
          {formattedPool}
        </h1>
        <p
          className={
            "-mt-2 px-4 text-center text-lg font-medium text-muted-foreground"
          }
        >
          You contributed {formattedUser} to this pool.
        </p>
      </div>
      <div
        className={
          "flex w-full justify-center py-2 sm:flex-row flex-col sm:gap-6 gap-2 sm:items-center items-start sm:pl-0 pl-4 sm:pb-2 pb-4"
        }
      >
        <a
          className={"text-sm underline-offset-4 hover:underline"}
          href={"https://github.com/Infinitare/bidder"}
          target={"_blank"}
        >
          Protocol
        </a>
        <a className={"text-sm underline-offset-4 hover:underline"} href={"#"}>
          How it works
        </a>
        <a className={"text-sm underline-offset-4 hover:underline"} href={"#"}>
          Last Pool: Unknown
        </a>
      </div>
    </div>
  );
}
