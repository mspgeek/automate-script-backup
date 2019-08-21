const mysql = require('mysql');

class MySQL {
  constructor({
    user, password, database, host,
  }) {
    this.user = user;
    this.password = password;
    this.database = database;
    this.host = host;

    this.connection = mysql.createConnection({
      host,
      user,
      database,
      password,
    });
  }


  execute({sql, values = []}) {
    return new Promise((resolve, reject) => {
      this.connection.query(sql, values, (err, results, fields) => {
        if (err) {
          return reject(err);
        }

        return resolve(results);
      });
    });
  }

}

module.exports = MySQL;
