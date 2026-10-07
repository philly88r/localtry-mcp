# LocalTry Production Engineering Contract

- Treat GitHub `main` as the only deployable source of truth. The GitHub Actions `Deploy` workflow (`.github/workflows/deploy.yml`) is the only production release path; it runs on every push to `main`.
- Never deploy from a workstation or sandbox. Ship changes through a pull request that passes `CI` (`.github/workflows/ci.yml`). LocalTry engineering pull requests (label `localtry-engineering`) are merged automatically after CI passes, except changes to `.github/`, `CODEOWNERS`, or deploy/verify scripts, which wait for owner review. See `docs/engineering-release-pipeline.md` in the CRM repository.
- To roll back, revert the merge commit through a pull request.
- In the hosted LocalTry engineering workspace, read `/workspace/localtry/docs/engineering-repository-map.md`, `/workspace/localtry/docs/engineering-repositories.json`, and `/workspace/localtry/docs/engineering-change-ledger.jsonl` before changing architecture.
- Every production change must add a non-sensitive entry to the central engineering change ledger in the LocalTry CRM repository in the same hosted job.
- When repository ownership, service topology, bindings, deployment responsibility, or cross-repository boundaries change, update the central machine registry, human ownership map, hosted runner repository specifications, prompt map, and Wrangler bindings.
- Run the relevant checks and verify the live result before reporting completion.

