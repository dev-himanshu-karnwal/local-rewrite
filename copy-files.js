const fs = require('fs');
const path = require('path');

// Files to copy from src to dist
const filesToCopy = [
  'manifest.json'
];

// Directories to copy
const dirsToCopy = [
  'icons',
  'popup',
  'background',
  'content'
];

function copyFile(src, dest) {
  try {
    fs.copyFileSync(src, dest);
    console.log(`✅ Copied: ${src} → ${dest}`);
  } catch (error) {
    console.error(`❌ Failed to copy ${src}:`, error.message);
  }
}

function copyDirectory(src, dest) {
  try {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    
    const files = fs.readdirSync(src);
    files.forEach(file => {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);
      
      if (fs.statSync(srcPath).isDirectory()) {
        copyDirectory(srcPath, destPath);
      } else {
        // Only copy non-TypeScript files
        if (!file.endsWith('.ts') && !file.endsWith('.tsx')) {
          copyFile(srcPath, destPath);
        }
      }
    });
  } catch (error) {
    console.error(`❌ Failed to copy directory ${src}:`, error.message);
  }
}

console.log('📁 Copying files to dist folder...\n');

// Copy individual files
filesToCopy.forEach(file => {
  const srcPath = path.join('src', file);
  const destPath = path.join('dist', file);
  
  if (fs.existsSync(srcPath)) {
    copyFile(srcPath, destPath);
  } else {
    console.warn(`⚠️  File not found: ${srcPath}`);
  }
});

// Copy directories
dirsToCopy.forEach(dir => {
  const srcPath = path.join('src', dir);
  const destPath = path.join('dist', dir);
  
  if (fs.existsSync(srcPath)) {
    copyDirectory(srcPath, destPath);
  } else {
    console.warn(`⚠️  Directory not found: ${srcPath}`);
  }
});

console.log('\n🎉 File copying completed!');
