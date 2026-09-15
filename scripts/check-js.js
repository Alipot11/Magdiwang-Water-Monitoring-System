const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.join(__dirname, '..');
const directories = [
    path.join(projectRoot, 'src')
];

const files = [];

function collectJavaScriptFiles(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const entryPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            collectJavaScriptFiles(entryPath);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            files.push(entryPath);
        }
    }
}

for (const directory of directories) {
    collectJavaScriptFiles(directory);
}

let failed = false;

for (const file of files) {
    const result = spawnSync(process.execPath, ['--check', file], {
        encoding: 'utf8'
    });

    if (result.status !== 0) {
        failed = true;
        console.error(`Syntax error: ${file}`);
        console.error(result.stderr);
    } else {
        console.log(`Passed: ${file}`);
    }
}

if (failed) {
    process.exit(1);
}

console.log(`JavaScript syntax check passed for ${files.length} file(s).`);