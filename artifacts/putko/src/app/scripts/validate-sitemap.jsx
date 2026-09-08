#!/usr/bin/env node

/**
 * Sitemap Validation Script
 * Run this script to validate your sitemap setup
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Sitemap Setup...\n');

// Check if required files exist
const requiredFiles = [
  'src/app/sitemap.js',
  'src/app/seo-config.js',
  'src/utils/sitemapGenerator.js',
  'public/robots.txt'
];

console.log('📁 Checking required files:');
let allFilesExist = true;

requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(process.cwd(), file));
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

console.log('');

// Check environment variables
console.log('🔧 Checking environment setup:');
const envFile = path.join(process.cwd(), '.env.local');
const envExists = fs.existsSync(envFile);

if (envExists) {
  console.log('  ✅ .env.local file exists');
  const envContent = fs.readFileSync(envFile, 'utf8');
  if (envContent.includes('NEXT_PUBLIC_BASE_URL')) {
    console.log('  ✅ NEXT_PUBLIC_BASE_URL is configured');
  } else {
    console.log('  ⚠️  NEXT_PUBLIC_BASE_URL not found in .env.local');
  }
} else {
  console.log('  ⚠️  .env.local file not found');
  console.log('  💡 Create .env.local with NEXT_PUBLIC_BASE_URL=https://yourdomain.com');
}

console.log('');

// Check package.json for required dependencies
console.log('📦 Checking dependencies:');
const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));

const requiredDeps = ['next', 'react'];
requiredDeps.forEach(dep => {
  if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
    console.log(`  ✅ ${dep} is installed`);
  } else {
    console.log(`  ❌ ${dep} is missing`);
    allFilesExist = false;
  }
});

console.log('');

// Summary
if (allFilesExist) {
  console.log('🎉 Sitemap setup validation passed!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Update your domain in the configuration files');
  console.log('2. Set NEXT_PUBLIC_BASE_URL in .env.local');
  console.log('3. Run "npm run build" to generate the sitemap');
  console.log('4. Test your sitemap at /sitemap.xml');
  console.log('5. Submit to Google Search Console');
} else {
  console.log('❌ Some issues were found. Please fix them before proceeding.');
  console.log('');
  console.log('Common fixes:');
  console.log('- Create missing files');
  console.log('- Install missing dependencies');
  console.log('- Check file paths and permissions');
}

console.log('');
console.log('📚 For detailed instructions, see SITEMAP_README.md'); 