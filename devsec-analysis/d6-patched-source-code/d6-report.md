# Deliverable 6 - Patches

## Objective

Fix at least two real code weaknesses and the highest priority software supply chain issue in separate commits while keeping the existing automated test suite (`npm test`) passing.

## Patches

| Commit | Finding | Files Modified |
|---------|----------|----------------|
| `0d95e66` | CI-001 / SA-001 - Privileged CI executes untrusted pull-request code | `.github/workflows/pr-validation.yml` |
| `c65ea97` | SA-002 - Unsigned JWT authentication bypass | `src/middleware/auth.js` |
| `77f6dd6` | SA-003 - SQL injection and tenant isolation bypass | `src/routes/contacts.js` |

## Validation

Each vulnerability was remediated in a separate commit to keep the changes isolated and easy to review.

The highest priority software supply chain issue was addressed by hardening the GitHub Actions pull request validation workflow. The workflow no longer executes untrusted pull request code with elevated repository permissions or secrets.

The two real application code weaknesses were addressed by removing the unsigned JWT authentication bypass and fixing the SQL injection and tenant isolation vulnerability.

After applying the patches, the CI pipeline completed successfully, including:

- Build and test
- SonarQube SAST analysis
- Container image build

The existing automated test suite (`npm test`) remained green after all patches were applied.