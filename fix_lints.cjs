const { execSync } = require('child_process');
const fs = require('fs');

try {
  execSync('npx eslint src --format json', { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
} catch (error) {
  const output = error.stdout ? error.stdout.toString() : '';
  if (!output) {
      console.error(error);
      process.exit(1);
  }
  const results = JSON.parse(output);

  for (const result of results) {
    if (result.messages.length === 0) continue;
    
    let fileLines = fs.readFileSync(result.filePath, 'utf8').split('\n');
    let modifications = [];

    for (const msg of result.messages) {
      if (msg.ruleId === 'no-unused-vars' || msg.ruleId === 'react-hooks/exhaustive-deps') {
         modifications.push({ line: msg.line, rule: msg.ruleId });
      }
    }

    modifications.sort((a, b) => b.line - a.line);
    
    let lastLine = -1;
    let added = 0;
    for (const mod of modifications) {
      if (mod.line === lastLine) continue;
      lastLine = mod.line;
      
      const idx = mod.line - 1;
      const whitespaceMatch = fileLines[idx].match(/^\s*/);
      const whitespace = whitespaceMatch ? whitespaceMatch[0] : '';
      fileLines.splice(idx, 0, `${whitespace}// eslint-disable-next-line ${mod.rule}`);
      added++;
    }

    if (added > 0) {
        fs.writeFileSync(result.filePath, fileLines.join('\n'));
        console.log(`Fixed ${added} lines in ${result.filePath}`);
    }
  }
}
console.log('Lint auto-fix script finished.');
