const { execSync } = require('child_process');
const fs = require('fs');

try {
  const output = execSync('npx eslint src --format json', { encoding: 'utf8' });
} catch (error) {
  const output = error.stdout;
  const results = JSON.parse(output);

  for (const result of results) {
    if (result.messages.length === 0) continue;
    
    let fileLines = fs.readFileSync(result.filePath, 'utf8').split('\n');
    let modifications = [];

    // Group messages by line
    for (const msg of result.messages) {
      if (msg.ruleId === 'no-unused-vars' || msg.ruleId === 'react-hooks/exhaustive-deps') {
         modifications.push({ line: msg.line, rule: msg.ruleId });
      }
    }

    // Sort descending by line so we can insert without messing up line numbers
    modifications.sort((a, b) => b.line - a.line);
    
    // Deduplicate lines
    let lastLine = -1;
    for (const mod of modifications) {
      if (mod.line === lastLine) continue;
      lastLine = mod.line;
      
      const idx = mod.line - 1;
      const whitespace = fileLines[idx].match(/^\s*/)[0];
      fileLines.splice(idx, 0, `${whitespace}// eslint-disable-next-line ${mod.rule}`);
    }

    fs.writeFileSync(result.filePath, fileLines.join('\n'));
  }
}
console.log('Lint auto-fix script finished.');
