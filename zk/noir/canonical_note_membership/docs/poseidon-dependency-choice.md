# Poseidon Dependency Choice

## Decision

For the first executable Noir proof lane, Vanta should use the standard Noir Poseidon primitive provided by the Noir ecosystem for Barretenberg-targeted circuits rather than inventing a custom hash gadget first.

## Requirement

Before the dummy circuit math is replaced, the Noir workspace must pin:
- the exact Poseidon dependency/package name
- the exact import path
- the exact function signature used for hashing note fields
- the exact function signature used for Merkle node hashing

## Selection Rule

Use the maintained Poseidon implementation that is compatible with the current Nargo/Noir toolchain version chosen for this workspace.

Do not hand-roll Poseidon.
Do not invent a Vanta-local hash gadget first.

## Immediate Next Step

The next concrete action is to inspect the installed Noir/Nargo toolchain and then pin the dependency and import shape in:
- `zk/noir/canonical_note_membership/Nargo.toml`
- `zk/noir/canonical_note_membership/src/main.nr`
