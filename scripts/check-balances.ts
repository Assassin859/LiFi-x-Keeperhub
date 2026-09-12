import { Contract, JsonRpcProvider, formatEther, formatUnits } from "ethers";

const addr = "0xc63a364f8bbaa6be263f577762e7c180a68b9fac";
const usdc = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const provider = new JsonRpcProvider("https://mainnet.base.org");

async function main() {
  const eth = await provider.getBalance(addr);
  const erc20 = new Contract(
    usdc,
    [
      "function balanceOf(address) view returns (uint256)",
      "function decimals() view returns (uint8)",
    ],
    provider,
  );
  const bal = (await erc20.balanceOf(addr)) as bigint;
  const dec = Number(await erc20.decimals());
  console.log(
    JSON.stringify(
      {
        address: addr,
        eth: formatEther(eth),
        usdc: formatUnits(bal, dec),
        usdcRaw: bal.toString(),
        enoughForDemoUsdc: bal >= 1_000_000n,
        hasGas: eth > 0n,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
