# CI Guardrails Design

## Scope

Add the smallest reliable GitHub validation gate for the repository, then protect `main` with that gate. The workflow verifies dependency reproducibility, domain/API regressions, TypeScript correctness, production bundling, and high-severity dependency advisories. It does not deploy, call real providers, or run browser QA.

## Chosen approach

Use one Ubuntu and Node 22 validation job. A Node-version matrix would double feedback time without serving the repository's current single-runtime contract. Browser and real-provider checks remain explicit release QA because they require Chrome, local services, credentials, or external network stability and would make the baseline gate nondeterministic.

The required job is named `validate`; this stable name is the contract consumed by branch protection.

## Workflow contract

Create `.github/workflows/ci.yml` with:

- triggers on pull requests targeting `main`, pushes to `main`, and manual dispatch;
- read-only repository contents permission;
- one concurrency group per workflow and ref, canceling superseded runs;
- `ubuntu-latest`, Node 22, npm cache keyed by `package-lock.json`, and a 15-minute timeout;
- ordered steps: checkout, Node setup, `npm ci`, `npm test`, `npm run build`, and `npm audit --audit-level=high`.

`npm ci` proves that the committed lockfile is installable from a clean dependency tree. Tests run before the production build so domain failures return quickly. The audit rejects high or critical advisories while allowing low-severity build-tool findings to be assessed without freezing all delivery.

## Branch protection contract

Enable protection only after the workflow completes successfully on its own pull request. Protect `main` with:

- pull requests required before merge, with zero mandatory approving reviews so the solo repository does not deadlock;
- strict required status check `validate` so a branch must include current `main`;
- conversation resolution required;
- force pushes and branch deletion disabled;
- administrator enforcement enabled.

The gate protects repository history and makes validation mandatory while preserving the owner's ability to merge a green pull request without manufacturing an external reviewer.

## Documentation alignment

Add `.github/CLAUDE.md` as the local module map and a YAML L3 contract at the top of the workflow. Update the root `CLAUDE.md` to expose `.github/` as the repository-governance module. Add this specification to the `docs/superpowers/specs/CLAUDE.md` member list.

## Delivery sequence

1. Commit the approved design independently.
2. Add the workflow and GEB documentation on the same branch.
3. Run local tests, build, audit, YAML parsing, and `git diff --check`.
4. Push and open a pull request.
5. Wait for the `validate` GitHub Actions job to pass.
6. Merge the pull request, update local `main`, then enable branch protection through the GitHub API.
7. Read back the protection settings and verify the repository has no unexpected open pull requests.

## Failure behavior

A failed install, test, typecheck, bundle, or high-severity audit fails the single required job and blocks merge. Superseded runs are canceled to avoid stale feedback. The workflow has no secrets and no write permission, so validation cannot mutate repository or provider state.

## Verification

- Local: `npm ci`, `npm test`, `npm run build`, `npm audit --audit-level=high`, YAML parse, and `git diff --check`.
- Remote: PR check `validate` concludes successfully.
- Governance: branch-protection readback reports strict `validate`, required pull requests, conversation resolution, admin enforcement, and disabled force-push/deletion.

## Non-goals

- Deployment, release tagging, or environment configuration.
- Tencent, DeepSeek, or other credentialed provider smoke tests.
- Playwright visual and classroom QA in the mandatory baseline gate.
- Node-version matrix support or dependency-update automation.
