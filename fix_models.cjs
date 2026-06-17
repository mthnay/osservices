const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'server', 'models');
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js'));

for (const file of files) {
    const filePath = path.join(modelsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Parse collection name from: export default new FirestoreModel('collectionName');
    const match = content.match(/new FirestoreModel\('([^']+)'\)/);
    if (match) {
        const collectionName = match[1];
        const newContent = `import { createModel } from '../firebaseDb.js';\nexport default createModel('${collectionName}');\n`;
        fs.writeFileSync(filePath, newContent);
    }
}
