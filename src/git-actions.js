/**
 * Created by kgrube on 8/16/2019
 */

const fs = require('fs');
const git = require('simple-git');
const gitP = require('simple-git/promise');


exports.init = function ({directory, remote}) {
  return git(directory)
    .init()
    .addRemote('origin', remote);
};

exports.push = function ({directory}) {
  return git(directory)
    .push('origin', 'master');
};

exports.addFile = function ({directory, path, message}) {
  return git(directory)
    .add(path);
};

exports.commit = function ({directory, message}) {
  return git(directory)
    .commit(message);
};

exports.commitFileWithAuthor = function ({directory, message, path, user, email}) {
  return git(directory)
    .add(path)
    .commit(message, path, {'--author': `"${user} <${email}>"`});
};

exports.setConfig = function ({directory, key, value}) {
  return git(directory)
    .addConfig(key, value);
};

