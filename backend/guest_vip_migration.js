/**
 * Guest VIP Migration Script
 * 
 * This script:
 * 1. Adds a 'is_vip' column to the guests table
 * 2. Sets default value to 0 (false) for existing guests
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

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

// Run the guest VIP migration
async function runGuestVipMigration() {
  return new Promise((resolve, reject) => {
    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON', (err) => {
      if (err) {
        console.error('Error enabling foreign keys:', err);
        reject(err);
        return;
      }
      
      // Start transaction
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) {
          console.error('Error starting transaction:', err);
          reject(err);
          return;
        }
        
        // Check if is_vip column exists in guests table
        db.all("PRAGMA table_info(guests)", (err, rows) => {
          if (err) {
            console.error('Error checking table info:', err);
            db.run('ROLLBACK');
            reject(err);
            return;
          }
          
          // Check if the is_vip column already exists
          const vipColumn = rows.find(col => col.name === 'is_vip');
          const columnExists = !!vipColumn;
          
          console.log(`VIP column ${columnExists ? 'exists' : 'does not exist'}`);
          
          if (!columnExists) {
            // Add is_vip column if it doesn't exist
            db.run("ALTER TABLE guests ADD COLUMN is_vip INTEGER DEFAULT 0", (err) => {
              if (err) {
                console.error('Error adding is_vip column:', err);
                db.run('ROLLBACK');
                reject(err);
                return;
              }
              
              console.log('VIP column added successfully');
              
              // Commit transaction
              db.run('COMMIT', (err) => {
                if (err) {
                  console.error('Error committing transaction:', err);
                  db.run('ROLLBACK');
                  reject(err);
                  return;
                }
                
                console.log('Guest VIP migration completed successfully');
                resolve();
              });
            });
          } else {
            // Column already exists, nothing to do
            console.log('VIP column already exists, no changes needed');
            db.run('COMMIT', (err) => {
              if (err) {
                console.error('Error committing transaction:', err);
                db.run('ROLLBACK');
                reject(err);
                return;
              }
              
              resolve();
            });
          }
        });
      });
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

// Run migration if this file is executed directly
if (require.main === module) {
  runGuestVipMigration()
    .then(() => {
      console.log('Guest VIP migration completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Guest VIP migration failed:', error);
      process.exit(1);
    });
}

// Export migration function
module.exports = {
  runGuestVipMigration
}; 