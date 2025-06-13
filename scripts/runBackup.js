import { createBackup } from '../backup.js';

// Execute backup
createBackup()
  .then(({ file, size, version }) => {
    console.log('Backup created successfully:');
    console.log(`- File: ${file}`);
    console.log(`- Size: ${size} MB`);
    console.log(`- Version: ${version}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('Error creating backup:', error);
    process.exit(1);
  });