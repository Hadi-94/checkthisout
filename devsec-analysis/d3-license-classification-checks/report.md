# Deliverable 3 - License Classification and Check

## Objective

Classify every direct dependency against the supplied OSS license policy by reviewing the actual license text, and design a PR-time check that meets the three required criteria.

## Tools Used

| Tool | Purpose |
|---|---|
| CycloneDX SBOM | Identify direct dependencies and declared licenses |
| `license-checker` | Locate package license files and package metadata |
| Manual license review | Verify the actual license text and identify hidden restrictions |
| `check-licenses.js` | Apply the supplied license policy to direct dependencies |
| GitHub Actions | Run the license check when dependency-related files change in a pull request |

## Policy Applied

- Blue Oak **Model, Gold, or Silver**: Accepted
- Blue Oak **Bronze, Lead, unrated, or dual-licensed**: Review required
- **GPL, AGPL, SSPL, BUSL, other copyleft, or source-available licenses**: Prohibited
- A permissive SPDX value is not accepted automatically when the actual license text contains restrictive, field-of-use, commercial, or ARR-gated terms.

## Direct Dependency Classification

| Package | Version | Declared License | Text Review | Classification | Final Status |
|---|---|---|---|---|---|
| axios | 1.18.1 | MIT | Standard MIT text | Accepted | Approved |
| convo-insights | 0.7.1 | AGPL-3.0-only | AGPL network copyleft terms confirmed | **Prohibited** | **Rejected** |
| cors | 2.8.6 | MIT | Standard MIT text | Accepted | Approved |
| dayjs | 1.11.21 | MIT | Standard MIT text | Accepted | Approved |
| dotenv-extened | 2.9.4 | MIT | Standard MIT text | Accepted | Approved |
| dotenv | 17.4.2 | BSD-2-Clause | Standard BSD-2-Clause text | Accepted | Approved |
| express-rate-limit | 8.6.1 | MIT | Standard MIT text | Accepted | Approved |
| express | 4.22.2 | MIT | Standard MIT text | Accepted | Approved |
| helmet | 8.3.0 | MIT | Standard MIT text | Accepted | Approved |
| joi | 18.2.3 | BSD-3-Clause | Standard BSD-3-Clause text | **Review** | **Approved** after review |
| jsonwebtoken | 9.0.3 | MIT | Standard MIT text | Accepted | Approved |
| jszip | 3.10.1 | MIT OR GPL-3.0-or-later | Explicit dual-license choice | **Review** | **Approved** (MIT selected) |
| lodash | 4.17.15 | MIT | Standard MIT text | Accepted | Approved |
| mkdirp | 0.5.1 | MIT | Standard MIT text | Accepted | Approved |
| morgan | 1.11.0 | MIT | Standard MIT text | Accepted | Approved |
| msgfmt-lite | 1.3.0 | MIT | Contains ARR, field-of-use, competition, reporting, and termination restrictions | **Review** | **Rejected** |
| pg | 8.22.0 | MIT | Standard MIT text | Accepted | Approved |
| supertest | 7.2.2 | MIT | Standard MIT text | Accepted | Approved |
| uuid | 14.0.1 | MIT | Standard MIT text | Accepted | Approved |

## Findings

### LIC-001 - `convo-insights`

- **License:** `AGPL-3.0-only`
- **Classification:** Prohibited

The actual license text confirms that the package is licensed under AGPLv3. The license includes network copyleft obligations that may require modified source code to be offered to users who interact with the software over a network.

**Review Result:** After reviewing the license file, some few issues respond.io should be careful with:
- `convo-hub-api` is a backend service. `convo-insights` license is specifically designed for `network-server software` as it mentions in preamble.
-  respond.io is obligated to **disclose its source code to its users** if they are using `convo-hub-api` or any other commercial, closed-source SaaS products that uses this package. As clearly stated `if the program is modified and users interact with it remotely, those users must be offered the corresponding source code.`

