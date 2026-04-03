#!/usr/bin/env node
// Script de versioning : bump semver dans package.json + app.json, commit + tag git
// Usage : node scripts/bump-version.js [patch|minor|major]

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const BUMP_TYPE = process.argv[2] || "patch";
if (!["patch", "minor", "major"].includes(BUMP_TYPE)) {
  console.error("Usage: node scripts/bump-version.js [patch|minor|major]");
  process.exit(1);
}

function bumpVersion(version, type) {
  const parts = version.split(".").map(Number);
  if (type === "major") {
    parts[0]++;
    parts[1] = 0;
    parts[2] = 0;
  } else if (type === "minor") {
    parts[1]++;
    parts[2] = 0;
  } else {
    parts[2]++;
  }
  return parts.join(".");
}

// Lire package.json
const pkgPath = path.resolve(__dirname, "..", "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
const oldVersion = pkg.version;
const newVersion = bumpVersion(oldVersion, BUMP_TYPE);

// Mettre à jour package.json
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

// Mettre à jour app.json
const appJsonPath = path.resolve(__dirname, "..", "app.json");
const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf-8"));
appJson.expo.version = newVersion;
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + "\n");

console.log(`Version: ${oldVersion} → ${newVersion} (${BUMP_TYPE})`);

// Git commit + tag
try {
  execSync("git add package.json app.json", { stdio: "inherit" });
  execSync(`git commit -m "release: v${newVersion}"`, { stdio: "inherit" });
  execSync(`git tag v${newVersion}`, { stdio: "inherit" });
  console.log(
    `Tag v${newVersion} créé. Push avec : git push && git push --tags`,
  );
} catch (e) {
  console.error("Erreur git:", e.message);
  process.exit(1);
}
