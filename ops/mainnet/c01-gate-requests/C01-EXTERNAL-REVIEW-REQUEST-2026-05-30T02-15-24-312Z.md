# C01 External Review Outbound Request

Status: draft outbound send-list
Production privacy claim: blocked
C01 verifier ready: blocked

## Repo Starting Point

- repo: https://github.com/williamclay8/Vanta.git
- branch: `main`
- reviewStartCommitRef: `git:c2a0e693fbb1975244dc42f57cb561c17bc6d574`
- treeStatusAtCollection: `dirty`

## Human Work Order

- `ops/mainnet/private-pool-v2-c01-external-evidence-request.md`
- `ops/mainnet/private-pool-v2-c01-external-review-request-bundle.evidence.json`

Validate locally before sending:

```bash
npm run zk:c01-external-review-request-bundle-check
npm run zk:c01-external-review-handoff-check
npm run zk:c01-production-verifier-artifact-request-check
```

## Sha256-Pinned Outbound Files

- `ops/mainnet/private-pool-v2-c01-external-evidence-request.md` (work-order) — sha256:c1b72f4c1a109e2075b496cdc1f1d46188bff808efaeec430759d6e56843c79a
- `ops/mainnet/private-pool-v2-c01-production-verifier-artifact-request.evidence.json` (work-order) — sha256:0e30e98453b1b19bd6273e85937f89c10745ab5b40c00d621674d2f59215eb61
- `ops/mainnet/private-pool-v2-c01-external-review-handoff.evidence.json` (work-order) — sha256:8ed2c4400b3b7dbd4287bbf80db72ad8cf51f0c03451463b3f6c019a4906a3b4
- `ops/mainnet/private-pool-v2-c01-beta18-h6-source-review-acceptance.template.json` (reviewed-return-template) — sha256:8c25c00576fc76fbb3c0e427cd2298155f43c7990b7b62762981b4f55074352f
- `ops/mainnet/private-pool-v2-c01-deterministic-production-artifact-build.template.json` (reviewed-return-template) — sha256:abdc5afd336804168c561acaf5d73259e48872feb45e08de4ffcf81f00306f86
- `ops/mainnet/private-pool-v2-c01-production-artifact-bundle.template.json` (reviewed-return-template) — sha256:9749af70f183bbd308d59494cf1fb8e6f5f82cf8febda7feade58be98bfb69fe
- `ops/mainnet/private-pool-v2-c01-verifier-adapter-acceptance.template.json` (reviewed-return-template) — sha256:ab41ac364a370d89ae339db6db53467bb3905128af2fbc15714afa7a4941038a
- `ops/mainnet/private-pool-v2-c01-sbf-live-lineage-acceptance.template.json` (reviewed-return-template) — sha256:5a11bd67a33719e5bf1dfa4380130595ac3871d87a3d7e9290c50fa393fc0e7a
- `ops/mainnet/private-pool-v2-c01-audit-reviewer-acceptance.template.json` (reviewed-return-template) — sha256:d38c361ea2706b54f674c69e3875853deeff9417776f7d0c398692f08199ae44
- `ops/mainnet/private-pool-v2-c01-beta18-h6-source-review-acceptance-gate.evidence.json` (acceptance-gate) — sha256:be8d7cdbee9adfa19092f25b54f3246b0796fa0135c33b7555ba8b530c68a41a
- `ops/mainnet/private-pool-v2-c01-production-output-manifest-preflight.evidence.json` (acceptance-gate) — sha256:502117a0de2ae15d4f227953494664c893b051204039b2bda89e49e64e33095f
- `ops/mainnet/private-pool-v2-c01-deterministic-production-artifact-build-gate.evidence.json` (acceptance-gate) — sha256:f62b5449aad0034a08295363e64aa1849a634781d4d2815ff9554e8384a8c54b
- `ops/mainnet/private-pool-v2-c01-production-artifact-acceptance-gate.evidence.json` (acceptance-gate) — sha256:827981c20ca1107b8c3b0e7b05a57bb45ace120017922cb86729b09424a8ed65
- `ops/mainnet/private-pool-v2-c01-verifier-adapter-acceptance-gate.evidence.json` (acceptance-gate) — sha256:b845d4321a3853c87d5c10799f30f0b10eb01466dd1f96ded0744e18de726a47
- `ops/mainnet/private-pool-v2-c01-sbf-live-lineage-acceptance-gate.evidence.json` (acceptance-gate) — sha256:210e56383437c2ba6fc86144f199096697b05d731c4e3cb243a1eec651b62045
- `ops/mainnet/private-pool-v2-c01-audit-reviewer-acceptance-gate.evidence.json` (acceptance-gate) — sha256:dd53b1576d4fc80f22228e797444967779302ebcb3bb466b75b9438e5994e751
- `ops/mainnet/private-pool-v2-c01-verifier-evidence-closure-gate.evidence.json` (acceptance-gate) — sha256:90fbb81f84759a7b2a56c74945249989e3bf57a7b184e29cfef007f3f2423b3e
- `PRODUCTION_PRIVACY_AUDIT.md` (local-audit-context) — sha256:faa986ad998ab893abf32c9b44428afc6228df28dc5a6a26e7ba5f5b95f22709
- `AUDIT_2026-05-19.md` (local-audit-context) — sha256:3251048a8c8406f2f1e04ea87b9d58eaf5b1139af3e03358c77f1413194dec85
- `SECURITY_LIMITATIONS.md` (local-audit-context) — sha256:91de30869e25206b5feefd8798dffd09eb1137cb256d02aa77f8a521b683f536
- `VANTA_ZK_REVIEW.findings.json` (local-audit-context) — sha256:1d2bb0033c9de68ac459ecacffa44a917605d9c116a2ae05704179f92829452a
- `docs/zk/c01-production-verifier-backend-decision.md` (local-audit-context) — sha256:45ce7db47a51003044357f1ca729d90d22080d7898deefbaba29d797bd32f3b2
- `docs/audit-package.md` (local-audit-context) — sha256:bd5dfe969c0a72fb2ade455bcd69ee7bedad7bcc43cb144e892c2088444f4faf
- `ops/mainnet/private-pool-v2-groth16-verifier-adapter-artifact.evidence.json` (operator-local-context) — sha256:67ffef9e21a95d4f3e0d1dae068f60c9b507038c0774090ed147113b9a8e0d8d
- `ops/mainnet/private-pool-v2-groth16-verifier-adapter-live-receipt-smoke.evidence.json` (operator-local-context) — sha256:586f2b34b5b160369646f0264367e20cc96295f47c0dc3c5c1ed34f688768669

