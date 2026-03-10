
const fs = require('fs');

const content = fs.readFileSync('D:/appbaruallweding/App.tsx', 'utf8');
const lines = content.split('\n');

let braceCount = 0;
let parenCount = 0;
let bracketCount = 0;
let inString = false;
let stringChar = '';

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (inString) {
            if (char === stringChar && line[j - 1] !== '\\') {
                inString = false;
            }
        } else {
            if (char === '"' || char === "'" || char === '`') {
                inString = true;
                stringChar = char;
            } else if (char === '{') braceCount++;
            else if (char === '}') braceCount--;
            else if (char === '(') parenCount++;
            else if (char === ')') parenCount--;
            else if (char === '[') bracketCount++;
            else if (char === ']') bracketCount--;
        }
    }
    if (braceCount < 0 || parenCount < 0 || bracketCount < 0) {
        console.log(`Unbalanced at line ${i + 1}: Braces: ${braceCount}, Parens: ${parenCount}, Brackets: ${bracketCount}`);
        // break; // keep going to see if it recovers
    }
}

console.log(`Final counts: Braces: ${braceCount}, Parens: ${parenCount}, Brackets: ${bracketCount}`);
