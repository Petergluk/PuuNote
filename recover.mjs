import fs from 'fs';
import path from 'path';

function fixComments(content) {
  // We want to replace "// text " followed by a keyword with "/* text */ keyword"
  // Keywords that usually start a new line after a comment:
  const keywords = ['const ', 'let ', 'var ', 'import ', 'export ', 'return ', 'if ', 'for ', 'while ', 'switch ', 'function ', 'use', 'setTimeout', 'document', 'window', 'try ', 'catch ', 'console', 'e.preventDefault', 'state.', 'setTimeout'];
  
  // Also common words starting lines like 'set', 'get', 'active', etc.
  
  let result = content;
  
  // Simple heuristic: find '//', then look forward for one of the keywords
  let i = 0;
  while ((i = result.indexOf('//', i)) !== -1) {
    let closestKeywordIndex = -1;
    let closestKeyword = '';
    
    // special cases for specific comments
    if (result.substring(i, i + 30).includes('// If clicked directly on the')) {
      const target = 'if (';
      let nextIf = result.indexOf(target, i + 2);
      result = result.substring(0, i) + '/* ' + result.substring(i+2, nextIf).trim() + ' */\n' + result.substring(nextIf);
      i += 2;
      continue;
    }

    for (const kw of keywords) {
      const idx = result.indexOf(kw, i + 2);
      // It must be within a reasonable distance, typically comments aren't 500 chars long
      if (idx !== -1 && idx - i < 200) {
        if (closestKeywordIndex === -1 || idx < closestKeywordIndex) {
          closestKeywordIndex = idx;
          closestKeyword = kw;
        }
      }
    }
    
    // Also check for } or { 
    const braceIdx = result.indexOf('}', i + 2);
    if (braceIdx !== -1 && braceIdx - i < 150) {
      if (closestKeywordIndex === -1 || braceIdx < closestKeywordIndex) {
        closestKeywordIndex = braceIdx;
      }
    }

    if (closestKeywordIndex !== -1) {
      const commentText = result.substring(i + 2, closestKeywordIndex).trim();
      result = result.substring(0, i) + '/* ' + commentText + ' */\n' + result.substring(closestKeywordIndex);
      i += 5; // move past '/* '
    } else {
      // Just make it a block comment until the end
      result = result.substring(0, i) + '/* ' + result.substring(i + 2) + ' */\n';
      break;
    }
  }
  
  return result;
}

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (!content.includes('\n') || content.split('\n').length < 4) {
        content = fixComments(content);
        // Also fix `?raw` module declaration
        content = content.replace("declare module '*?raw' { const src: string export default src }", "declare module '*?raw' { const src: string; export default src; }");

        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

processDir(path.join(process.cwd(), 'src'));
console.log('Fixed comments.');
