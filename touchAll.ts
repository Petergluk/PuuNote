import fs from 'fs';
import path from 'path';

function walk(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist')) {
        results = results.concat(walk(file));
      }
    } else {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
files.push('package.json', 'vite.config.ts', 'index.html', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json');

const now = new Date();
let count = 0;
files.forEach(file => {
  try {
    if (fs.existsSync(file)) {
      fs.utimesSync(file, now, now);
      count++;
    }
  } catch (e) {
    console.error(`Failed to touch ${file}`, e);
  }
});
console.log(`Successfully touched ${count} files.`);
