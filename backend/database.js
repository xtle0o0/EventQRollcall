const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// Create database connection
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Could not connect to database', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Initialize database schema
function initDb() {
  return new Promise((resolve, reject) => {
    // Import and run migrations
    const { runMigrations } = require('./migrations');
    runMigrations()
      .then(() => {
        console.log('Database initialization completed');
        resolve();
      })
      .catch(err => {
        console.error('Database initialization failed:', err);
        reject(err);
      });
  });
}

// User-related database operations
const userDb = {
  // Get user by username
  getUserByUsername: (username) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) reject(err);
        resolve(user);
      });
    });
  },
  
  // Get user by ID
  getUserById: (id) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
        if (err) reject(err);
        resolve(user);
      });
    });
  },
  
  // Create a new user
  createUser: (username, password) => {
    return new Promise((resolve, reject) => {
      db.run('INSERT INTO users (username, password) VALUES (?, ?)', 
        [username, password], 
        function(err) {
          if (err) reject(err);
          resolve({ id: this.lastID });
        }
      );
    });
  },
  
  // Update login history for a user
  updateLoginHistory: (userId, loginData) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT login_history FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        
        try {
          const history = JSON.parse(row.login_history || '[]');
          history.push(loginData);
          
          // Keep only the latest 10 logins
          const updatedHistory = history.slice(-10);
          
          db.run('UPDATE users SET login_history = ? WHERE id = ?', 
            [JSON.stringify(updatedHistory), userId], 
            (err) => {
              if (err) reject(err);
              resolve(true);
            }
          );
        } catch (e) {
          reject(e);
        }
      });
    });
  }
};

// Workshop-related database operations
const workshopDb = {
  // Get all workshops
  getAllWorkshops: (userId = null) => {
    return new Promise((resolve, reject) => {
      const query = userId 
        ? 'SELECT *, is_vip as isVip, max_capacity as maxCapacity FROM workshops WHERE user_id = ?' 
        : 'SELECT *, is_vip as isVip, max_capacity as maxCapacity FROM workshops';
      
      const params = userId ? [userId] : [];
      
      db.all(query, params, (err, workshops) => {
        if (err) reject(err);
        resolve(workshops);
      });
    });
  },
  
  // Get workshop by ID
  getWorkshopById: (id, userId = null) => {
    return new Promise((resolve, reject) => {
      const query = userId
        ? 'SELECT * FROM workshops WHERE id = ? AND user_id = ?'
        : 'SELECT * FROM workshops WHERE id = ?';
      
      const params = userId ? [id, userId] : [id];
      
      db.get(query, params, (err, workshop) => {
        if (err) reject(err);
        resolve(workshop);
      });
    });
  },
  
  // Create a new workshop
  createWorkshop: (workshopData) => {
    const { name, description, date, location, userId, isVip = false, maxCapacity = null } = workshopData;
    const id = uuidv4();
    
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO workshops (id, name, description, date, location, user_id, created_at, updated_at, is_vip, max_capacity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, name, description, date, location, userId, new Date().toISOString(), new Date().toISOString(), isVip ? 1 : 0, maxCapacity],
        function(err) {
          if (err) reject(err);
          resolve({ id, name, description, date, location, userId, isVip, maxCapacity });
        }
      );
    });
  },
  
  // Update a workshop
  updateWorkshop: (id, workshopData) => {
    const { name, description, date, location } = workshopData;
    
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE workshops SET name = ?, description = ?, date = ?, location = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, description, date, location, id],
        function(err) {
          if (err) reject(err);
          if (this.changes === 0) {
            reject(new Error('Workshop not found'));
            return;
          }
          resolve({ id, name, description, date, location });
        }
      );
    });
  },
  
  // Delete a workshop
  deleteWorkshop: (id) => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM workshops WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        if (this.changes === 0) {
          reject(new Error('Workshop not found'));
          return;
        }
        resolve({ id });
      });
    });
  }
};

