import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

function isValidZipFile(filePath) {
  try {
    // Check if file exists and is readable
    fs.accessSync(filePath, fs.constants.R_OK);
    
    // Read the first 4 bytes to check for ZIP magic number
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(4);
    fs.readSync(fd, buffer, 0, 4, 0);
    fs.closeSync(fd);
    
    // ZIP files start with PK\x03\x04
    return buffer[0] === 0x50 && buffer[1] === 0x4B && 
           buffer[2] === 0x03 && buffer[3] === 0x04;
  } catch (error) {
    console.error(`Error checking zip file: ${error.message}`);
    return false;
  }
}

async function restoreBackup(backupFile) {
  if (!backupFile) {
    // List available backups
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      console.error('Backup directory not found!');
      process.exit(1);
    }

    const backups = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup-') && file.endsWith('.zip'))
      .sort()
      .reverse();

    if (backups.length === 0) {
      console.error('No backups found!');
      process.exit(1);
    }

    console.log('Available backups:');
    backups.forEach((backup, index) => {
      const stats = fs.statSync(path.join(backupDir, backup));
      const size = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`${index + 1}. ${backup} (${size} MB)`);
    });
    process.exit(0);
  }

  const backupDir = path.join(__dirname, '..', 'backups');
  const backupPath = path.join(backupDir, backupFile);

  // Validate backup file existence
  if (!fs.existsSync(backupPath)) {
    console.error(`Error: Backup file not found: ${backupFile}`);
    process.exit(1);
  }

  console.log(`Validating backup file: ${backupFile}`);
  
  // Validate zip file format
  if (!isValidZipFile(backupPath)) {
    console.error(`Error: Invalid or corrupted zip file: ${backupFile}`);
    console.error('Please ensure the backup file is a valid ZIP archive.');
    process.exit(1);
  }

  // Create temp directory for extraction
  const tempDir = path.join(__dirname, '..', 'temp');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    console.log("Opening backup file...");
    
    // Validate backup file size
    const stats = fs.statSync(backupPath);
    if (stats.size === 0) {
      throw new Error('Backup file is empty');
    }

    console.log(`Backup file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    // Try to open and validate the zip file
    let zip;
    try {
      zip = new AdmZip(backupPath);
      console.log("Successfully opened zip file");
    } catch (error) {
      throw new Error(`Failed to open zip file: ${error.message}`);
    }

    // Validate zip entries
    const zipEntries = zip.getEntries();
    if (!zipEntries || zipEntries.length === 0) {
      throw new Error('Zip file contains no entries');
    }

    console.log(`Found ${zipEntries.length} entries in the zip file`);

    // Validate zip file structure
    const requiredFiles = ['package.json', 'vite.config.ts', 'src/main.tsx'];
    const foundFiles = requiredFiles.filter(file => 
      zipEntries.some(entry => entry.entryName === file)
    );
    
    console.log(`Found ${foundFiles.length}/${requiredFiles.length} required files`);
    
    const missingFiles = requiredFiles.filter(file => 
      !zipEntries.some(entry => entry.entryName === file)
    );

    if (missingFiles.length > 0) {
      throw new Error(`Invalid backup structure - missing required files: ${missingFiles.join(', ')}`);
    }

    console.log("Extracting files to temporary directory...");
    
    // Extract files with retry mechanism
    let extractAttempts = 0;
    const maxAttempts = 3;
    
    while (extractAttempts < maxAttempts) {
      try {
        zip.extractAllTo(tempDir, true);
        console.log("Files extracted successfully");
        break;
      } catch (error) {
        extractAttempts++;
        console.error(`Extraction attempt ${extractAttempts} failed: ${error.message}`);
        if (extractAttempts === maxAttempts) {
          throw new Error(`Failed to extract files after ${maxAttempts} attempts: ${error.message}`);
        }
        // Wait briefly before retrying
        console.log(`Retrying in 1 second...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Files to restore
    const files = [
      'src',
      'public',
      'index.html',
      'package.json',
      'package-lock.json',
      'tsconfig.json',
      'tsconfig.app.json',
      'tsconfig.node.json',
      'vite.config.ts',
      'tailwind.config.js',
      'postcss.config.js',
      'eslint.config.js'
    ];

    console.log("Copying files back to project...");
    
    // Copy files back to project with validation
    files.forEach(file => {
      const sourcePath = path.join(tempDir, file);
      const targetPath = path.join(__dirname, '..', file);
      
      if (fs.existsSync(sourcePath)) {
        // Validate file before copying
        try {
          const stats = fs.statSync(sourcePath);
          if (stats.size === 0 && !fs.statSync(sourcePath).isDirectory()) {
            console.warn(`Warning: ${file} is empty, skipping...`);
            return;
          }

          if (fs.existsSync(targetPath)) {
            fs.rmSync(targetPath, { recursive: true, force: true });
          }
          fs.cpSync(sourcePath, targetPath, { recursive: true, force: true });
          console.log(`Restored: ${file}`);
        } catch (err) {
          console.error(`Error copying ${file}:`, err.message);
        }
      } else {
        console.warn(`Warning: ${file} not found in backup, skipping...`);
      }
    });

    // Preserve .env files if they exist
    const envFiles = ['.env', '.env.development', '.env.production'];
    envFiles.forEach(envFile => {
      const envPath = path.join(__dirname, '..', envFile);
      if (fs.existsSync(envPath)) {
        console.log(`Preserving ${envFile} file`);
      }
    });

    // Preserve public/onset-logo.svg if it exists
    const logoPath = path.join(__dirname, '..', 'public', 'onset-logo.svg');
    if (fs.existsSync(logoPath)) {
      console.log('Preserving public/onset-logo.svg');
    }

    // Cleanup temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log("Temporary directory cleaned up");

    console.log(`Backup restored successfully: ${backupFile}`);
    console.log('Run npm install to reinstall dependencies');
  } catch (error) {
    // Cleanup temp directory in case of error
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    console.error('Error restoring backup:', error.message);
    process.exit(1);
  }
}

// Get backup file from command line argument
const backupFile = process.argv[2];
restoreBackup(backupFile);