const fs = require('fs');
const toIco = require('to-ico');

async function generateFavicon() {
  try {
    // Read PNG files
    const files = [
      fs.readFileSync('public/icon-16.png'),
      fs.readFileSync('public/icon-32.png'),
      fs.readFileSync('public/icon-64.png'),
    ];

    // Generate ICO
    const buf = await toIco(files);

    // Write to public directory
    fs.writeFileSync('public/favicon.ico', buf);

    console.log('✓ Generated favicon.ico successfully');
  } catch (error) {
    console.error('Error generating favicon:', error);
    process.exit(1);
  }
}

generateFavicon();
