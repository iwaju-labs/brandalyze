const fs = require('fs');
const path = require('path');

console.log('📦 Brandalyze Extension Packager');
console.log('==================================');

// Get project paths
const projectRoot = __dirname;
const extensionDir = path.join(projectRoot, 'apps', 'extension');
const manifestPath = path.join(extensionDir, 'manifest.json');

// Read version from manifest
if (!fs.existsSync(manifestPath)) {
    console.log('❌ Manifest file not found');
    process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const version = manifest.version;

console.log(`📋 Extension version: ${version}`);

// Define zip name and path
const zipName = `brandalyze-extension-v${version}.zip`;
const zipPath = path.join(projectRoot, zipName);

console.log(`📁 Output file: ${zipName}`);

// Clean up old zip files
console.log('🧹 Cleaning up old extension packages...');
const files = fs.readdirSync(projectRoot);
const oldZips = files.filter(file => file.startsWith('brandalyze-extension') && file.endsWith('.zip'));
for (const file of oldZips) {
    console.log(`   Removing: ${file}`);
    fs.unlinkSync(path.join(projectRoot, file));
}

// Files and directories to exclude
const excludePatterns = [
    'node_modules',
    '.git',
    'src',
    'package.json',
    'package-lock.json',
    'yarn.lock',
    'tailwind.config.js',
    'copy-icons.js'
];

const excludeFiles = [
    '.DS_Store',
    'Thumbs.db',
    '.log',
    '.tmp',
    '.temp'
];

// Function to check if path should be excluded
function shouldExclude(relativePath) {
    const pathParts = relativePath.split(path.sep);
    
    // Check if any part of the path matches exclude patterns
    for (const pattern of excludePatterns) {
        if (pathParts.includes(pattern)) {
            return true;
        }
    }
    
    // Check file extensions and names
    const filename = path.basename(relativePath);
    for (const pattern of excludeFiles) {
        if (filename === pattern || filename.endsWith(pattern)) {
            return true;
        }
    }
    
    return false;
}

// Create zip using PowerShell
console.log('📦 Creating extension package...');

try {
    // Create temp directory
    const tempDir = path.join(process.env.TEMP || '/tmp', 'brandalyze-extension-temp');
    
    // Remove temp dir if exists
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
    
    // Create temp dir
    fs.mkdirSync(tempDir, { recursive: true });
    
    // Copy files recursively while excluding patterns
    function copyRecursive(srcDir, destDir, basePath = '') {
        const items = fs.readdirSync(srcDir);
        
        for (const item of items) {
            const srcPath = path.join(srcDir, item);
            const relativePath = path.join(basePath, item);
            
            if (shouldExclude(relativePath)) {
                continue;
            }
            
            const destPath = path.join(destDir, item);
            const stat = fs.statSync(srcPath);
            
            if (stat.isDirectory()) {
                fs.mkdirSync(destPath, { recursive: true });
                copyRecursive(srcPath, destPath, relativePath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }
    
    // Copy extension files to temp directory
    copyRecursive(extensionDir, tempDir);
    
    // Create PowerShell command to zip the temp directory
    const psCommand = `Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${tempDir.replace(/\\/g, '\\\\')}', '${zipPath.replace(/\\/g, '\\\\')}')`;
    
    require('child_process').execSync(`powershell -Command "${psCommand}"`, { stdio: 'pipe' });
    
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    console.log('✅ Extension packaged successfully!');
    console.log(`📍 Location: ${zipPath}`);
    
    // Show file size
    const stats = fs.statSync(zipPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`📏 File size: ${sizeMB} MB`);
    
    console.log('');
    console.log('🚀 Ready for Chrome Web Store upload!');
    
} catch (error) {
    console.log(`❌ Failed to create package: ${error.message}`);
    process.exit(1);
}
