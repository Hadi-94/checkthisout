# Deliverable 4 - Static-Analysis Triage

## Objective

Judge every finding reported by the scanner and determine whether it is a real and exploitable weakness in this application or not, explaining the source, sink, and execution path.

## Tools Used

| Tool | Purpose |
|---|---|
| SonarQube Cloud | Primary SAST scanner and CI integrated static analysis |
| GitHub Actions | Runs SonarQube automatically as part of the CI pipeline |
| Manual code review | Validate scanner findings and trace source, sink, and execution path |
| Codex secure code review | Supplementary review for weaknesses not identified by SonarQube |
| Burp Suite Professional | Confirm endpoint reachability and exportability at runtime |

## Methodology
The assessment followed the workflow below:

1. Run static analysis using SonarQube.
2. Manually review each reported finding.
3. Validate exploitability through runtime testing where applicable.
4. Classify the finding based on its actual impact and exploitability.
5. Document additional manually discovered vulnerabilities separately.

Note: All Screenshots mentioned in this report are in folder `devsec-analysis/d4-static-analysis-triage/runtime-screenshots/`. 

## CI Integration
SonarQube was integrated into the GitHub Actions CI workflow, file `ci.yml` as a dedicated `sonarqube-sast` job, lines `34-48`.

code snippet: 
```yaml
## This is the stage that I have added to integrate and onboard this project to SonarQube-SAST Scanner.
## In standard procedure, any new PR approved to merge with development should be scanned.
## This is to make sure that all security-related issues reported are being patched and handled at the development stage, as part of Secure SDLC. 
  SonarQube-SAST:
    name: SonarQube-SAST
    needs: build-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5
        with:
          fetch-depth: 0 
      - name: SonarQube Scan
        uses: SonarSource/sonarqube-scan-action@7006c4492b2e0ee0f816d36501671557c97f5995
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

The job:

1. Checks out the full Git history using `fetch-depth: 0`.
2. Authenticates to SonarQube Cloud using `SONAR_TOKEN`.
3. Runs the SonarQube scanner against the repository.
4. Uploads the generated analysis report to SonarQube Cloud.

The pipeline execution completed successfully and uploaded the static analysis results to SonarQube Cloud.

**SonarQube Cloud Project**

https://sonarcloud.io/summary/overall?id=Hadi-94_checkthisout&branch=master

The project is hosted in a private SonarQube Cloud workspace. Access can be granted upon request.

SonarQube reported several security findings. Additional manual review using Codex and Burp Suite identified vulnerabilities that were either not detected by SonarQube or required runtime validation to confirm exploitability.

## Summary

| ID | Finding | Source | Severity | Triage Result | Runtime Verified | Priority |
|---|---|---|---|---|---|---|
| SA-001 | Privileged CI executes untrusted pull-request code | Codex | Critical | True Positive | No | Critical |
| SA-002 | Unsigned JWT Authentication bypass | SonarQube, Codex | Critical | True Positive | Yes | Critical |
| SA-003 | SQL Injection | SonarQube, Codex | High | True Positive | Yes | Critical |
| SA-004 | Server-Side Request Forgery | Codex | High | True Positive | Yes | High |
| SA-005 | Cross-workspace media download | Codex | Medium | True Positive | Yes | Medium |
| SA-006 | Excessive GitHub Actions permissions | SonarQube | Medium | True Positive - Conditional | No | Medium |
| SA-007 | npm lifecycle scripts execute during installation | SonarQube | Medium | True Positive - Conditional | No | Medium |
| SA-008 | Unrestricted CORS policy | SonarQube | Low | True Positive - Limited/Conditional | No | Low |

### SA-001 - Privileged CI executes untrusted pull-request code

- **Severity:** Critical
- **Tool:** Codex
- **File:** `.github/workflows/pr-validation.yml`
- **Line:** `6-34`
- **OWASP TOP 10 Classification:** A03:2025 Software Supply Chain Failures and A08:2025 Software or Data Integrity Failures.
- **CVSS Score:** `10`
- **CVSS Matrix:** `AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:H`
- **Triage Result:** True Positive - Exploitable
- **Runtime Validation:** Not performed. This finding was confirmed through static review of the GitHub Actions execution path and is not applicable to Burp Suite testing.
- **Screenshot:** Not available. This issue was identified during manual static review.

**Description & Risk**
The `pull_request_target` workflow runs with repository secrets and write permissions. It checks out the contributor-controlled pull-request commit and executes `npm ci` and `npm test`. An external attacker can open a fork pull request containing a malicious install or test script, which can read `CI_JWT_SECRET` and `NPM_TOKEN` or use the persisted Git credential to modify repository content.

**Remediation**
- Replace `pull_request_target` with `pull_request` for the build and test workflow.
- Set `permissions: contents: read` and remove `JWT_SECRET` and `NPM_TOKEN` from jobs that execute pull-request code.
- Do not override checkout with `github.event.pull_request.head.sha`; use the normal pull-request checkout context.


### SA-002 - Unsigned JWT Authentication bypass

- **Severity:** Critical
- **Tool:** SonarQube, Codex
- **File:** `src/middleware/auth.js`
- **Line:** `7`
- **OWASP TOP 10 Classification:** A07 Authentication Failures; A01 Broken Access Control
- **CVSS Score:** `9.3`
-  **CVSS Matrix:** `AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:L/SC:N/SI:N/SA:N`
- **Triage Result:** True Positive – Exploitable
- **Runtime Validation:** Confirmed using BurpSuite, after modifying the JWT token.
- **Screenshot:** `SA-002-1.png and SA-002-2.png`

**Description & Risk**
Unauthenticated attacker is able to break JWT authentication by using `x-mesh-peer: sidecar` header within their unsigned JWT Bearer token `algo: none`. This vulnerability exists in `src/middleware/auth.js` which means that it affects all endpoints that need authentication to `GET / POST / PATCH` requests. 

Unauthenticated attackers are able to use this exploit to call APIs included with this service and obtains OWNER-LEVEL access. 

**Remediation**
Remove `x-mesh-peer: sidecar` and `algo: none` entirely from `readClaims()` function. This will allow the middleware to authenticate against `algo: HS256` directly. 


### SA-003 - SQL injection and tenant isolation bypass

- **Severity:** High
- **Tool:** SonarQube, Codex
- **File:** `src/routes/contacts.js`
- **Line:** `35-51`
- **OWASP TOP 10 Classification:** A05:2025 Injection and A01:2025 Broken Access Control.
- **CVSS Score:** `8.7`
-  **CVSS Matrix:** `AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N`
- **Triage Result:** True Positive – Exploitable
- **Runtime Validation:** Confirmed using BurpSuite, after sending a request to endpoint `/v1/contacts/search?workspaceId=&name=test` and JWT token is related to `Aisha` user (workspace `4417`). Using `0 OR 1=1` in the request parameter. I can see all users including `Priya` who is from a different workspace `8802`. 
- **Screenshots:** `SA-003-1.png, SA-003-2.png and SA-003-3.png`

**Description & Risk**
Authenticated attacker is able to supply another tenant's `workspaceId` to retrieve its contact. SQL syntax in this parameter can alter the query, disclose database records, cause errors, or potentially modify PostgreSQL database records.

**Remediation**
- We can ignore tenant-identifies supplied by users, and use the original `workspaceId` of the user sending the request.  
- If this request parameter is needed to be supplied by user, a good implementation of `input-validation` practices is needed. 

### SA-004 - SSRF with internal-response disclosure

- **Severity:** High
- **Tool:** SonarQube, Codex
- **File:** `src/routes/webhooks.js`
- **Line:** `44-75`
- **OWASP TOP 10 Classification:** A01:2025 Broken Access Control. OWASP 2025 explicitly places SSRF in A01.
- **CVSS Score:** `7.1`
-  **CVSS Matrix:** `AV:N/AC:L/AT:N/PR:L/UI:N/VC:L/VI:N/VA:L/SC:H/SI:N/SA:N`
- **Triage Result:** True Positive – Exploitable
- **Runtime Validation:** Using this endpoint, `/v1/webhooks/test-delivery` I was able invoke a successful SSRF request to `https://webhook.site`, using a normal user JWT token. The user is able to setup the destination, in this case `https://webhook.site`, as its mentioned in line `44`, `const target = req.body.url;`. The route `/v1/webhooks/` does not verify protocol, hostname, resolved IP address, port and allowed destination domains. This makes the route `/v1/webhooks/` attacker controlled SSRF source. 
- **Screenshot:** `SA-004-1.png, SA-004-2.png and SA-004-3.png`

