#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const project = require(path.join(root, "package.json"));

const accepted = ["MIT", "Apache-2.0", "ISC", "BSD-2-Clause"];
const review = ["BSD-3-Clause"];
const prohibited = /AGPL|GPL|SSPL|BUSL/i;
const restrictive = /revenue threshold|annual recurring revenue|field of use|paid commercial licen[cs]e|competes with|commercial offering/i;

const dependencies = {
  ...project.dependencies,
  ...project.devDependencies,
};

const results = [];

for (const name of Object.keys(dependencies).sort()) {
  const directory = path.join(root, "node_modules", ...name.split("/"));
  const metadata = require(path.join(directory, "package.json"));
  const licence = String(metadata.license || "UNKNOWN");

  const licenceFile = fs
    .readdirSync(directory)
    .find((file) => /^licen[cs]e/i.test(file));

  const text = licenceFile
    ? fs.readFileSync(path.join(directory, licenceFile), "utf8")
    : "";

  let result = "ACCEPTED";
  let reason = licence;

  // Dual licences require review, even when one option is permissive.
  if (/\bOR\b|\bAND\b/i.test(licence)) {
    result = "REVIEW";
    reason = "Dual or compound licence";
  } else if (restrictive.test(text)) {
    result = "REVIEW";
    reason = "Restrictive terms in licence text";
  } else if (prohibited.test(licence) || prohibited.test(text)) {
    result = "PROHIBITED";
    reason = "Copyleft or source-available licence";
  } else if (review.includes(licence) || !accepted.includes(licence)) {
    result = "REVIEW";
    reason = "Manual policy review required";
  }

  results.push({
    name,
    version: metadata.version,
    licence,
    result,
    reason,
  });
}

const prohibitedPackages = results.filter((item) => item.result === "PROHIBITED");
const reviewPackages = results.filter((item) => item.result === "REVIEW");

for (const item of [...prohibitedPackages, ...reviewPackages]) {
  console.log(
    `${item.result}: ${item.name}@${item.version} (${item.licence}) - ${item.reason}`,
  );
}

fs.writeFileSync(
  path.join(root, "license-check-result.json"),
  JSON.stringify(
    {
      prohibited: prohibitedPackages,
      review: reviewPackages,
    },
    null,
    2,
  ),
);

if (prohibitedPackages.length > 0) {
  process.exit(1);
}