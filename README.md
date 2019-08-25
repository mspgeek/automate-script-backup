# CW Automate Script Backup

This utility will dump all your ConnectWise Automate (LabTech) scripts as XML and TXT files which allows for git versioning to see changes between edits.  

```
Options:
  -V, --version              output the version number
  -o, --output <directory>   specify relative output directory (default: "repo")
  -u, --username <username>  MySQL database username
  -p, --password <password>  MySQL database password
  -s, --server <server>      MySQL server address (default: "127.0.0.1")
  -d, --database <database>  MySQL database name (default: "labtech")
  -g, --enable-git           disable git integration (default: false)
  --disable-as-user          commit changes as user that made changes to each script (default: false)
  -p, --push                 push changes to remote (default: false)
  -v, --verbose              enable verbose output (default: false)
  -i, --initial              Merge all changes for initial backup (default: false)
  -h, --help                 output usage information
```


Simple usage:
```
script-backup.exe -u username -p password
```


#### Setup with GitHub:

- Download latest release
- Install git for windows
- Create (private) GitHub repository 
- (private) Add deploy key (Settings -> Deploy Keys)
- Use PuTTYGen on Windows
- Click Generate and waggle the mouse
- Copy the public key and paste into GitHub as deploy key.  Check box 'Allow write access' and hit 'Add key'
- Conversions >  Export OpenSSH key from PuTTYGen as `deploy.key`
- See here for more information
- (private) Create ssh config
- Make new directory C:\users\<username>\.ssh
- Note: Username should the be the user set for administrative access in Automate so that it will be used later for `Shell as Admin` script steps.
- Copy the private key into this directory
- Create a new file called `config`
```
  Host github.com
      HostName github.com
      User git
      IdentityFile /c/Users/<username>/.ssh/deploy.key
      IdentitiesOnly yes
```
- Clone repository
```
git clone git@github.com:<your username or org>/<your repo name>.git
```
- Run the initial backup:
```
script-backup.exe -u username -p password --enable-git --push --initial
```
- Create a labtech script that runs this command periodically as the user you set this up under:
```
script-backup.exe -u username -p password -g -p
```
This will automatically commit any changes authored as the user that made the last change to the script, commit the changes, and push them to the repository's origin remote.



#### Setup standalone:

- Download latest release
- Run 
```
script-backup.exe -u username -p password
```
