const fs = require('fs');
const path = require('path');

/**
 * Safely update addresses.js file without creating duplicates
 * @param {Object} updates - Object with address name as key and address value as value
 * @param {string} addressesPath - Path to addresses.js file
 */
function updateAddresses(updates, addressesPath) {
  if (!fs.existsSync(addressesPath)) {
    throw new Error(`Addresses file not found: ${addressesPath}`);
  }

  let content = fs.readFileSync(addressesPath, 'utf8');
  
  // Track which addresses we've updated
  const updated = new Set();
  
  // Update each address
  for (const [name, value] of Object.entries(updates)) {
    if (!value || value === '0x0000000000000000000000000000000000000000') {
      continue; // Skip invalid addresses
    }
    
    const regex = new RegExp(`export const ${name}\\s*=\\s*"[^"]+";`, 'g');
    const newLine = `export const ${name} = "${value}";`;
    
    if (content.match(regex)) {
      // Replace existing declaration
      content = content.replace(regex, newLine);
      updated.add(name);
    } else {
      // Add new declaration at the end (before closing if any)
      // Find the last export const line
      const lastExportMatch = content.match(/(export const \w+Address = "[^"]+";\n)/g);
      if (lastExportMatch && lastExportMatch.length > 0) {
        const lastExport = lastExportMatch[lastExportMatch.length - 1];
        const insertIndex = content.lastIndexOf(lastExport) + lastExport.length;
        content = content.slice(0, insertIndex) + newLine + '\n' + content.slice(insertIndex);
        updated.add(name);
      } else {
        // No exports found, append at end
        content += '\n' + newLine + '\n';
        updated.add(name);
      }
    }
  }
  
  // Remove duplicates if any exist
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
        duplicates.push(name);
        continue;
      } else {
        seenNames.add(name);
      }
    }
    newLines.push(line);
  }
  
  // If duplicates were found, use cleaned content
  if (duplicates.length > 0) {
    content = newLines.join('\n');
  }
  
  // Write the updated content
  fs.writeFileSync(addressesPath, content, 'utf8');
  
  return {
    updated: Array.from(updated),
    duplicates: duplicates.length > 0 ? [...new Set(duplicates)] : null
  };
}

/**
 * Read all addresses from addresses.js file
 * @param {string} addressesPath - Path to addresses.js file
 * @returns {Object} Object with address name as key and address value as value
 */
function readAddresses(addressesPath) {
  if (!fs.existsSync(addressesPath)) {
    return {};
  }
  
  const content = fs.readFileSync(addressesPath, 'utf8');
  const addresses = {};
  
  // Match all export const AddressName = "0x..."; lines
  const regex = /export const (\w+Address)\s*=\s*"([^"]+)";/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    const name = match[1];
    const value = match[2];
    
    // Only keep the first occurrence (in case of duplicates)
    if (!addresses[name]) {
      addresses[name] = value;
    }
  }
  
  return addresses;
}

module.exports = {
  updateAddresses,
  readAddresses
};


