# Deliverable 5 - Ranked Findings List

## Objective

Consolidate the findings from the software supply chain, open source license, and static analysis tasks into one list, ranked by the order in which they should be remediated.

## Prioritization Approach

Findings are ranked according to exploitability, access required, potential business impact, cross-tenant or repository-wide exposure, and whether the issue is already reachable in the current application. 
Findings that enable authentication bypass, CI/CD compromise, cross-tenant access, or internal network access are always prioritized above conditional, defense-in-depth, and administrative license findings. This is because these issues have direct impact on Confidentiality, Integrity and Availability (CIA) of systems over all. 

**Note:** To clarify, the insecure pull-request workflow was reported in both Deliverable 2 (`CI-001`) and Deliverable 4 (`SA-001`). It is consolidated into a single ranked entry below to avoid duplication.

## Ranked Findings

| Rank | Source ID | Finding | File and Line | Severity | Why This Priority | Recommended Fix |
|---:|---|---|---|---|---|---|
| 1 | `CI-001` / `SA-001` | Privileged CI executes untrusted pull-request code | `.github/workflows/pr-validation.yml:6-34` | Critical | A malicious fork pull request can execute attacker-controlled install or test code with repository secrets and write-enabled permissions, potentially compromising both secrets and repository integrity. | Replace `pull_request_target` with `pull_request` for untrusted code, remove secrets from the job, use `permissions: contents: read`, and avoid checking out the PR head SHA in a privileged context. |
| 2 | `SA-002` | Unsigned JWT authentication bypass | `src/middleware/auth.js:7-49` | Critical | An unauthenticated attacker can submit an unsigned JWT and obtain owner-level access across authenticated API routes. | Remove support for `alg: none`, prevent external requests from activating the trusted sidecar path, and verify tokens only with an approved algorithm and trusted key. |
| 3 | `SA-003` | SQL injection and tenant-isolation bypass | `src/routes/contacts.js:35-51` | High | A normal authenticated user can manipulate SQL and retrieve records belonging to other workspaces, directly breaking tenant isolation. | Use parameterized SQL queries and derive the effective `workspaceId` from trusted JWT claims rather than user-controlled request parameters. |
| 4 | `SA-004` | SSRF with internal-response disclosure | `src/routes/webhooks.js:44-75` | High | An authenticated user controls the server's outbound request destination and may reach private services, metadata endpoints, or internal infrastructure while receiving the response content. | Enforce HTTPS, use an explicit destination allowlist, validate resolved IP addresses, block private and metadata ranges, and revalidate redirects. |
| 5 | `LIC-001` | Prohibited AGPL dependency: `convo-insights` | `package.json:17`; `vendor/convo-insights/LICENSE` | High | The AGPL network-copyleft terms conflict with the intended commercial closed-source SaaS model and may introduce source-disclosure obligations. | Replace the package with a permissively licensed alternative or obtain a separate commercial license from the copyright holder. |
| 6 | `DV-001` | Reachable vulnerable `lodash` dependency | `package.json:28`; `src/routes/contacts.js` custom-field handling | High | The vulnerable package is directly imported and its merge functionality is reachable from an API endpoint, exposing the application to known prototype-pollution and related advisories. | Upgrade `lodash` to the approved fixed version, retest custom-field handling, and run `npm audit` and the application test suite after the change. |
| 7 | `SA-005` | Cross-workspace media download | `src/routes/media.js:42-61` | Medium | An authenticated user who learns another tenant's media identifier can retrieve that tenant's file, causing cross-workspace confidentiality loss. | Associate media records with a workspace and enforce workspace ownership during every download request. |
| 8 | `LIC-004` | Restrictive license terms hidden in `msgfmt-lite` | `package.json:31`; `vendor/msgfmt-lite/LICENSE` | High (Business) | Although declared as MIT, the license contains ARR, field-of-use, competition, reporting, and termination restrictions. Treating it as standard MIT creates legal and commercial risk. | Replace the package, obtain an appropriate commercial license, or require explicit legal and commercial approval before use. |
| 9 | `SA-006` | Excessive GitHub Actions permissions | `.github/workflows/ci.yml:9` | Medium | `permissions: write-all` provides unnecessary write access to jobs that only test, scan, and build. The impact becomes significant if another action or dependency execution path is compromised. | Set workflow permissions to `contents: read` and grant narrowly scoped job-level write permissions only where required. |
| 10 | `SA-007` | npm lifecycle scripts execute during CI installation | `.github/workflows/ci.yml:29`; `vendor/dotenv-extened/package.json` | Medium | `npm ci` executes package lifecycle scripts while job-level secrets are present. The current script is benign, but a compromised dependency could use this path to access secrets or the repository token. | Use `npm ci --ignore-scripts` where possible, scope secrets to the test step, remove unused `NPM_TOKEN`, and explicitly run only reviewed install scripts. |
| 11 | `DV-002` | Vulnerable transitive `minimist` dependency | `package.json:29`; `package-lock.json` entry for `node_modules/minimist` | Low | The vulnerable package is transitive through `mkdirp` and no application endpoint or runtime call path was identified. The scanner severity is high, but practical reachability is low. | Upgrade `mkdirp` and the transitive dependency chain during scheduled maintenance, then regenerate the lockfile and rerun tests. |
| 12 | `SA-008` | Unrestricted CORS policy | `src/app.js:24` | Low | The API permits all browser origins, but bearer-token authentication and disabled credentialed CORS limit standalone impact. This remains an unnecessary exposure if only known frontends should call the API. | Configure an explicit origin allowlist, or formally document and accept the policy if the API is intentionally available to all browser origins. |
| 13 | `LIC-002` | Dual-licensed `jszip` dependency | `package.json:27`; `node_modules/jszip/LICENSE.markdown` | Low | The dependency can be used under MIT, but the selected license option must be documented to avoid ambiguity about GPL obligations. | Record that the project uses JSZip under the MIT option and retain the required copyright and license notice. |
| 14 | `LIC-003` | BSD-3-Clause review for `joi` | `package.json:25`; `node_modules/joi/LICENSE.md` | Informational | Manual review confirmed a standard permissive BSD-3-Clause license. No technical remediation is required, but attribution and non-endorsement conditions must be preserved. | Record the approval decision and retain the required copyright, license, and disclaimer notices. |

## Recommended Remediation Order

The first remediation priority should address the privileged pull-request workflow, unsigned JWT bypass, SQL injection, and SSRF because these issues can lead to repository compromise, authentication bypass, cross-tenant data exposure, or access to internal infrastructure.

The second priority should remove or commercially license the rejected dependencies, upgrade reachable vulnerable packages, and correct the cross-workspace media authorization failure.

The remaining conditional and defense-in-depth findings can be addressed through CI hardening and scheduled maintenance. The approved `jszip` and `joi` license reviews require documentation rather than code changes.

## Conclusion

The highest priority findings affect the trust boundaries of the CI/CD pipeline, authentication middleware, tenant isolation, and outbound network access. 
These should be fixed before addressing other remaining medium and low items. This ranking reflects the application's actual exploitability and business impact rather than relying only on scanner assigned severities.
