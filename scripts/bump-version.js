const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = require(packageJsonPath);

const versionParts = packageJson.version.split('.').map(Number);
versionParts[2] += 1;
const newVersion = versionParts.join('.');

packageJson.version = newVersion;

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(newVersion);
