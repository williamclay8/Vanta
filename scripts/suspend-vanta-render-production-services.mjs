const apply = process.argv.includes("--apply");

const services = [
  { id: "srv-d7jfqru7r5hc73b6oelg", name: "vanta-prod-private-pool-v2-indexer" },
  { id: "srv-d7jg4arbc2fs73c1449g", name: "vanta-prod-private-pool-v2-prover" },
  { id: "srv-d7jg9jrbc2fs73c161gg", name: "vanta-prod-private-pool-v2-relayer" },
  { id: "srv-d7jgf7n7f7vs73ebdu40", name: "vanta-prod-private-pool-v2-verifier" },
  { id: "srv-d7jgl3d8nd3s73a9efng", name: "vanta-prod-private-pool-v2-operator" },
];

function requireRenderApiKey() {
  const token = process.env.RENDER_API_KEY;

  if (!token) {
    throw new Error("RENDER_API_KEY is required when using --apply.");
  }

  return token;
}

async function suspendService({ id, name }, token) {
  const response = await fetch(`https://api.render.com/v1/services/${id}/suspend`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    method: "POST",
  });

  if (response.status === 202) {
    return { id, name, status: "suspend_requested" };
  }

  let detail = "";
  try {
    detail = await response.text();
  } catch {
    detail = "";
  }

  throw new Error(`${name} (${id}) suspend failed with HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
}

if (!apply) {
  console.log("Vanta production Render suspend dry run");
  console.log("No services were changed. Re-run with --apply and RENDER_API_KEY to suspend.");
  for (const service of services) {
    console.log(`- ${service.name} (${service.id})`);
  }
  process.exit(0);
}

const token = requireRenderApiKey();
const results = [];

for (const service of services) {
  results.push(await suspendService(service, token));
}

console.log(JSON.stringify({ results }, null, 2));
