const fs = require('fs');
const path = require('path');

// Copy specific Lucide icons to assets folder
const iconsNeeded = ['twitter', 'linkedin'];
const sourceDir = 'node_modules/lucide/icons';
const targetDir = 'assets/icons';

// Create target directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

iconsNeeded.forEach(iconName => {
    const sourcePath = path.join(sourceDir, `${iconName}.svg`);
    const targetPath = path.join(targetDir, `${iconName}.svg`);
    
    if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`Copied ${iconName}.svg`);
    } else {
        console.log(`Warning: ${iconName}.svg not found in Lucide icons`);
    }
});

console.log('Icon copying complete!');
