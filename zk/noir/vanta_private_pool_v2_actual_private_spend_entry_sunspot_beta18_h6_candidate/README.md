# C01 Sunspot Beta18 H6 Source-Migration Candidate

This directory is a review candidate for the C01 Sunspot/Gnark route. It is not the production source of truth and must not be treated as reviewed source lineage by itself.

The candidate source intentionally mirrors `../vanta_private_pool_v2_actual_private_spend_entry/src/main.nr` with one compatibility delta for the Sunspot beta18 toolchain:

```noir
use dep::poseidon::poseidon::bn254;
```

The current beta19 workspace source uses:

```noir
use dep::poseidon::poseidon::bn254;
```

The source-migration guard verifies that this import path is the only source delta, while the H6 context-preimage fields, `derive_actual_private_spend_context_tag`, `bn254::hash_6`, and `computed_context_hash == context_hash` assertion remain present.

Production acceptance still requires reviewer sign-off, production setup/toxic-waste mitigation, deterministic production proof/VK/public-witness artifacts, accepted verifier adapter mutation/no-mutation evidence, SBF/live lineage, and audit/reviewer acceptance.
