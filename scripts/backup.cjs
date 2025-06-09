const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function createBackup(backupName) {
    const rootDir = path.join(__dirname, '..');
    const backupDir = path.join(rootDir, backupName);

    // Criar diretório de backup
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir);
    }

    // Lista de diretórios e arquivos para backup
    const itemsToBackup = [
        'src',
        'public',
        'scripts',
        'package.json',
        'package-lock.json',
        'vite.config.ts',
        'tsconfig.json',
        'tsconfig.app.json',
        'tsconfig.node.json',
        'tailwind.config.js',
        'postcss.config.js',
        'eslint.config.js',
        'index.html',
        '*.md'
    ];

    // Copiar arquivos e diretórios
    itemsToBackup.forEach(item => {
        const source = path.join(rootDir, item);
        const destination = path.join(backupDir, item);

        if (fs.existsSync(source)) {
            if (fs.lstatSync(source).isDirectory()) {
                execSync(`xcopy "${source}" "${destination}" /E /I /H /Y`);
            } else {
                fs.copyFileSync(source, destination);
            }
        }
    });

    console.log(`Backup criado com sucesso em: ${backupDir}`);
}

// Usar o nome do backup fornecido como argumento ou um nome padrão
const backupName = process.argv[2] || 'backup-v13';
createBackup(backupName); 