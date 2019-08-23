const labtech = require('labtech-script-decode');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const git = require('./git-actions');
const MySQL = require('./mysql');

let REPOSITORY_FOLDER_NAME;
let REPOSITORY_FOLDER;
let labSQL;
let versions;
let INITIAL;
let ENABLE_GIT;
let DISABLE_AS_USER;
let ENABLE_PUSH;
let VERBOSE;

async function getScripts() {
  return await labSQL.execute({
    sql: `
        select ScriptId,
               IFNULL(scriptfolders.FolderID, 0)      as ScriptFolderID,
               IFNULL(scriptfolders.ParentID, 0)      as ScriptFolderParentID,
               IFNULL(scriptfolders.Name, '')         as ScriptFolderName,
               IFNULL(scriptfolders.GUID, '')         as ScriptFolderGUID,
               IFNULL(scriptfolderparent.FolderID, 0) as ParentFolderID,
               IFNULL(scriptfolderparent.Name, '')    as ParentFolderName,
               IFNULL(scriptfolderparent.GUID, '')    as ParentFolderGUID,
               ScriptName,
               ScriptNotes,
               Permission,
               EditPermission,
               ComputerScript,
               LocationScript,
               MaintenanceScript,
               FunctionScript,
               convert(LicenseData using latin1)      as LicenseData,
               convert(ScriptData using latin1)       as ScriptData,
               ScriptVersion,
               ScriptGuid,
               ScriptFlags,
               Parameters,
               users.name                             as 'last_user',
               users.email                            as 'email'
        from lt_scripts
                 left join scriptfolders on scriptfolders.FolderID = lt_scripts.FolderId
                 left join scriptfolders as scriptfolderparent on scriptfolderparent.FolderID = scriptfolders.ParentID
                 left join users on left(lt_scripts.Last_User, locate('@', lt_scripts.Last_User) - 1) = users.name
    `,
  });
}

async function getAutomateVersion() {
  return await labSQL.execute({sql: 'SELECT MajorVersion as major, MinorVersion as minor FROM config'}).then(result => result[0]);
}

async function interpolate(scripts) {
  return Promise.all(scripts.map((script) => {
    script.XML = buildXML({script});
    return labtech.decodeXML(script.XML);
  }))
    .then(results => results.map((ScriptDataDecoded, idx) => ({
      ...scripts[idx],
      ScriptDataDecoded,
    })))
    .then(interpolated => {
      return Promise.all(interpolated.map(script => labtech.toText(script.ScriptDataDecoded)))
        .then(results => results.map((ScriptText, idx) => ({
          ...interpolated[idx],
          ScriptText: ScriptText[0],
        })));
    });
}

function md5(string) {
  return crypto.createHash('md5').update(string).digest('hex');
}