**Recommendation:** Replace the package with a permissively licensed alternative or obtain a separate commercial license from the copyright holder.

### LIC-002 - `jszip`

- **License:** `MIT OR GPL-3.0-or-later`
- **Classification:** Review

The license file explicitly allows the user to choose either MIT or GPLv3. The project can use the permissive MIT option, but the choice should be documented.

**Review Result:** After reviewing the license file, clearly mentions `JSZip is dual licensed. At your choice you may use it under the MIT license or the GPLv3 license`. Due to this, respond.io need to classify if `convo-hub-api` and its other commercial, closed-source SaaS products is using this package under MIT or GPLv3.  

**Recommendation:** Record that `convo-hub-api` uses `jszip` under the `MIT option` and retain the required copyright and license notice.

### LIC-003 - `joi`

- **License:** `BSD-3-Clause`
- **Classification:** Review

The actual license is the standard BSD-3-Clause license. It is permissive, but the supplied policy places Blue Oak Bronze licenses into manual review.

**Review Result:** After reviewing the license file, clearly mentions `Redistribution and use in source and binary forms, with or without modification, are permitted`. In this case, it allows respond.io to use the package in `convo-hub-api` and other commercial, closed-source SaaS products. 

**Recommendation:** Considered to be **Approved**, after manually reviewing the license. 

### LIC-004 - `msgfmt-lite`

- **Declared license:** MIT
- **Classification:** Review

The license file begins with MIT terms but adds restrictions that are not represented by the declared SPDX field. These include an annual-revenue threshold, field-of-use restrictions, restrictions on competing services, reporting requirements, and immediate termination for use outside the stated limits.

**Review Result:** After reviewing the license file, clearly mentions:
`Revenue threshold: Use of the Software in or in support of a commercial product or service by an entity whose annual recurring revenue, together with that of its affiliates, exceeds one million United States dollars (USD 1,000,000) requires a paid commercial license`
This means that in order for respond.io to use this library in `convo-hub-api` and any other commercial, closed-source SaaS product, will need to obtain a commercial license. Otherwise, respond.io will be prohibited from using the package depending on company revenue and product use. Moreover, Treating it as normal MIT would create legal and commercial risk to respond.io.

**Recommendation:** Considered to be **Rejected**, until respond.io obtain legal and commercial approval, acquire a commercial license, or replace the package.

## PR-Time Check

The repository includes:

```text
 devsec-analysis/d3-license-classification-checks/check-licenses.js
 .github/workflows/pr-license-check.yml
```

The check evaluates direct dependencies and applies the following behavior:

| Result | PR behavior |
|---|---|
| MIT, Apache-2.0, ISC, and other accepted policy licenses with no hidden restrictions | Pass with no label or comment |
| GPL, AGPL, SSPL, BUSL, other copyleft, or source-available licenses | Fail the PR check |
| Dual-licensed, Bronze, Lead, unrated, or restrictive-text dependencies | Add `license-review-needed` and post a comment without blocking the PR by themselves |

The workflow uses a read-only scan job to execute pull-request code. A separate job receives `pull-requests: write` only to add the review label and comment and does not check out or execute pull-request code.

## Validation Result

The local check produced:

```text
PROHIBITED: convo-insights@0.7.1 (AGPL-3.0-only) - Copyleft or source-available license
REVIEW: joi@18.2.3 (BSD-3-Clause) - Manual policy review required
REVIEW: jszip@3.10.1 ((MIT OR GPL-3.0-or-later)) - Dual or compound license
REVIEW: msgfmt-lite@1.3.0 (MIT) - Restrictive terms in license text
```

The check exits with a non-zero status because a prohibited dependency is present. Review findings are written separately so that the workflow can apply the required label and comment.

## Conclusion

The assessment identified **2 REJECTED** dependencies and **2 APPROVED** dependencies after doing manual review. The most significant license risks are `convo-insights` and `msgfmt-lite`. The PR-time check enforces the supplied policy and also detects restrictions hidden in actual license text rather than relying only on package metadata.