**Description & Risk**
A normal authenticated user directs the server toward loopback, private networks, cluster services, or metadata endpoints. Reflected response content converts the issue from blind SSRF into an internal-data disclosure primitive. The attacker-controlled URL flows directly into the outbound HTTP client without validation.

**Remediation**
A validation for outbound URL should take in place. This validation should:
- Allow only HTTPS 
- Prefer an explicit hostname allowlist
- Reject loopback, private, link-local, multicast, unspecified, and metadata destinations.
- Validate every redirect if redirects are necessary.


### SA-005 - Cross-workspace media download

- **Severity:** Medium
- **Tool:** Codex
- **File:** `src/routes/media.js`
- **Line:** `42-61`
- **OWASP TOP 10 Classification:** A01:2025 Broken Access Control.
- **CVSS Score:** `6`
-  **CVSS Matrix:** `AV:N/AC:L/AT:P/PR:L/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N`
- **Triage Result:** True Positive – Exploitable
- **Runtime Validation:** Using endpoint `POST /v1/media` to upload a blob as `Aisha`, who is an `agent` in workspace `4417` using her JWT token. I was able to retrieve the blob using `dana` JWT token, who is also an `agent` in workspace `8802`. 
- **Screenshot:** `SA-005-1.png and SA-005-2.png`

