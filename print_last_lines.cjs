
const fs = require('fs');
const content = fs.readFileSync('D:/appbaruallweding/App.tsx', 'utf8');
const lines = content.split('\n');
lines.slice(1765).forEach((line, i) => {
    console.log(`${1766 + i}: ${line}`);
});
