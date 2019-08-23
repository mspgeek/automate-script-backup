/**
 * Created by kgrube on 8/22/2019
 */
const {exec} = require('pkg');

(async () => {
  try {
    await exec(['src/index.js', '--target', 'host', '--output', 'dist/script-backup.exe']);
    console.log('Build complete.');
  } catch (err) {
    console.error('BUILD ERROR: ', err);
  }
})();
