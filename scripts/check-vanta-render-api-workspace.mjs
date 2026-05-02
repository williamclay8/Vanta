import { strict as assert } from "node:assert";

const expectedWorkspaceId = "tea-d7j37af7f7vs739ii8rg";
const expectedWorkspaceName = "William's workspace";

const token = process.env.RENDER_API_KEY;

assert.ok(token, "RENDER_API_KEY is required for the Render API workspace check.");

const response = await fetch("https://api.render.com/v1/owners", {
  headers: {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  },
});

assert.equal(response.status, 200, `Render owners API must return 200, got ${response.status}.`);

const body = await response.json();
const owners = Array.isArray(body) ? body.map((row) => row.owner).filter(Boolean) : [];
const expectedOwner = owners.find((owner) => owner.id === expectedWorkspaceId);

assert.ok(
  expectedOwner,
  `Render API key must have access to ${expectedWorkspaceName} (${expectedWorkspaceId}).`,
);
assert.equal(
  expectedOwner.name,
  expectedWorkspaceName,
  `Render workspace ${expectedWorkspaceId} must still be named ${expectedWorkspaceName}.`,
);

console.log(
  JSON.stringify(
    {
      ok: true,
      workspaceId: expectedWorkspaceId,
      workspaceName: expectedWorkspaceName,
      accessibleWorkspaceCount: owners.length,
    },
    null,
    2,
  ),
);
