
const fs = require('fs');
const content = fs.readFileSync('D:/appbaruallweding/App.tsx', 'utf8');
const ticks = (content.match(/`/g) || []).length;
const doubleQuotes = (content.match(/"/g) || []).length;
const singleQuotes = (content.match(/'/g) || []).length;
console.log(`Ticks: ${ticks}, DoubleQuotes: ${doubleQuotes}, SingleQuotes: ${singleQuotes}`);
