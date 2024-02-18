import {
  BackpackClient,
  ExecuteOrderRequest,
  MarketsResponse,
} from "@cks-systems/backpack-client";
import { config } from "dotenv";
const env = config().parsed!;
const apiKey = env.publicKey;
const privateKeyBase64 = env.privateKey;
const client = new BackpackClient(privateKeyBase64, apiKey);

async function trade(
  base = "SOL",
  quote = "USDC",
  market: MarketsResponse[number]
) {
  const result = await client.Balance();
  const quoteBalance = result[quote].available;
  const baseBalance = result[base].available;
  const depths = await client.Depth({
    symbol: `${base}_${quote}`,
  });

  // 获取最佳买卖价格
  const bid1 = depths.bids[0][0]; // 买一价
  const ask1 = depths.asks[0][0]; // 卖一价

  // 市场配置
  const { minQuantity, stepSize } = market.filters.quantity;
  const { minPrice } = market.filters.price;

  console.log(`Balance: ${baseBalance} ${base}`);
  console.log(`Balance: ${quoteBalance} ${quote}`);

  if (baseBalance > minQuantity) {
    // 全仓卖出，以买一价执行
    console.log("try sell at bid price", bid1);
    const sellQuantity = Math.floor(baseBalance / stepSize) * stepSize; // 确保交易量符合市场规则
    const params: ExecuteOrderRequest = {
      orderType: "Limit",
      price: bid1,
      quantity: sellQuantity,
      side: "Ask",
      symbol: `${base}_${quote}`,
      timeInForce: "IOC",
    };
    await execOrder(base, quote, market, params);
  }

  if (quoteBalance > minPrice * minQuantity) {
    // 全仓买入，计算可买入最大数量
    console.log("try buy at ask price", ask1);
    const buyQuantity = Math.floor(quoteBalance / ask1 / stepSize) * stepSize; // 确保交易量符合市场规则
    const params: ExecuteOrderRequest = {
      orderType: "Limit",
      price: ask1,
      quantity: buyQuantity,
      side: "Bid",
      symbol: `${base}_${quote}`,
      timeInForce: "IOC",
    };
    await execOrder(base, quote, market, params);
  }
}

async function execOrder(
  base: string,
  quote: string,
  market: MarketsResponse[number],
  params: ExecuteOrderRequest
) {
  const newOrder = await placeOrder(params);
  console.log("new orderId: ", newOrder);
  await sleep(1000);

  trade(base, quote, market);
}

async function placeOrder(params: ExecuteOrderRequest) {
  try {
    return await client.ExecuteOrder(params);
  } catch (error: any) {
    console.log("place order error", error.message);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function start(base: string, quote: string) {
  const markets = await client.Markets();
  const market = markets.find((m) => m.symbol === `${base}_${quote}`)!;

  trade(base, quote, market);
}

start("SOL", "USDC");
