const mysql = require("mysql2");
const dotenv = require("dotenv");
dotenv.config();

const db = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'tigerbro512',
  database: process.env.DB_NAME || 'vellena',
  // Allow connection without database first (to create it if needed)
  multipleStatements: true,
});

// Test and log connection once at startup
db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Database connection failed:", err.message);
    console.error("Connection details:", {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      database: process.env.DB_NAME || 'vellena'
    });
    
    // If database doesn't exist, try to create it
    if (err.code === 'ER_BAD_DB_ERROR' || err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log("ℹ️ Attempting to create database if it doesn't exist...");
      const createDbConnection = mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'tigerbro512',
      });
      
      const dbName = process.env.DB_NAME || 'vellena';
      createDbConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`, (createErr) => {
        if (createErr) {
          console.error("❌ Failed to create database:", createErr.message);
          console.log("\n📝 Please create the database manually using MySQL:");
          console.log(`   CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        } else {
          console.log(`✅ Database '${dbName}' created successfully`);
          console.log("🔄 Please restart the server to connect to the new database");
        }
        createDbConnection.end();
      });
    }
    return;
  }
  console.log("✅ Connected to MySQL database");
  console.log("📊 Database:", process.env.DB_NAME || 'vellena', "| Host:", process.env.DB_HOST || 'localhost', "| Port:", process.env.DB_PORT || 3306);

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
      category ENUM('Hostess', 'Model', 'Photographer', 'Promoter', 'Waiter', 'Other') NOT NULL,
      description TEXT NOT NULL,
      video_portfolio VARCHAR(500),
      is_pro TINYINT(1) NOT NULL DEFAULT 0, -- ✅ new column
      card_number VARCHAR(19) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `;

  // in case model table already exists, ensure column is added
  const alterModelTable = `
    ALTER TABLE model
    ADD COLUMN is_pro TINYINT(1) NOT NULL DEFAULT 0;
  `;

  const createAgencyTable = `
    CREATE TABLE IF NOT EXISTS agency(
      id INT AUTO_INCREMENT PRIMARY KEY,
      agency_id INT UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      operating_years INT NOT NULL,
      no_of_employees INT NOT NULL,
      location VARCHAR(100) NOT NULL,
      professional_bio TEXT NOT NULL,
      website VARCHAR(255),
      FOREIGN KEY (agency_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `;

  const createCampaignsTable = `
    CREATE TABLE IF NOT EXISTS campaign(
      id INT AUTO_INCREMENT PRIMARY KEY,
      agency_profile_id INT NOT NULL,
      title VARCHAR(300) NOT NULL,
      category ENUM('Hostess', 'Model', 'Photographer', 'Promoter','Waiter','Other') NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE DEFAULT NULL,
      start_time TIME DEFAULT NULL,
      end_time TIME DEFAULT NULL,
      city VARCHAR(100) NOT NULL,
      address VARCHAR(255) DEFAULT NULL,
      compensation DECIMAL(10,2) NOT NULL,
      description VARCHAR(500) NOT NULL,
      required_people SMALLINT UNSIGNED NOT NULL,
      deadline DATE NOT NULL,
      pro_only BOOLEAN NOT NULL DEFAULT FALSE,
      gender_preference ENUM('any','women','men') NOT NULL DEFAULT 'any',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_campaign_agency_profile FOREIGN KEY (agency_profile_id) REFERENCES agency(id) ON DELETE CASCADE,
      INDEX idx_campaigns_agency_profile (agency_profile_id),
      INDEX idx_campaigns_dates (start_date, end_date),
      INDEX idx_campaigns_city (city),
      INDEX idx_campaigns_deadline (deadline)
    );
  `;

  const createCampaignsApplicationTable = `
    CREATE TABLE IF NOT EXISTS campaign_applications(
      id INT AUTO_INCREMENT PRIMARY KEY,
      campaign_id INT NOT NULL,
      user_id INT NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaign(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES model(id) ON DELETE CASCADE,
      UNIQUE (campaign_id, user_id)
    );
  `;

  const createCampaignMatchesTable = `
    CREATE TABLE IF NOT EXISTS campaign_matches(
      id INT AUTO_INCREMENT PRIMARY KEY,
      campaign_id INT NOT NULL,
      model_id INT NOT NULL,
      agency_id INT NOT NULL,
      score DECIMAL(5,2) NOT NULL DEFAULT 0,
      matched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaign(id) ON DELETE CASCADE,
      FOREIGN KEY (model_id) REFERENCES model(id) ON DELETE CASCADE,
      FOREIGN KEY (agency_id) REFERENCES agency(id) ON DELETE CASCADE,
      UNIQUE (campaign_id, model_id)
    );
  `;

  const alterCampaignMatchesTable = `
    ALTER TABLE campaign_matches
    ADD COLUMN agency_approved TINYINT(1) NOT NULL DEFAULT 0 AFTER score;
  `;

  const alterModelAddCardNumber=`
  ALTER TABLE model
  ADD COLUMN card_number VARCHAR(19) DEFAULT NULL;`;

  const createFavoritesTable = `
    CREATE TABLE IF NOT EXISTS favorites (
      id INT AUTO_INCREMENT PRIMARY KEY,
      agency_id INT NOT NULL,
      model_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_fav (agency_id, model_id),
      FOREIGN KEY (agency_id) REFERENCES agency(id),
      FOREIGN KEY (model_id) REFERENCES model(id)
    );
  `;

  const createModelPhotosTable = `
    CREATE TABLE IF NOT EXISTS model_photo (
      id INT AUTO_INCREMENT PRIMARY KEY,
      model_id INT NOT NULL,
      group_label VARCHAR(100) NOT NULL DEFAULT 'Portfolio',
      url VARCHAR(1024) NOT NULL,
      position TINYINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (model_id) REFERENCES model(id) ON DELETE CASCADE,
      UNIQUE KEY uniq_model_group_pos (model_id, group_label, position),
      INDEX idx_model_group (model_id, group_label)
    );
  `;

  // Run tables in sequence
  connection.query(createUserTable, (err) => {
    if (err) return console.error("Failed to create users table:", err.message);
    console.log("✅ Users table ready");

    connection.query(createModelsTable, (err) => {
      if (err) return console.error("Failed to create models table:", err.message);
      console.log("✅ Model table ready");

      // ensure is_pro column exists
      connection.query(alterModelTable, (err) => {
        if (err) {
          if (err.code === "ER_DUP_FIELDNAME") {
            console.log("ℹ️ is_pro column already exists in model table");
          } else {
            console.error("Failed to alter model table:", err.message);
          }
        } else {
          console.log("✅ is_pro column added to model table");
        }
      });

      // Ensure card_number column exists
      connection.query(alterModelAddCardNumber, (err) => {
        if (err) {
          if (err.code === "ER_DUP_FIELDNAME") {
            console.log("ℹ️ card_number column already exists in model table");
          } else {
            console.error("Failed to alter model table (card_number):", err.message);
          }
        } else {
          console.log("✅ card_number column added to model table");
        }
      });

      connection.query(createAgencyTable, (err) => {
        if (err) return console.error("Failed to create agency table:", err.message);
        console.log("✅ Agency table ready");

        // Add VAT number column to agency table
        const alterAgencyVatTable = `
          ALTER TABLE agency 
          ADD COLUMN vat_number VARCHAR(50) NULL;
        `;

        connection.query(alterAgencyVatTable, (err) => {
          if (err) {
            if (err.code === "ER_DUP_FIELDNAME") {
              console.log("ℹ️ vat_number column already exists in agency table");
            } else {
              console.error("Failed to add vat_number column:", err.message);
            }
          } else {
            console.log("✅ vat_number column added to agency table");
          }

          // Add PDF path column to agency table
          const alterAgencyPdfTable = `
            ALTER TABLE agency 
            ADD COLUMN pdf_path VARCHAR(255) NULL;
          `;

          connection.query(alterAgencyPdfTable, (err) => {
            if (err) {
              if (err.code === "ER_DUP_FIELDNAME") {
                console.log("ℹ️ pdf_path column already exists in agency table");
              } else {
                console.error("Failed to add pdf_path column:", err.message);
              }
            } else {
              console.log("✅ pdf_path column added to agency table");
            }

            connection.query(createCampaignsTable, (err) => {
              if (err) return console.error("Failed to create campaign table:", err.message);
              console.log("✅ Campaign table ready");

                connection.query(createCampaignsApplicationTable, (err) => {
                  if (err) return console.error("Failed to create applications table:", err.message);
                  console.log("✅ Applications table ready");

                  connection.query(createCampaignMatchesTable, (err) => {
                    if (err) return console.error("Failed to create matches table:", err.message);
                    console.log("✅ Matches table ready");

                    connection.query(alterCampaignMatchesTable, (err) => {
                      if (err) {
                        if (err.code === "ER_DUP_FIELDNAME") {
                          console.log("ℹ️ agency_approved column already exists");
                        } else {
                          console.error("Failed to alter campaign_matches:", err.message);
                        }
                      } else {
                        console.log("✅ agency_approved column added");
                      }

                      connection.query(createFavoritesTable, (err) => {
                        if (err) return console.error("Failed to create favorites table:", err.message);
                        console.log("✅ Favorites table ready");

                        connection.query(createModelPhotosTable, (err) => {
                          if (err) return console.error("Failed to create model_photo table:", err.message);
                          console.log("✅ Model photos table ready");

                          connection.release();
                        });
                      });
                    });
                  });
                });
              });
          });
        });
      });
    });
  });
});

module.exports = db;
