import { Router } from "express";
import { ethers } from "ethers";

const router = Router();

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.FAUCET_PRIVATE_KEY!, provider);

const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS!;
const FAUCET_AMOUNT = ethers.parseUnits(
  process.env.FAUCET_AMOUNT || "10",
  18
);

const tokenAbi = [
  "function transfer(address to, uint256 value) public returns (bool)"
];
const token = new ethers.Contract(TOKEN_ADDRESS, tokenAbi, wallet);

const walletCooldown = new Map<string, number>();
const ipCooldown = new Map<string, number>();
const COOLDOWN_MS =
  Number(process.env.FAUCET_COOLDOWN_MS) || 24 * 60 * 60 * 1000; // default 24h

const DEV_BYPASS_WALLET =
  process.env.FAUCET_DEV_BYPASS_WALLET?.toLowerCase();

function remainingMs(last: number) {
  return Math.max(0, COOLDOWN_MS - (Date.now() - last));
}

router.post("/", async (req, res) => {
  const { address } = req.body ?? {};
  const forwarded = req.headers["x-forwarded-for"];
  const ip =
    (Array.isArray(forwarded)
      ? forwarded[0]
      : typeof forwarded === "string"
      ? forwarded.split(",")[0].trim()
      : req.ip) || "unknown";

  if (!address) {
    return res.status(400).json({ error: "Missing address" });
  }

  if (!ethers.isAddress(address)) {
    return res.status(400).json({ error: "Invalid address" });
  }

  const addr = address.toLowerCase();

  const isDevBypass =
    DEV_BYPASS_WALLET && addr === DEV_BYPASS_WALLET;

  if (!isDevBypass) {
    if (walletCooldown.has(addr)) {
      const last = walletCooldown.get(addr)!;
      const remain = remainingMs(last);
      if (remain > 0) {
        return res.status(429).json({
          error: "Cooldown active",
          remainingMs: remain,
        });
      }
    }

    if (ipCooldown.has(ip as string)) {
      const last = ipCooldown.get(ip as string)!;
      const remain = remainingMs(last);
      if (remain > 0) {
        return res.status(429).json({
          error: "IP cooldown active",
          remainingMs: remain,
        });
      }
    }
  }

  try {
    const tx = await token.transfer(addr, FAUCET_AMOUNT);
    await tx.wait();

    walletCooldown.set(addr, Date.now());
    ipCooldown.set(ip as string, Date.now());

    return res.json({ success: true, hash: tx.hash });
  } catch (err: any) {
    console.error(err);
    return res
      .status(500)
      .json({ error: "Faucet failed", details: err?.message });
  }
});

export default router;
