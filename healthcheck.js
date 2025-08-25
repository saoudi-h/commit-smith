const fs = require('fs');
const path = require('path');

(async () => {
  try {
    // Check if dist directory exists
    const distPath = path.join(__dirname, 'dist');
    if (!fs.existsSync(distPath)) {
      console.error('dist directory not found');
      process.exit(1);
    }

    // Check if main file exists
    const mainFile = path.join(distPath, 'index.js');
    if (!fs.existsSync(mainFile)) {
      console.error('dist/index.js not found');
      process.exit(1);
    }

    // Check if we can import the main file (basic syntax check)
    const { CommitSmithServer } = await import('./dist/index.js');
    if (!CommitSmithServer) {
      console.error('CommitSmithServer not found in main file');
      process.exit(1);
    }

    console.log('Health check passed');
    process.exit(0);
  } catch (error) {
    console.error('Health check failed:', error.message);
    process.exit(1);
  }
})();
