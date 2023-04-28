const fs = require('fs');
const pkg = require('./package.json');

const content = `export const version = '${pkg.version}';\n`;

fs.writeFileSync('src/version.ts', content);
