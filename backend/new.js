const mysql = require('mysql2');

// Create a connection to the database
const connection = mysql.createConnection({
    host: 'localhost',     // Use container's internal IP
    user: 'root',            // MySQL root user
    password: 'admin',       // Root password
    database: 'todolist',    // Database name
    port: 3306               // Port number
  });
  

// Connect to the MySQL server
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to the MySQL database.');
});

// Example query to test the connection
connection.query('SELECT NOW()', (err, results) => {
  if (err) {
    console.error('Error executing query:', err.stack);
    return;
  }
  console.log('Current time:', results[0]['NOW()']);
});

// Close the connection
connection.end();
