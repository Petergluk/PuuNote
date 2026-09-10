const fs = require('fs');
console.log(fs.readFileSync('src/components/Card.tsx', 'utf-8').split('\n').slice(350, 400).join('\n'));