// Guest-related database operations
const guestDb = {
  // Get all guests
  getAllGuests: (userId = null) => {
    return new Promise((resolve, reject) => {
      const query = userId 
        ? 'SELECT * FROM guests WHERE user_id = ? ORDER BY name ASC' 
        : 'SELECT * FROM guests ORDER BY name ASC';
      
      const params = userId ? [userId] : [];
      
      db.all(query, params, (err, guests) => {
        if (err) reject(err);
        resolve(guests);
      });
    });
  },
  
  // Get guest by ID
  getGuestById: (id, userId = null) => {
    return new Promise((resolve, reject) => {
      const query = userId
        ? 'SELECT * FROM guests WHERE id = ? AND user_id = ?'
        : 'SELECT * FROM guests WHERE id = ?';
      
      const params = userId ? [id, userId] : [id];
      
      db.get(query, params, (err, guest) => {
        if (err) reject(err);
        resolve(guest);
      });
    });
  },
  
  // Get guest by QR code
  getGuestByQRCode: (qrCode, userId = null) => {
    return new Promise((resolve, reject) => {
      const query = userId
        ? 'SELECT * FROM guests WHERE qr_code = ? AND user_id = ?'
        : 'SELECT * FROM guests WHERE qr_code = ?';
      
      const params = userId ? [qrCode, userId] : [qrCode];
      
      db.get(query, params, (err, guest) => {
        if (err) reject(err);
        resolve(guest);
      });
    });
  },
  
  // Create a new guest
  createGuest: (guestData) => {
    const { name, email, organization, userId, isVip } = guestData;
    const id = uuidv4();
    const qrCode = `guest-${id}`; // Generate QR code using the ID format required by the frontend
    
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO guests (id, name, email, qr_code, user_id, is_vip) VALUES (?, ?, ?, ?, ?, ?)',
        [id, name, email || '', qrCode, userId, isVip || 0],
        function(err) {
          if (err) {
            // Check for duplicate email
            if (err.message.includes('UNIQUE constraint failed: guests.email')) {
              reject(new Error('Email already exists'));
              return;
            }
            reject(err);
            return;
          }
          resolve({ 
            id, 
            name, 
            email, 
            qr_code: qrCode, 
            organization, 
            userId,
            isVip: !!isVip
          });
        }
      );
    });
  },
  
  // Update a guest
  updateGuest: (id, guestData) => {
    const { name, email, organization, isVip } = guestData;
    
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE guests SET name = ?, email = ?, is_vip = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, email, isVip || 0, id],
        function(err) {
          if (err) {
            // Check for duplicate email
            if (err.message.includes('UNIQUE constraint failed: guests.email')) {
              reject(new Error('Email already exists'));
              return;
            }
            reject(err);
            return;
          }
          if (this.changes === 0) {
            reject(new Error('Guest not found'));
            return;
          }
          resolve({ 
            id, 
            name, 
            email, 
            organization,
            isVip: !!isVip
          });
        }
      );
    });
  },
  
  // Delete a guest
  deleteGuest: (id) => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM guests WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        if (this.changes === 0) {
          reject(new Error('Guest not found'));
          return;
        }
        resolve({ id });
      });
    });
  }
};

// Attendance-related database operations
const attendanceDb = {
  // Get all attendance records
  getAllAttendance: (userId = null) => {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT a.* 
        FROM attendance a
        JOIN workshops w ON a.workshop_id = w.id
        JOIN guests g ON a.guest_id = g.id
      `;
      
      if (userId) {
        query += ' WHERE w.user_id = ? OR g.user_id = ?';
      }
      
      query += ' ORDER BY a.timestamp DESC';
      
      const params = userId ? [userId, userId] : [];
      
      db.all(query, params, (err, records) => {
        if (err) reject(err);
        resolve(records);
      });
    });
  },
  
  // Check if attendance record exists
  getAttendanceRecord: (guestId, workshopId) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM attendance WHERE guest_id = ? AND workshop_id = ?', 
        [guestId, workshopId], 
        (err, record) => {
          if (err) reject(err);
          resolve(record);
        }
      );
    });
  },
  
  // Create a new attendance record
  createAttendance: (attendanceData) => {
    const { guestId, workshopId, timestamp, userId } = attendanceData;
    const id = uuidv4();
    
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO attendance (id, guest_id, workshop_id, timestamp, created_by) VALUES (?, ?, ?, ?, ?)',
        [id, guestId, workshopId, timestamp, userId],
        function(err) {
          if (err) {
            // Check for unique constraint
            if (err.message.includes('UNIQUE constraint failed')) {
              reject(new Error('Attendance already recorded'));
              return;
            }
            reject(err);
            return;
          }
          resolve({ id, guestId, workshopId, timestamp, createdBy: userId });
        }
      );
    });
  },
  
  // Get workshops attended by a guest
  getGuestAttendance: (guestId) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT w.* 
        FROM workshops w
        JOIN attendance a ON w.id = a.workshop_id
        WHERE a.guest_id = ?
        ORDER BY w.date ASC
      `;
      
      db.all(query, [guestId], (err, workshops) => {
        if (err) reject(err);
        resolve(workshops);
      });
    });
  },
  
  // Get guests who attended a workshop
  getWorkshopAttendees: (workshopId) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT g.* 
        FROM guests g
        JOIN attendance a ON g.id = a.guest_id
        WHERE a.workshop_id = ?
        ORDER BY g.name ASC
      `;
      
      db.all(query, [workshopId], (err, guests) => {
        if (err) reject(err);
        resolve(guests);
      });
    });
  },
  
  // Get recent check-ins
  getRecentCheckIns: (userId, count = 5) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT a.*, g.name as guest_name, w.name as workshop_name
        FROM attendance a
        JOIN workshops w ON a.workshop_id = w.id
        JOIN guests g ON a.guest_id = g.id
        WHERE w.user_id = ?
        ORDER BY a.timestamp DESC
        LIMIT ?
      `;
      
      db.all(query, [userId, count], (err, records) => {
        if (err) reject(err);
        resolve(records);
      });
    });
  }
};

