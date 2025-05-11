/**
 * Database Migration Script
 * 
 * This script creates and initializes the database schema with proper relationships
 * based on the application's data model.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

// Create database connection
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Could not connect to database:', err);
    process.exit(1);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Run migrations
async function runMigrations() {
  return new Promise((resolve, reject) => {
    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON', (err) => {
      if (err) {
        console.error('Error enabling foreign keys:', err);
        reject(err);
        return;
      }
      
      // Use transaction for all migrations
      db.serialize(() => {
        // Start transaction
        db.run('BEGIN TRANSACTION');
        
        // Create users table
        db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            login_history TEXT DEFAULT '[]',
            role TEXT DEFAULT 'user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, handleError);
        
        // Drop existing tables in correct order (to handle foreign key constraints)
        db.run(`DROP TABLE IF EXISTS vip_access`, handleError);
        db.run(`DROP TABLE IF EXISTS attendance`, handleError);
        db.run(`DROP TABLE IF EXISTS workshops`, handleError);
        db.run(`DROP TABLE IF EXISTS guests`, handleError);
        
        // Create workshops table
        db.run(`
          CREATE TABLE IF NOT EXISTS workshops (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            date TEXT NOT NULL,
            location TEXT NOT NULL,
            user_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_vip INTEGER DEFAULT 0,
            max_capacity INTEGER DEFAULT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
          )
        `, handleError);
        
        // Create guests table
        db.run(`
          CREATE TABLE IF NOT EXISTS guests (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            qr_code TEXT UNIQUE NOT NULL,
            user_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_vip INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id)
          )
        `, handleError);
        
        // Create attendance records table
        db.run(`
          CREATE TABLE IF NOT EXISTS attendance (
            id TEXT PRIMARY KEY,
            workshop_id TEXT NOT NULL,
            guest_id TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE,
            FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id),
            UNIQUE(workshop_id, guest_id)
          )
        `, handleError);
        
        // Create VIP access table
        db.run(`
          CREATE TABLE IF NOT EXISTS vip_access (
            id TEXT PRIMARY KEY,
            guest_id TEXT NOT NULL,
            workshop_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (guest_id) REFERENCES guests(id),
            FOREIGN KEY (workshop_id) REFERENCES workshops(id),
            UNIQUE(guest_id, workshop_id)
          )
        `, handleError);
        
        // Create indexes for better performance
        db.run(`CREATE INDEX IF NOT EXISTS idx_workshops_date ON workshops(date)`, handleError);
        db.run(`CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email)`, handleError);
        db.run(`CREATE INDEX IF NOT EXISTS idx_guests_qr_code ON guests(qr_code)`, handleError);
        db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_workshop ON attendance(workshop_id)`, handleError);
        db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_guest ON attendance(guest_id)`, handleError);
        db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_timestamp ON attendance(timestamp)`, handleError);
        
        // Commit transaction if everything succeeds
        db.run('COMMIT', (err) => {
          if (err) {
            console.error('Error committing transaction:', err);
            // Try to rollback
            db.run('ROLLBACK');
            reject(err);
            return;
          }
          
          // Create admin user if not exists
          createAdminUser()
            .then(() => {
              console.log('Migrations completed successfully');
              resolve();
            })
            .catch(error => {
              console.error('Error creating admin user:', error);
              reject(error);
            });
        });
      });
    });
  });
}

// Helper function to handle errors
function handleError(err) {
  if (err) {
    console.error('Migration error:', err);
    // Don't exit here, just log the error
    // The transaction will handle rollback if needed
  }
}

// Create admin user if it doesn't exist
async function createAdminUser() {
  return new Promise((resolve, reject) => {
    // Check if admin user exists
    db.get('SELECT * FROM users WHERE username = ?', ['admin'], async (err, user) => {
      if (err) {
        reject(err);
        return;
      }
      
      // If admin user doesn't exist, create it
      if (!user) {
        try {
          // Generate salt and hash password
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash('admin123', salt);
          
          // Insert admin user
          db.run(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            ['admin', hashedPassword, 'admin'],
            function(err) {
              if (err) {
                reject(err);
                return;
              }
              console.log('Admin user created successfully');
              resolve();
            }
          );
        } catch (error) {
          reject(error);
        }
      } else {
        // Admin user already exists
        resolve();
      }
    });
  });
}

// Close database connection on process exit
process.on('exit', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database connection:', err);
    } else {
      console.log('Database connection closed');
    }
  });
});

// Handle process termination signals
process.on('SIGINT', () => {
  console.log('Process terminated by user');
  process.exit(0);
});

// Export migration function
module.exports = {
  runMigrations,
  db
};

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
} 