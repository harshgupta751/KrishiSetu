const fs = require('fs');
const path = require('path');

const globalsPath = path.join(__dirname, '../app/globals.css');
let css = fs.readFileSync(globalsPath, 'utf8');

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `${r} ${g} ${b}`;
}

// Find all CSS variables in :root and .dark and convert hex to rgb components
css = css.replace(/(--color-[a-z0-9-]+):\s*(#[0-9a-fA-F]{3,6});/g, (match, varName, hex) => {
  return `${varName}: ${hexToRgb(hex)};`;
});

fs.writeFileSync(globalsPath, css);
console.log("Updated globals.css to use RGB components.");

const tailwindPath = path.join(__dirname, '../tailwind.config.ts');
let tw = fs.readFileSync(tailwindPath, 'utf8');

// Replace "var(--color-name)" with "rgb(var(--color-name) / <alpha-value>)"
tw = tw.replace(/"var\((--color-[a-z0-9-]+)\)"/g, '`rgb(var($1) / <alpha-value>)`');

fs.writeFileSync(tailwindPath, tw);
console.log("Updated tailwind.config.ts to use <alpha-value>.");