// Analytics-related database operations
const analyticsDb = {
  // Calculate guest attendance percentage
  calculateGuestAttendancePercentage: (guestId, userId) => {
    return new Promise((resolve, reject) => {
      // First, get total workshops for this user
      db.get('SELECT COUNT(*) as total FROM workshops WHERE user_id = ?', [userId], (err, workshopResult) => {
        if (err) {
          reject(err);
          return;
        }
        
        const totalWorkshops = workshopResult.total;
        
        if (totalWorkshops === 0) {
          resolve(0); // No workshops, so 0% attendance
          return;
        }
        
        // Then, get attendance count for the guest
        const query = `
          SELECT COUNT(*) as attended 
          FROM attendance a
          JOIN workshops w ON a.workshop_id = w.id
          WHERE a.guest_id = ? AND w.user_id = ?
        `;
        
        db.get(query, [guestId, userId], (err, attendanceResult) => {
          if (err) {
            reject(err);
            return;
          }
          
          const attendedWorkshops = attendanceResult.attended;
          const percentage = (attendedWorkshops / totalWorkshops) * 100;
          
          resolve(percentage);
        });
      });
    });
  },
  
  // Calculate workshop attendance percentage
  calculateWorkshopAttendancePercentage: (workshopId, userId) => {
    return new Promise((resolve, reject) => {
      // First, get total guests for this user
      db.get('SELECT COUNT(*) as total FROM guests WHERE user_id = ?', [userId], (err, guestResult) => {
        if (err) {
          reject(err);
          return;
        }
        
        const totalGuests = guestResult.total;
        
        if (totalGuests === 0) {
          resolve(0); // No guests, so 0% attendance
          return;
        }
        
        // Then, get attendance count for the workshop
        db.get('SELECT COUNT(*) as attended FROM attendance WHERE workshop_id = ?', [workshopId], (err, attendanceResult) => {
          if (err) {
            reject(err);
            return;
          }
          
          const attendedGuests = attendanceResult.attended;
          const percentage = (attendedGuests / totalGuests) * 100;
          
          resolve(percentage);
        });
      });
    });
  }
};

// VIP Access Functions
const addVipAccess = (guestId, workshopId) => {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    db.run(
      'INSERT INTO vip_access (id, guest_id, workshop_id) VALUES (?, ?, ?)',
      [id, guestId, workshopId],
      (err) => {
        if (err) reject(err);
        else resolve({ id, guestId, workshopId });
      }
    );
  });
};

const removeVipAccess = (guestId, workshopId) => {
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM vip_access WHERE guest_id = ? AND workshop_id = ?',
      [guestId, workshopId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
};

const getVipAccessList = (workshopId) => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT g.* FROM guests g
       INNER JOIN vip_access va ON va.guest_id = g.id
       WHERE va.workshop_id = ?`,
      [workshopId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
};

const hasVipAccess = (guestId, workshopId) => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT 1 FROM vip_access WHERE guest_id = ? AND workshop_id = ?',
      [guestId, workshopId],
      (err, row) => {
        if (err) reject(err);
        else resolve(!!row);
      }
    );
  });
};

const getVipWorkshopCount = (workshopId) => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT COUNT(*) as count FROM vip_access WHERE workshop_id = ?',
      [workshopId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.count : 0);
      }
    );
  });
};

// Get all VIP workshops a guest has access to
const getGuestVipWorkshops = (guestId) => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT w.* FROM workshops w
       INNER JOIN vip_access va ON va.workshop_id = w.id
       WHERE va.guest_id = ? AND w.is_vip = 1`,
      [guestId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
};

// Export database objects
module.exports = {
  db,
  userDb,
  initDb,
  // Export functions needed by the API endpoints
  getAllWorkshops: workshopDb.getAllWorkshops,
  getWorkshopById: workshopDb.getWorkshopById,
  createWorkshop: workshopDb.createWorkshop,
  updateWorkshop: workshopDb.updateWorkshop,
  deleteWorkshop: workshopDb.deleteWorkshop,
  
  getAllGuests: guestDb.getAllGuests,
  getGuestById: guestDb.getGuestById,
  getGuestByQRCode: guestDb.getGuestByQRCode,
  createGuest: guestDb.createGuest,
  updateGuest: guestDb.updateGuest,
  deleteGuest: guestDb.deleteGuest,
  
  getAllAttendance: attendanceDb.getAllAttendance,
  getAttendanceRecord: attendanceDb.getAttendanceRecord,
  createAttendance: attendanceDb.createAttendance,
  getGuestAttendance: attendanceDb.getGuestAttendance,
  getWorkshopAttendees: attendanceDb.getWorkshopAttendees,
  getRecentCheckIns: attendanceDb.getRecentCheckIns,
  
  calculateGuestAttendancePercentage: analyticsDb.calculateGuestAttendancePercentage,
  calculateWorkshopAttendancePercentage: analyticsDb.calculateWorkshopAttendancePercentage,
  
  addVipAccess,
  removeVipAccess,
  getVipAccessList,
  hasVipAccess,
  getVipWorkshopCount,
  getGuestVipWorkshops,
}; 