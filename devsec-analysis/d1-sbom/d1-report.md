# Deliverable 1 - Software Bill of Materials (SBOM)

## Objective

Generate a Software Bill of Materials (SBOM) for the application and analyze it.


## Tool Used & Commands

- Tool: cyclonedx-npm v6.0.0
- Node.js: v20.19.6
- npm: v10.8.2

Command used for generating the report: 
```bash
cyclonedx-npm --output-file devsec-analysis/d1-sbom/sbom.json
```


## Output

The SBOM inventories `153` npm components including direct and indirect dependencies. 

Table of direct packages (total is `19` packages): 

| Package | Version | PURL | License | Hash Algorithm | Hash |
|---------|---------|------|---------|----------------|------|
| axios | 1.18.1 | pkg:npm/axios@1.18.1 | MIT | SHA-512 | `de74ef165be99fd66efd...` |
| convo-insights | 0.7.1 | pkg:npm/convo-insights@0.7.1 | AGPL-3.0-only | Not present | Not present in SBOM |
| cors | 2.8.6 | pkg:npm/cors@2.8.6 | MIT | SHA-512 | `b49b590411c0eaf8c801...` |
| dayjs | 1.11.21 | pkg:npm/dayjs@1.11.21 | MIT | SHA-512 | `f7c213f8739a8408ac89...` |
| dotenv-extened | 2.9.4 | pkg:npm/dotenv-extened@2.9.4 | MIT | Not present | Not present in SBOM |
| dotenv | 17.4.2 | pkg:npm/dotenv@17.4.2 | BSD-2-Clause | SHA-512 | `9c8e14dd3a2db4a01c00...` |
| express-rate-limit | 8.6.1 | pkg:npm/express-rate-limit@8.6.1 | MIT | SHA-512 | `d03e3ddda3fad70d1327...` |
| express | 4.22.2 | pkg:npm/express@4.22.2 | MIT | SHA-512 | `22e2fe125ae8bb666f08...` |
| helmet | 8.3.0 | pkg:npm/helmet@8.3.0 | MIT | SHA-512 | `420a626b0b374a6df402...` |
| joi | 18.2.3 | pkg:npm/joi@18.2.3 | BSD-3-Clause | SHA-512 | `379037293590a4f593e0...` |
| jsonwebtoken | 9.0.3 | pkg:npm/jsonwebtoken@9.0.3 | MIT | SHA-512 | `313ff13f40abb9b15134...` |
| jszip | 3.10.1 | pkg:npm/jszip@3.10.1 | (MIT OR GPL-3.0-or-later) | SHA-512 | `c570ef79cc93a462eba8...` |
| lodash | 4.17.15 | pkg:npm/lodash@4.17.15 | MIT | SHA-512 | `f3139c447bc28e7a1c75...` |
| mkdirp | 0.5.1 | pkg:npm/mkdirp@0.5.1 | MIT | SHA-512 | `4a49c90b9da86cf7c640...` |
| morgan | 1.11.0 | pkg:npm/morgan@1.11.0 | MIT | SHA-512 | `cd2915bb7b75f2bdfda7...` |
| msgfmt-lite | 1.3.0 | pkg:npm/msgfmt-lite@1.3.0 | MIT | Not present | Not present in SBOM |
| pg | 8.22.0 | pkg:npm/pg@8.22.0 | MIT | SHA-512 | `f308a1d6f54804cc6850...` |
| supertest | 7.2.2 | pkg:npm/supertest@7.2.2 | MIT | SHA-512 | `a0af161bd7624b70e585...` |
| uuid | 14.0.1 | pkg:npm/uuid@14.0.1 | MIT | SHA-512 | `e99c73569cc35c36b76c...` |

`supertest@7.2.2` is a development dependency. The remaining 18 direct packages are runtime dependencies.

## What this SBOM misses

This is a source/dependency SBOM and is not an attestation of the final production container.

Current limitations include:

- This source/dependency SBOM inventories npm packages only. It does not inventory the Node.js runtime, Alpine Linux packages, application container image, PostgreSQL container image, or resolved image digests. A separate container-image SBOM is required to represent the deployed environment.

- The build production image used in the dockerfile is `node:20.14-alpine` while the SBOM was generated using `node:20.19`. Therefore, the generation environment does not exactly match the deployed runtime. `node:20` is already EOL, thus there is a need to migrate this service to `node:24`.    

- Three locally vendored packages generated have no distribution hash and no source references, those packages are `convo-insights` , `dotenv-extened`, `msgfmt-lite`. This means that the SBOM generated can't verify these components' origin or integrity. 

- `dotenv-extened` defines a post-install hook that writes environment variable names to a temporary file. These `install-time` scripts execute during dependency installation, and represent a supply-chain risk if the code is modified. The SBOM inventories the package but does not describe or assess install-script behavior. 

- Regarding license assessment, the generated SBOM report declared package licenses but does not independently evaluate these packages against organizational policies. This will be done in `./devsec-analysis/d3-license-classification` report. 


## Conclusion

The generated CycloneDX SBOM provides a standardized inventory of the application's dependencies and forms the basis for the vulnerability and license analysis performed in later deliverables.