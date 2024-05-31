const fs = require('fs');

const url = 'https://public.sync-stage.com/agent/compatibility-matrix.json';
const path = './src/compatibility-matrix.ts';

import('node-fetch').then(({ default: fetch }) => {
  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      const content = `export const compatibilityMatrix = '${JSON.stringify(data)}';\n`;
      fs.writeFileSync(path, content);
    })
    .catch((error) => console.error(`Error: ${error}`));
});
