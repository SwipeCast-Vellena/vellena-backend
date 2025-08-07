const mysql = require("mysql2");
const dotenv = require("dotenv");
dotenv.config();

const db=mysql.createConnection({
    host:process.env.DB_HOST,
    user:process.env.DB_USER,
    password:process.env.DB_PASSWORD,
    database:process.env.DB_NAME
});

db.connect((err)=>{
    if(err){
        console.error("Database connection failed")
    }
    else{
        console.log("Connected to Mysql Database")
    }

    const createUserTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('model', 'agency') NOT NULL
      );
    `;

    db.query(createUserTable, (err) => {
      if (err) console.error("❌ Failed to create users table:", err.message);
      else console.log("✅ users table is ready");
    });
  
});

module.exports=db;

