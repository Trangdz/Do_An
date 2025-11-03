const fs = require("fs");

// Test different formats
const formats = [
  {
    name: "Single quotes, JSON object without quotes",
    content: `type = "cron"
schemaVersion = 1
name = "Test"
schedule = "@every 1m"
observationSource = '''
encode [type="ethabiencode" abi="setPrice(uint256 value)" data={"value": $(multiply)}]
'''
  },
  {
    name: "Double quotes with escape",
    content: `type = "cron"
schemaVersion = 1
name = "Test"
schedule = "@every 1m"
observationSource = """
encode [type="ethabiencode" abi="setPrice(uint256 value)" data="{\\"value\\": $(multiply)}"]
"""
  },
  {
    name: "Single quotes, JSON object WITH quotes",
    content: `type = "cron"
schemaVersion = 1
name = "Test"
schedule = "@every 1m"
observationSource = '''
encode [type="ethabiencode" abi="setPrice(uint256 value)" data='{"value": $(multiply)}']
'''
  }
];

formats.forEach(fmt => {
  console.log(`\n=== ${fmt.name} ===`);
  const encodeLine = fmt.content.split("\n").find(l => l.includes("encode"));
  console.log("Encode line:", encodeLine);
  
  // Check what data format is extracted
  const dataMatch = encodeLine.match(/data=(.+?)(\]|})/);
  if (dataMatch) {
    console.log("Data part:", dataMatch[1]);
  }
});


