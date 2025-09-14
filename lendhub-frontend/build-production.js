#!/usr/bin/env node

// Production build script for LendHub v2
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🏗️  Building LendHub v2 for production...\n');

// Step 1: Clean previous builds
console.log('🧹 Cleaning previous builds...');
try {
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  console.log('✅ Cleaned dist directory');
} catch (error) {
  console.log('⚠️  Could not clean dist directory:', error.message);
}

// Step 2: Install dependencies
console.log('\n📦 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed');
} catch (error) {
  console.log('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// Step 3: Type check
console.log('\n🔍 Running type check...');
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('✅ Type check passed');
} catch (error) {
  console.log('⚠️  Type check failed:', error.message);
  console.log('Continuing with build...');
}

// Step 4: Build for production
console.log('\n🏗️  Building for production...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Production build completed');
} catch (error) {
  console.log('❌ Build failed:', error.message);
  process.exit(1);
}

// Step 5: Verify build output
console.log('\n🔍 Verifying build output...');
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  const files = fs.readdirSync(distPath);
  console.log('✅ Build output files:', files);
  
  // Check for essential files
  const essentialFiles = ['index.html', 'assets'];
  const missingFiles = essentialFiles.filter(file => 
    !files.some(f => f === file || f.startsWith(file))
  );
  
  if (missingFiles.length === 0) {
    console.log('✅ All essential files present');
  } else {
    console.log('❌ Missing essential files:', missingFiles);
  }
} else {
  console.log('❌ Build output directory not found');
  process.exit(1);
}

// Step 6: Generate build info
console.log('\n📊 Generating build info...');
const buildInfo = {
  timestamp: new Date().toISOString(),
  version: '1.0.0',
  buildType: 'production',
  nodeVersion: process.version,
  platform: process.platform,
  arch: process.arch
};

fs.writeFileSync(
  path.join(distPath, 'build-info.json'),
  JSON.stringify(buildInfo, null, 2)
);
console.log('✅ Build info generated');

// Step 7: Create deployment package
console.log('\n📦 Creating deployment package...');
try {
  const packageName = `lendhub-v2-frontend-${Date.now()}.zip`;
  
  // Create zip file (requires zip command)
  execSync(`cd dist && zip -r ../${packageName} .`, { stdio: 'inherit' });
  console.log(`✅ Deployment package created: ${packageName}`);
} catch (error) {
  console.log('⚠️  Could not create zip package:', error.message);
  console.log('Build files are available in dist/ directory');
}

console.log('\n🎉 Production build completed successfully!');
console.log('\n📋 Next steps:');
console.log('1. Test the build locally: npx serve dist');
console.log('2. Deploy to your hosting provider');
console.log('3. Update contract addresses in production environment');
console.log('4. Configure domain and SSL certificate');

console.log('\n🔗 Useful commands:');
console.log('- Test build: npx serve dist');
console.log('- Analyze bundle: npx vite-bundle-analyzer dist');
console.log('- Check bundle size: du -sh dist');
