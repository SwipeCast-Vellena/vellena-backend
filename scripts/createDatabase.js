const mysql = require("mysql2");
const dotenv = require("dotenv");
dotenv.config();

// Connect without specifying database first
const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'tigerbro512',
});

const dbName = process.env.DB_NAME || 'vellena';

console.log('🔄 Creating database...');
console.log('Host:', process.env.DB_HOST || 'localhost');
console.log('Port:', process.env.DB_PORT || 3306);
console.log('User:', process.env.DB_USER || 'root');
console.log('Database:', dbName);

connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`, (err) => {
  if (err) {
    console.error('❌ Error creating database:', err.message);
    process.exit(1);
  }
  
  console.log(`✅ Database '${dbName}' created successfully!`);
  console.log('🔄 You can now start the server.');
  connection.end();
  process.exit(0);
});

