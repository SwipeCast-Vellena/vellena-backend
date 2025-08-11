const mysql = require("mysql2");
const dotenv = require("dotenv");
dotenv.config();

const db = mysql.createPool({
  connectionLimit: 10, // optional, good default
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Optional: Test and log connection once at startup
db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
    return;
  }
  console.log("✅ Connected to MySQL database");

  const createUserTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role ENUM('model', 'agency') NOT NULL
    );
  `;

  const createModelsTable = `
  CREATE TABLE IF NOT EXISTS model(
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  age INT NOT NULL,
  genre ENUM('Male', 'Female','Other') NOT NULL,
  height DECIMAL(5,2) NOT NULL,
  location VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  video_portfolio VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );`;

  const createAgencyTable = `
  CREATE TABLE IF NOT EXISTS agency(
  id INT AUTO_INCREMENT PRIMARY KEY,
  agency_id INT UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  operating_years INT NOT NULL,
  no_of_employees INT NOT NULL,
  location VARCHAR(100) NOT NULL,
  professional_bio TEXT NOT NULL,
  website VARCHAR(255) ,
  FOREIGN KEY (agency_id) REFERENCES users(id) ON DELETE CASCADE
  );`;

  // Changed: Added nested error handling for each table creation, 
  // so that all errors are logged and subsequent queries still run.
  connection.query(createUserTable, (err) => {
    if (err) {
      console.error("Failed to create users table:", err.message);
    } else {
      console.log("Users table is ready");
    }

    connection.query(createModelsTable, (err) => {
      if (err) {
        console.error("Failed to create models table:", err.message);
      } else {
        console.log("Model table created");
      }

      connection.query(createAgencyTable, (err) => {
        if (err) {
          console.error("Failed to create agency table:", err.message);
        } else {
          console.log("Agency table created");
        }

        connection.release(); // Release connection back to pool after all queries done
      });
    });
  });
});

module.exports = db;
