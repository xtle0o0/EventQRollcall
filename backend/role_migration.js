/**
 * Role Migration Script
 * 
 * This script:
 * 1. Updates existing users to have proper role values ('admin' for admin, 'scanner' for others)
 * 2. Adds role-based access control to the system
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

// Run the role migration
async function runRoleMigration() {
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
        
        // Check if role column exists in users table
        db.all("PRAGMA table_info(users)", (err, rows) => {
          if (err) {
            console.error('Error checking table info:', err);
            db.run('ROLLBACK');
            reject(err);
            return;
          }
          
          // Check if the role column already exists
          const roleColumn = rows.find(col => col.name === 'role');
          const columnExists = !!roleColumn;
          
          console.log(`Role column ${columnExists ? 'exists' : 'does not exist'}`);
          
          // Function to continue with updates after ensuring column exists
          const continueWithUpdates = () => {
            // Update the admin user to have admin role
            db.run("UPDATE users SET role = 'admin' WHERE username = 'admin'", (err) => {
              if (err) {
                console.error('Error updating admin role:', err);
                db.run('ROLLBACK');
                reject(err);
                return;
              }
              
              // Update all other users to have scanner role
              db.run("UPDATE users SET role = 'scanner' WHERE username != 'admin'", (err) => {
                if (err) {
                  console.error('Error updating scanner roles:', err);
                  db.run('ROLLBACK');
                  reject(err);
                  return;
                }
                
                // Commit transaction
                db.run('COMMIT', (err) => {
                  if (err) {
                    console.error('Error committing transaction:', err);
                    db.run('ROLLBACK');
                    reject(err);
                    return;
                  }
                  
                  console.log('Role migration completed successfully');
                  resolve();
                });
              });
            });
          };
          
          if (!columnExists) {
            // Add role column if it doesn't exist
            db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'scanner'", (err) => {
              if (err) {
                console.error('Error adding role column:', err);
                db.run('ROLLBACK');
                reject(err);
                return;
              }
              
              console.log('Role column added successfully');
              continueWithUpdates();
            });
          } else {
            // Column already exists, continue with updates
            continueWithUpdates();
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
  runRoleMigration()
    .then(() => {
      console.log('Role migration completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Role migration failed:', error);
      process.exit(1);
    });
}

// Export migration function
module.exports = {
  runRoleMigration
}; 