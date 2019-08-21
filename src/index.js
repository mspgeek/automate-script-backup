/**
 * Created by kgrube on 8/16/2019
 */

const Commander = require('commander');
const packageJson = require('../package');
const git = require('./git-actions');

const program = new Commander.Command();

program
  .version(packageJson.version)
  .option('-o, --output <directory>', 'specify output directory', 'repo')
  .option('-u, --as-user', 'commit changes as user that made changes to each script', true)
  .option('--debug', 'enable debug', false)
  .option('--verbose', 'enable verbose output', false)
  .option('--disable-push', 'push changes to remote', false)
  .option('--init', 'create new empty repository', false)
  .parse(process.argv);

const {output, asUser, debug, verbose, disablePush, init} = program;

console.log();

