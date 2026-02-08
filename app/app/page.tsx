"use client";

import useRpcContext from "@/components/provider/rpc-provider";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import BidDialog from "@/components/dialogs/bid-dialog";
import HiwDialog from "@/components/dialogs/hiw-dialog";
import LastPoolDialog from "@/components/dialogs/last-pool-dialog";
import { useEffect, useMemo, useState } from "react";

function getMsUntilNextUtcMidnight(now = new Date()) {
  const next = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
      0
    )
  );
  return Math.max(0, next.getTime() - now.getTime());
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatHMS(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
}

export default function Home() {
  const wallet = useAnchorWallet();
  const { setVisible: setModalVisible } = useWalletModal();
  const { poolSize, userInvest } = useRpcContext();
  const [msLeft, setMsLeft] = useState(() => getMsUntilNextUtcMidnight());

  const formattedPool = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(poolSize ?? 0);

  const formattedUser = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(userInvest ?? 0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMsLeft(getMsUntilNextUtcMidnight());

    const id = setInterval(() => {
      setMsLeft(getMsUntilNextUtcMidnight());
    }, 1000);

    return () => clearInterval(id);
  }, []);

  const timer = useMemo(() => {
    const totalSeconds = Math.ceil(msLeft / 1000);
    return formatHMS(totalSeconds);
  }, [msLeft]);

  return (
    <div id={"root"} className={"flex flex-col w-full h-screen"}>
      <div
        className={
          "flex w-full justify-between items-center p-4 pb-4 -mb-14 z-10"
        }
      >
        <p className={"font-medium"}>{timer}</p>
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
        <HiwDialog />
        <LastPoolDialog />
      </div>
    </div>
  );
}
