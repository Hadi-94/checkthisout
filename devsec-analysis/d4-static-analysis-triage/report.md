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

1. Run SonarQube against the repository.
2. Review every security-related finding reported by SonarQube.
3. Trace attacker-controlled input from its source to the security-sensitive sink.
4. Check whether validation, parameterization, authorization, or another control blocks exploitation.
5. Classify each finding as:
   - True Positive – Exploitable
   - True Positive – Limited/Conditional
   - False Positive
6. Use Burp Suite where possible to confirm runtime reachability.
7. Record manually discovered weaknesses separately and state that they were not reported by the SAST scanner.

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

The pipeline execution completed successfully and reported findings to SonarQube Cloud. 

## Summary

| ID | Finding | Source | Severity | Triage Result | Runtime Verified | Priority |
|---|---|---|---|---|---|---|
| SA-001 | SQL Injection | SonarQube / Manual Review | Critical | True Positive | Yes | Critical |
| SA-002 | Server-Side Request Forgery | Codex / Manual Review | High | True Positive | Yes | High |
| SA-003 | Example scanner finding | SonarQube | Medium | False Positive | No | Informational |

### SA-001 - Unsigned JWT Authentication bypass

- **Severity:** Critical
- **Tool:** SonarQube, Codex
- **File:** `src/middleware/auth.js`
- **Line:** `7`
- **OWASP TOP 10 Classification:** A07 Authentication Failures; A01 Broken Access Control
- **CVSS Score:** `9.3`
-  **CVSS Matrix:** `AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:L/SC:N/SI:N/SA:N`
- **Triage Result:** True Positive – Exploitable
- **Runtime Validation:** Confirmed using BurpSuite, after modifying the JWT token, `devsec-analysis/d4-static-analysis/runtime-screenshots/SA-001.png`

**Description**
Unauthenticated attacker is able to break JWT authentication by using `x-mesh-peer: sidecar` header within their unsigned JWT Bearer token `algo: none`. This vulnerability is found in `src/middleware/auth.js` which means that its affecting all endpoints that need authentication to `GET / POST / PATCH` requests.

**Risk**
Unauthenticated attackers are able to use this exploit to call APIs included with this service and obtains an OWNER-LEVEL access. 

**Remediation**
Remove `x-mesh-peer: sidecar` and `algo: none` entirely from `readClaims()` function. This will allow the middleware to authenticate against `algo: HS256` directly. 


### SA-002 - SQL injection and tenant isolation bypass

- **Severity:** High
- **Tool:** SonarQube, Codex
- **File:** `src/routes/contacts.js`
- **Line:** `35-51`
- **OWASP TOP 10 Classification:** A05:2025 Injection and A01:2025 Broken Access Control.
- **CVSS Score:** `8.7`
-  **CVSS Matrix:** `AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N`
- **Triage Result:** True Positive – Exploitable
- **Runtime Validation:** Confirmed using BurpSuite, after sending a request to endpoint `/v1/contacts/search?workspaceId=&name=test` and JWT token is related to `Aisha` user (workspace `4417`). Using `0 OR 1=1` in the request parameter. I can see all users including `Priya` who is from a different workspace `8802`.

**Description & Risk**
Unauthenticated attacker is able to supply another tenant's `workplaceId` to retrieve its contact. SQL syntax in either parameter can alter the query, disclose database records, cause errors, or potentially modify data postgresql database records.

**Remediation**
- We can ignore tenant-identifies supplied by users, and use the original `workspaceId` of the user sending the request.  
- If this request parameter is needed to be supplied by user, a good implementation of `input-validation` practices is needed. 

### SA-003 - SSRF with internal-response disclosure

- **Severity:** High
- **Tool:** Codex
- **File:** `src/routes/webhooks.js`
- **Line:** `44-75`
- **OWASP TOP 10 Classification:** A05:2025 Injection and A01:2025 Broken Access Control.
- **CVSS Score:** `8.7`
-  **CVSS Matrix:** `AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N`
- **Triage Result:** True Positive – Exploitable
- **Runtime Validation:** Confirmed using BurpSuite, after sending a request to endpoint `/v1/contacts/search?workspaceId=&name=test` and JWT token is related to `Aisha` user (workspace `4417`). Using `0 OR 1=1` in the request parameter. I can see all users including `Priya` who is from a different workspace `8802`.

**Description & Risk**
Unauthenticated attacker is able to supply another tenant's `workplaceId` to retrieve its contact. SQL syntax in either parameter can alter the query, disclose database records, cause errors, or potentially modify data postgresql database records.

**Remediation**
- We can ignore tenant-identifies supplied by users, and use the original `workspaceId` of the user sending the request.  
- If this request parameter is needed to be supplied by user, a good implementation of `input-validation` practices is needed. 