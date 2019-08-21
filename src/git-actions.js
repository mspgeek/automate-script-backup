/**
 * Created by kgrube on 8/16/2019
 */

const fs = require('fs');
const git = require('simple-git');
const gitP = require('simple-git/promise');

const {
  GIT_USER,
  GIT_DEPLOY_KEY_PUB,
  GIT_DEPLOY_KEY_PRIV,
  GIT_DEPLOY_KEY_PASS,
  GIT_REMOTE_URL,
} = process.env;

const REPOSITORY_FOLDER = path.join(__dirname, 'repo');


exports.init = function ({directory, remote}) {
  return git(directory)
    .init()
    .addRemote('origin', remote);
};

exports.push = function ({directory}) {
  return git(directory)
    .push('origin', 'master');
};

exports.addFile = function ({directory, message, path, user, email}) {
  return git(directory)
    .add(path)
    .commit(message, path, {'--author': `"${user} <${email}>"`});
};



