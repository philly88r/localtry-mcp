# LocalTry Production Engineering Contract

- Treat GitHub `main` as the only deployable source of truth.
- Commit and push every intended change before using this repository's guarded deployment command. Never bypass its deployment guard.
- In the hosted LocalTry engineering workspace, read `/workspace/localtry/docs/engineering-repository-map.md`, `/workspace/localtry/docs/engineering-repositories.json`, and `/workspace/localtry/docs/engineering-change-ledger.jsonl` before changing architecture.
- Every production change must add a non-sensitive entry to the central engineering change ledger in the LocalTry CRM repository in the same hosted job.
- When repository ownership, service topology, bindings, deployment responsibility, or cross-repository boundaries change, update the central machine registry, human ownership map, hosted runner repository specifications, prompt map, and Wrangler bindings.
- Run the relevant checks and verify the live result before reporting completion.

