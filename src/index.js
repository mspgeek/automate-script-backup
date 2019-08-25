/**
 * Created by kgrube on 8/16/2019
 */

const Commander = require('commander');
const packageJson = require('../package');
const git = require('./git-actions');
const actions = require('./actions');

const program = new Commander.Command();

(async () => {
  program
    .version(packageJson.version)
    .option('-o, --output <directory>', 'specify relative output directory', 'repo')
    .option('-u, --username <username>', 'MySQL database username')
    .option('-p, --password <password>', 'MySQL database password')
    .option('-s, --server <server>', 'MySQL server address', '127.0.0.1')
    .option('-d, --database <database>', 'MySQL database name', 'labtech')
    .option('-g, --enable-git', 'Enable git integration', false)
    .option('--disable-as-user', 'commit changes as user that made changes to each script', false)
    .option('-p, --push', 'push changes to remote', false)
    .option('-v, --verbose', 'enable verbose output', false)
    .option('-i, --initial', 'Merge all changes for initial backup', false)
    .parse(process.argv);

  const {
    output,
    username,
    password,
    server,
    database,
    enableGit,
    disableAsUser,
    push,
    verbose,
    initial,
  } = program;

  // console.log(
  //   output,
  //   username,
  //   password,
  //   server,
  //   database,
  //   enableGit,
  //   disableAsUser,
  //   push,
  //   verbose,
  //   initial,
  // );

  try {
    await actions.init({
      enableGit,
      disableAsUser,
      push,
      verbose,
      initial,
      directory: output,
      MYSQL_DATABASE: database,
      MYSQL_HOST: server,
      MYSQL_PASSWORD: password,
      MYSQL_USER: username,
    });

    console.log(`Successfully connected to Automate Server ${server}/${database} version ${actions.getVersions().major}.${actions.getVersions().minor}`);
    const scripts = await actions.getScripts();
    console.log(`Successfully loaded ${scripts.length} scripts`);
    const interpolatedScripts = await actions.interpolate(scripts);
    actions.writeScripts({interpolatedScripts});
    console.log(`Successfully exported scripts to ${output}`);

    process.exit(0);
  } catch (err) {
    console.log('Error: ', err.message);
    process.exit(1);
  }
})();

