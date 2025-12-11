import { Router } from "express";
import { ethers } from "ethers";

const router = Router();

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const faucetWallet = new ethers.Wallet(process.env.FAUCET_PRIVATE_KEY!, provider);

const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS!;
const FAUCET_AMOUNT = ethers.parseUnits(process.env.FAUCET_AMOUNT || "10", 18);

const abi = ["function transfer(address to, uint256 value) public returns (bool)"];
const token = new ethers.Contract(TOKEN_ADDRESS, abi, faucetWallet);

const rateLimit = new Map<string, number>();

router.post("/", async (req, res) => {
  const { address } = req.body;

  if (!address) return res.status(400).json({ error: "Missing address" });

  const now = Date.now();
  const last = rateLimit.get(address);

  if (last && now - last < 24 * 60 * 60 * 1000) {
    return res.status(429).json({ error: "Come back in 24 hours" });
  }

  try {
    const tx = await token.transfer(address, FAUCET_AMOUNT);
    await tx.wait();

    rateLimit.set(address, now);

    return res.json({ success: true, hash: tx.hash });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Faucet failed" });
  }
});

export default router;
