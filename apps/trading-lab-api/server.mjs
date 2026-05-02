import { createServer } from "node:http";
import { fetchTradingLabMarketData } from "../../packages/trading-data/index.mjs";
import { createTradingLabPolicyState } from "../../packages/trading-policy/index.mjs";
import { createSetupReview } from "../../packages/trading-validation/index.mjs";

const port = Number(process.env.TRADING_LAB_API_PORT ?? 5299);

function writeJson(response, status, payload) {
  response.writeHead(status, {
    "access-control-allow-origin": "*",
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

    if (url.pathname === "/health") {
      writeJson(response, 200, {
        ok: true,
        service: "trading-lab-api",
      });
      return;
    }

    if (url.pathname === "/market") {
      const market = await fetchTradingLabMarketData();
      const policyState = createTradingLabPolicyState();
      writeJson(response, 200, {
        ...market,
        policyState,
        setupReviews: market.rows.map((observation) => createSetupReview({ observation, policyState })),
      });
      return;
    }

    writeJson(response, 404, { error: "not_found" });
  } catch (error) {
    writeJson(response, 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Trading Lab API: http://127.0.0.1:${port}`);
});
