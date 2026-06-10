const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const execSync = require('child_process').execSync;
try {
  execSync('npx -y extract-zip /TEMP/puuextend.zip /TEMP/puuextend_unzipped');
} catch (e) {
  console.log(e);
}
