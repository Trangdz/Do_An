const fs = require('fs');
const path = require('path');

/**
 * Clean duplicate declarations from addresses.js
 */
function cleanDuplicates() {
  const addressesPath = path.join(__dirname, "../lendhub-frontend-nextjs/src/addresses.js");
  
  if (!fs.existsSync(addressesPath)) {
    console.error("❌ addresses.js not found");
    process.exit(1);
  }

  let content = fs.readFileSync(addressesPath, 'utf8');
  const lines = content.split('\n');
  const newLines = [];
  const seenNames = new Set();
  const duplicates = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^export const (\w+Address)\s*=\s*"[^"]+";/);
    if (match) {
      const name = match[1];
      if (seenNames.has(name)) {
        // This is a duplicate, skip it
        duplicates.push({ name, line: i + 1 });
        continue;
      } else {
        seenNames.add(name);
      }
    }
    newLines.push(line);
  }
  
  if (duplicates.length > 0) {
    console.log(`\n🔍 Found ${duplicates.length} duplicate declaration(s):`);
    duplicates.forEach(dup => {
      console.log(`   - ${dup.name} (line ${dup.line})`);
    });
    
    // Write cleaned content
    const cleanedContent = newLines.join('\n');
    fs.writeFileSync(addressesPath, cleanedContent, 'utf8');
    console.log(`\n✅ Removed ${duplicates.length} duplicate(s) from addresses.js`);
  } else {
    console.log("\n✅ No duplicates found in addresses.js");
  }
  
  return duplicates.length;
}

cleanDuplicates();

