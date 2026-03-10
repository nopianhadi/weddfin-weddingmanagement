
const fs = require('fs');

const content = fs.readFileSync('D:/appbaruallweding/App.tsx', 'utf8');
const lines = content.split('\n');

let stack = [];
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
            } else if (char === '{') {
                stack.push({ line: i + 1, char: j + 1 });
            } else if (char === '}') {
                if (stack.length === 0) {
                    console.log(`Extra } at line ${i + 1}:${j + 1}`);
                } else {
                    stack.pop();
                }
            }
        }
    }
}

console.log('Unclosed { at:');
stack.forEach(s => console.log(`Line ${s.line}:${s.char}`));
