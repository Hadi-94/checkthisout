# Deliverable 2 - Vulnerabilities and Reachability

## Objective

For each vulnerability worth naming, identify the affected package, the corresponding security advisory, and determine whether the application can actually reach the vulnerable code, with the call path or the thing that blocks it.

## Tools Used

The following tools and techniques were used during this assessment:

| Tool | Purpose |
|------|---------|
| CycloneDX SBOM | Inventory of direct and transitive dependencies |
| npm audit | Identify known vulnerabilities in npm packages |
| npm ls | Trace dependency paths |


## Summary

| ID | Package | Severity | Reachability | Priority |
|----|---------|----------|--------------|----------|
| DV-001 | lodash | High | Reachable | High |
| DV-002 | minimist | Critical (Scanner) | Not Reachable | Low |
| CI-001 | GitHub Action Workflow | High | Reachable | High |


## Dependency Vulnerabilities Findings

### DV-001 - Vulnerable lodash package
- Scanner Severity : High
- Package: `lodash`
- Installed version: `4.17.15`
- Advisory: Command Injection, Prototype pollution, ReDoS.
- Fixed version: `4.18.1`

**Code Reachability**
The vulnerable `lodash` package is directly imported by the application. API endpoint `PATCH /v1/contacts/:id/custom-fields` in `contacts.js` route uses function `applyCustomFields()` which uses the `_.merge()` function from `lodash` vulnerable package. Therefore, I consider the affected dependency is considered **reachable**.

**Recommendation**
Upgrade `lodash` to higher version, `4.18.1` is the latest stable version that closes most of these issues. 

### DV-002 - Vulnerable minimist package
- Scanner Severity : Critical
- Package: `minimist`
- Installed version: `0.2.3`
- Advisory: Prototype pollution.
- Fixed version: `0.2.4` or `1.2.6`

**Code Reachability**
This is package is an indirect dependency of `mkdirp`. After going through the code, I can conclude this package is not directly reachable by any endpoints available in routes, thus considered **not reachable**. 

**Recommendation**
Upgrading the dependency chain during maintenance window should be enough.

## CI Setup Vulnerabilities 
### CI-001 - Insecure Pull Request Workflow
- Severity : High 
- File : `.github/workflow/pr-validation.yml`

**Code Reachability**

When a pull request is opened, synchronized, or reopened, the `pull_request_target` workflow runs in the security context of the target repository and can access repository secrets such as `CI_JWT_SECRET` and `NPM_TOKEN`. 

The workflow then checks out the pull request head commit and executes `npm ci` and `npm test`. This allows pull-request-controlled code to run with access to these secrets and write-enabled repository permissions.

**Recommendation**
Use `pull_request` for untrusted pull request validation, remove `CI_JWT_SECRET` and `NPM_TOKEN` from this stage, change the permission workflow to be `contents: read`, to implement least privilege principle.



## Conclusion

The overall Dependency Vulnerability assessment and CI Setup assessment shows that there are **2 high priority reachable findings** and **1 low priority non-reachable finding**. High priority findings need to be addressed immediately, while low priority findings can be addressed within a scheduled maintenance window.