## Review Order (External Returns Required)

1. Source review acceptance — `VANTA_C01_BETA18_H6_SOURCE_REVIEW_ACCEPTANCE_PATH=<reviewed-json> npm run zk:c01-beta18-h6-source-review-acceptance-gate-check`
2. Production output manifest preflight — `VANTA_C01_PRODUCTION_OUTPUT_MANIFEST_ROOT=<artifact-dir> npm run zk:c01-production-output-manifest-check`
3. Deterministic production artifact build — `VANTA_C01_DETERMINISTIC_PRODUCTION_ARTIFACT_BUILD_PATH=<reviewed-json> npm run zk:c01-deterministic-production-artifact-build-check`
4. Production artifact bundle — `VANTA_C01_PRODUCTION_ARTIFACT_BUNDLE_PATH=<reviewed-json> npm run zk:c01-production-artifact-acceptance-gate-check`
5. Verifier adapter acceptance — `VANTA_C01_VERIFIER_ADAPTER_ACCEPTANCE_PATH=<reviewed-json> npm run zk:c01-verifier-adapter-acceptance-gate-check`
6. SBF/live lineage acceptance — `VANTA_C01_SBF_LIVE_LINEAGE_ACCEPTANCE_PATH=<reviewed-json> npm run zk:c01-sbf-live-lineage-acceptance-gate-check`
7. Audit/reviewer acceptance — `VANTA_C01_AUDIT_REVIEWER_ACCEPTANCE_PATH=<reviewed-json> npm run zk:c01-audit-reviewer-acceptance-gate-check`
8. Composite closure — all four reviewed packets plus `npm run zk:c01-verifier-evidence-closure-gate-check`

## Operator Local Context (Comparison Only)

These prove deployed operator relay truth but do **not** satisfy production verifier-adapter acceptance:

- `ops/mainnet/private-pool-v2-groth16-verifier-adapter-artifact.evidence.json`
- `ops/mainnet/private-pool-v2-groth16-verifier-adapter-live-receipt-smoke.evidence.json`

## Non-Claims

This package is not production proof-format evidence, not production verifying-key evidence, not verifier-adapter acceptance, not SBF/live lineage, not audit/reviewer acceptance, not C01 closure, and not fund-release approval.
