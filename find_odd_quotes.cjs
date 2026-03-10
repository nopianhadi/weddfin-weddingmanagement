
const fs = require('fs');
const content = fs.readFileSync('D:/appbaruallweding/App.tsx', 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const singleQuotes = (line.match(/'/g) || []).length;
    if (singleQuotes % 2 !== 0) {
        // Filter out cases where it might be in a backtick block or comment
        console.log(`Odd single quotes at line ${i + 1}: ${line.trim()}`);
    }
}
