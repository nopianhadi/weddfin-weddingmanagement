
const fs = require('fs');
const content = fs.readFileSync('D:/appbaruallweding/App.tsx', 'utf8');
const lines = content.split('\n');

let stack = [];
let inString = false;
let stringChar = '';
let inMultilineComment = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
        if (inMultilineComment) {
            if (line[j] === '*' && line[j + 1] === '/') {
                inMultilineComment = false;
                j++;
            }
            continue;
        }
        if (inString) {
            if (line[j] === stringChar && line[j - 1] !== '\\') {
                inString = false;
            }
            continue;
        }
        if (line[j] === '/' && line[j + 1] === '/') break;
        if (line[j] === '/' && line[j + 1] === '*') {
            inMultilineComment = true;
            j++; continue;
        }

        const char = line[j];
        if (char === '"' || char === "'" || char === '`') {
            inString = true;
            stringChar = char;
        } else if (char === '{' || char === '(' || char === '[') {
            stack.push({ char, line: i + 1, col: j + 1 });
        } else if (char === '}' || char === ')' || char === ']') {
            if (stack.length === 0) {
                console.log(`Extra ${char} at line ${i + 1}:${j + 1}`);
            } else {
                const last = stack[stack.length - 1];
                if ((char === '}' && last.char === '{') ||
                    (char === ')' && last.char === '(') ||
                    (char === ']' && last.char === '[')) {
                    stack.pop();
                } else {
                    console.log(`Mismatched ${char} at line ${i + 1}:${j + 1}, expected closer for ${last.char} from line ${last.line}`);
                }
            }
        }
    }
}

console.log('Unclosed items:');
stack.forEach(s => console.log(`${s.char} from line ${s.line}:${s.col}`));
