import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function HiwDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <a
          className={
            "cursor-pointer text-sm underline-offset-4 hover:underline"
          }
        >
          How it works
        </a>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>How it works</DialogTitle>
          <DialogDescription>
            1. Connect your wallet and click the BID button to contribute to the
            pool. <br />
            2. The more you contribute, the greater your chances of winning, but
            there is no guarantee and you may lose your contribution. <br />
            3. At the end of the day (UTC), one winner will be randomly
            selected. Everyone can trigger the draw by clicking on the Last Pool
            Label at the bottom.
            <br />
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