function escape(input) {
  return input.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sanitizeFileName(input) {
  // using this list:
  // https://docs.microsoft.com/en-us/windows/win32/fileio/naming-a-file
  return input
    .replace(/</g, '')
    .replace(/>/g, '')
    .replace(/"/g, '')
    .replace(/\//g, '')
    .replace(/\\/g, '')
    .replace(/\?/g, '')
    .replace(/\*/g, '');
}

function buildXML({script}) {
  const {
    ScriptName,
    ScriptId,
    ScriptNotes,
    Permission,
    EditPermission,
    ComputerScript,
    LocationScript,
    MaintenanceScript,
    FunctionScript,
    LicenseData,
    ScriptData,
    ScriptVersion,
    ScriptGuid,
    ScriptFlags,
    Parameters,
    ScriptFolderID,
    ScriptFolderParentID,
    ScriptFolderName,
    ScriptFolderGUID,
    ParentFolderID,
    ParentFolderName,
    ParentFolderGUID,
  } = script;

  const {major, minor} = versions;

  return `<LabTech_Expansion
  Version="${escape(`${major}.${minor}`)}"
  Name="${escape(ScriptName)}"
  Type="PackedScript">
  <PackedScript>
    <NewDataSet>
      <Table>
        <ScriptId>${ScriptId}</ScriptId>
        <FolderId>${ScriptFolderID}</FolderId>
        <ScriptName>${escape(ScriptName)}</ScriptName>
        <ScriptNotes>${escape(ScriptNotes)}</ScriptNotes>
        <Permission>${Permission}</Permission>
        <EditPermission>${EditPermission}</EditPermission>
        <ComputerScript>${ComputerScript}</ComputerScript>
        <LocationScript>${LocationScript}</LocationScript>
        <MaintenanceScript>${MaintenanceScript}</MaintenanceScript>
        <FunctionScript>${FunctionScript}</FunctionScript>
        <LicenseData>${LicenseData}</LicenseData>
        <ScriptData>${ScriptData}</ScriptData>
        <ScriptVersion>${ScriptVersion}</ScriptVersion>
        <ScriptGuid>${ScriptGuid}</ScriptGuid>
        <ScriptFlags>${ScriptFlags}</ScriptFlags>
        <Parameters>${escape(Parameters)}</Parameters>
      </Table>
    </NewDataSet>
    ${ScriptFolderID === 0 ? '' : `
    <ScriptFolder>
      <NewDataSet>
        <Table>
          <FolderID>${ScriptFolderID}</FolderID>
          <ParentID>${ScriptFolderParentID}</ParentID>
          <Name>${escape(ScriptFolderName)}</Name>
          <GUID>${ScriptFolderGUID}</GUID>
        </Table>
      </NewDataSet>
    </ScriptFolder>`}
    ${(ScriptFolderID === 0 && ParentFolderID === 0) ? '' : `
    <ScriptFolder>
      <NewDataSet>
        <Table>
          <FolderID>${ParentFolderID}</FolderID>
          <ParentID>0</ParentID>
          <Name>${escape(ParentFolderName)}</Name>
          <GUID>${ParentFolderGUID}</GUID>
        </Table>
      </NewDataSet>
    </ScriptFolder>`}
  </PackedScript>
</LabTech_Expansion>
`;
}

function buildTXT({script}) {
  const {ScriptText: {InitialCheck, ThenSection, ElseSection}} = script;

  return `${InitialCheck}
${ThenSection}
${ElseSection}
`;
}

function writeScripts({interpolatedScripts = []}) {
  if (!fs.existsSync(REPOSITORY_FOLDER)) {
    fs.mkdirSync(REPOSITORY_FOLDER);
  }

  interpolatedScripts.forEach(script => writeScriptToFile({script}));
}

function writeScriptToFile({script}) {
  const {ScriptFolderName, ParentFolderName, ScriptName, XML} = script;

  let relativeDirPath = ScriptFolderName;
  if (ParentFolderName) {
    if (!fs.existsSync(path.resolve(__dirname, REPOSITORY_FOLDER_NAME, ParentFolderName))) {
      fs.mkdirSync(path.resolve(__dirname, REPOSITORY_FOLDER_NAME, ParentFolderName));
    }
    relativeDirPath = `${ParentFolderName}/${ScriptFolderName}`;
  }

  const absoluteDirPath = path.resolve(__dirname, REPOSITORY_FOLDER_NAME, relativeDirPath);
  const absoluteFilePathXML = path.resolve(absoluteDirPath, `${sanitizeFileName(ScriptName)}.xml`);
  const absoluteFilePathTXT = path.resolve(absoluteDirPath, `${sanitizeFileName(ScriptName)}.txt`);

  if (!fs.existsSync(absoluteDirPath)) {
    fs.mkdirSync(absoluteDirPath);
  }

  const scriptTXT = buildTXT({script});

  if (fs.existsSync(absoluteFilePathTXT)) {
    // check md5
    const XMLmd5 = md5(fs.readFileSync(absoluteFilePathXML));

    if (md5(XML) !== XMLmd5) {
      fs.writeFileSync(absoluteFilePathTXT, scriptTXT, {flag: 'w'});
      fs.writeFileSync(absoluteFilePathXML, XML, {flag: 'w'});
    }
  } else {
    fs.writeFileSync(absoluteFilePathTXT, scriptTXT, {flag: 'w'});
    fs.writeFileSync(absoluteFilePathXML, XML, {flag: 'w'});
  }
}

async function addFile({path, script}) {
  return git.addFile({directory: REPOSITORY_FOLDER, path, message: ``})
}

function getVersions() {
  return versions;
}

async function init({
  enableGit,
  disableAsUser,
  push,
  verbose,
  initial,
  directory,
  MYSQL_USER,
  MYSQL_PASSWORD,
  MYSQL_DATABASE = 'labtech',
  MYSQL_HOST = '127.0.0.1',
}) {
  labSQL = new MySQL({user: MYSQL_USER, password: MYSQL_PASSWORD, database: MYSQL_DATABASE, host: MYSQL_HOST});
  versions = await getAutomateVersion();
  REPOSITORY_FOLDER_NAME = directory;
  REPOSITORY_FOLDER = path.join(__dirname, directory);
  ENABLE_GIT = enableGit;
  DISABLE_AS_USER = disableAsUser;
  ENABLE_PUSH = push;
  VERBOSE = verbose;
  INITIAL = initial;
}

module.exports = {
  init,
  getVersions,
  getScripts,
  interpolate,
  writeScripts,
};
