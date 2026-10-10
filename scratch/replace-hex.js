const fs = require('fs');
const path = require('path');

const colorMap = {
  '#0b1410': 'cropwise-bg',
  '#111d16': 'cropwise-surface',
  '#182419': 'cropwise-elevated',
  '#1f2f21': 'cropwise-hover',
  '#2a3d2c': 'cropwise-border',
  '#1e2d20': 'cropwise-border-muted',
  '#e8f5e9': 'cropwise-text',
  '#94a896': 'cropwise-muted',
  '#5a7460': 'cropwise-faint',
  '#2ea82e': 'cropwise-green',
  '#4dc24d': 'cropwise-green-light',
  '#f59e0b': 'cropwise-amber',
  '#0d1a10': 'cropwise-surface', // Map close ones
  '#3d5c40': 'cropwise-border',
  '#141f16': 'cropwise-elevated',
  '#3d4d3e': 'cropwise-faint',
  '#35c435': 'cropwise-green-light'
};

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      // Regular expression to match arbitrary Tailwind color classes, e.g. bg-[#0b1410]
      const regex = /([a-z-]+)-\[#([0-9a-fA-F]{3,6})\]/g;
      content = content.replace(regex, (match, prefix, hex) => {
        const fullHex = `#${hex.toLowerCase()}`;
        if (colorMap[fullHex]) {
          changed = true;
          return `${prefix}-${colorMap[fullHex]}`;
        }
        return match;
      });

      // Also replace rgb arbitrary values if we need to? Or text opacity?
      // Let's just do hex for now.
      
      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDir(path.join(__dirname, '..', 'app'));
processDir(path.join(__dirname, '..', 'components'));
console.log("Done replacing hex colors.");