**Description & Risk**
An authenticated user who obtains another user’s media ID can download the file. This issue causes risk related to RBAC. The lack of Horizontal RBAC can cause Data Privacy Breaches and Loss of Trust.

**Remediation**
- Implement RBAC so that only users within that workspace can access the media uploaded. 


### SA-006 - Excessive GitHub Actions permissions

- **Severity:** Medium
- **Tool:** SonarQube
- **File:** `.github/workflows/ci.yml`
- **Line:** `9`
- **OWASP TOP 10 Classification:** A03:2025 Software Supply Chain Failures and A08:2025 Software or Data Integrity Failures.
- **CVSS Score:** `N/A - configuration weakness with impact dependent on a second execution path`
- **CVSS Matrix:** `N/A`
- **Triage Result:** True Positive - Conditional
- **Runtime Validation:** Not performed. This finding was reviewed statically from the SonarQube result and workflow configuration; it is not applicable to Burp Suite testing.
- **SonarQube Screenshot:** `SA-006-1.png`

**Description & Risk**
`permissions: write-all` gives every job a `GITHUB_TOKEN` with write access, although this workflow only checks out code, runs tests, scans with SonarQube, and builds an image without pushing it. If a dependency or GitHub Action executes malicious code, it can use the token to modify repository resources. This finding is conditional because the attacker first needs a way to execute code inside the workflow.

**Remediation**
- Replace line `9` with the minimum permission required by the current jobs:

```yaml
permissions:
  contents: read
```

- Add a job-level write permission later only if a job is changed to publish an image, package, or repository update.


### SA-007 - npm lifecycle scripts execute during installation

- **Severity:** Medium
- **Tool:** SonarQube
- **File:** `.github/workflows/ci.yml`
- **Line:** `29`
- **OWASP TOP 10 Classification:** A03:2025 Software Supply Chain Failures.
- **CVSS Score:** `N/A - conditional supply-chain execution path`
- **CVSS Matrix:** `N/A`
- **Triage Result:** True Positive - Conditional
- **Runtime Validation:** Not performed. This finding was reviewed statically from the SonarQube result, package metadata, and workflow configuration; it is not applicable to Burp Suite testing.
- **SonarQube Screenshot:** `SA-007-1.png`

**Description & Risk**
`npm ci` executes dependency lifecycle scripts during installation. The vendored `dotenv-extened` package contains a `postinstall` script, proving that install-time JavaScript runs in this workflow. The current script is safe, but a compromised dependency could read the job-level `JWT_SECRET` and `NPM_TOKEN` or use the Git credential persisted by the checkout step. This finding is conditional because it requires a malicious dependency or package change.

**Remediation**
- Disable lifecycle scripts during dependency installation:

```yaml
- name: Install dependencies
  run: npm ci --ignore-scripts
```

- Move `JWT_SECRET` from the job-level environment to the `Run tests` step. Remove `NPM_TOKEN` if the installation does not use a private npm registry.
- If an install script becomes required, review it and run only that trusted script in a separate step.


### SA-008 - Unrestricted CORS policy

- **Severity:** Low
- **Tool:** SonarQube
- **File:** `src/app.js`
- **Line:** `24`
- **OWASP TOP 10 Classification:** A01:2025 Broken Access Control and A02:2025 Security Misconfiguration.
- **CVSS Score:** `N/A - no standalone confidentiality, integrity, or availability impact demonstrated`
- **CVSS Matrix:** `N/A`
- **Triage Result:** True Positive - Limited/Conditional
- **Runtime Validation:** Not performed. This finding is documented using the SonarQube result and static configuration review only.
- **SonarQube Screenshot:** `SA-008-1.png`

**Description & Risk**
`app.use(cors())` enables `Access-Control-Allow-Origin: *` for every route. This allows JavaScript from any website to read API responses when it already has a valid bearer token. The service does not use cookie authentication or enable credentialed CORS, so this setting does not expose a logged-in browser session by itself; however, it allows more browser origins than the application requires.

**Remediation**
- Define the approved frontend origins in `CORS_ALLOWED_ORIGINS` and replace line `24` with an explicit allowlist:

```js
const allowedOrigins = String(process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.includes(origin));
  },
  methods: ['GET', 'POST', 'PATCH'],
  allowedHeaders: ['Authorization', 'Content-Type'],
}));
```

- Keep `credentials` disabled because this API uses bearer-token authentication.
- If the API is intentionally public to all browser origins, document that decision and accept the SonarQube finding instead of adding a restrictive allowlist.


## Conclusion

SonarQube successfully detected several configuration and code quality issues. However, vulnerabilities such as the JWT authentication bypass, SSRF, and cross-workspace media access required manual reasoning across multiple files or runtime validation. This demonstrates why SAST should complement, rather than replace, manual security review and dynamic testing.