import { strict as assert } from "node:assert";

const token = process.env.RENDER_API_KEY;
const apply = process.argv.includes("--apply");

assert.ok(token, "RENDER_API_KEY is required to tighten Render Postgres IP allowlists.");

const postgresIds = [
  { id: "dpg-d7jahiaqqhas738dmgag-a", name: "vanta-production-core-db" },
  { id: "dpg-d7kgqlmgvqtc73bl72j0-a", name: "vanta-production-core-db-copy" },
  { id: "dpg-d7kh9opo3t8c73cnvvog-a", name: "vanta-private-pool-v2-core-production" },
  { id: "dpg-d7khnod7vvec73d76g3g-a", name: "vanta-private-pool-v2-core-production-copy" },
];

const targetAllowList = [];

async function getPostgres(postgresId) {
  const response = await fetch(`https://api.render.com/v1/postgres/${postgresId}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  assert.equal(response.status, 200, `GET postgres ${postgresId} must return 200, got ${response.status}.`);
  const body = await response.json();
  return body.postgres ?? body;
}

async function patchAllowList(postgresId, ipAllowList) {
  const response = await fetch(`https://api.render.com/v1/postgres/${postgresId}`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ipAllowList }),
  });
  assert.equal(response.status, 200, `PATCH postgres ${postgresId} must return 200, got ${response.status}.`);
  const body = await response.json();
  return body.postgres ?? body;
}

const results = [];

for (const target of postgresIds) {
  const before = await getPostgres(target.id);
  const beforeRules = (before.ipAllowList ?? []).map((rule) => ({
    cidrBlock: rule.cidrBlock,
    description: rule.description,
  }));

  let afterRules = beforeRules;
  const hasOpenInternet = beforeRules.some((rule) => rule.cidrBlock === "0.0.0.0/0");

  if (apply && hasOpenInternet) {
    const after = await patchAllowList(target.id, targetAllowList);
    afterRules = (after.ipAllowList ?? []).map((rule) => ({
      cidrBlock: rule.cidrBlock,
      description: rule.description,
    }));
  }

  results.push({
    id: target.id,
    name: target.name,
    status: before.status,
    before: beforeRules,
    after: afterRules,
    changed: apply && hasOpenInternet,
    note:
      "Render services in the same region keep internal-URL connectivity when external allowlists are empty. Add explicit /32 or CIDR rules only for approved operator tooling.",
  });
}

console.log(
  JSON.stringify(
    {
      ok: true,
      apply,
      workspaceId: "tea-d7j37af7f7vs739ii8rg",
      targetAllowList,
      postgres: results,
      dryRunInstruction: apply
        ? null
        : "Re-run with --apply after confirming no external psql/admin tooling requires 0.0.0.0/0.",
    },
    null,
    2,
  ),
);
