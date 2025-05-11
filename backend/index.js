const express = require('express');
const bcrypt = require('bcrypt');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { 
  db, 
  userDb, 
  initDb,
  // Import the database functions directly
  getAllWorkshops,
  getWorkshopById,
  createWorkshop,
  updateWorkshop,
  deleteWorkshop,
  getAllGuests,
  getGuestById,
  getGuestByQRCode,
  createGuest,
  updateGuest,
  deleteGuest,
  getAllAttendance,
  getAttendanceRecord,
  createAttendance,
  getGuestAttendance,
  getWorkshopAttendees,
  getRecentCheckIns,
  calculateGuestAttendancePercentage,
  calculateWorkshopAttendancePercentage,
  getVipWorkshopCount,
  addVipAccess,
  removeVipAccess,
  getVipAccessList,
  getGuestVipWorkshops
} = require('./database');
const { runRoleMigration } = require('./role_migration');
const { runGuestVipMigration } = require('./guest_vip_migration');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'qrtracker-jwt-secret-key'; // Better to use environment variable in production
const JWT_EXPIRES_IN = '24h';

// Middleware
app.use(cors());
app.use(express.json());

// Authentication middleware for login
const authenticateLogin = async (req, res, next) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  try {
    const user = await userDb.getUserByUsername(username);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Add user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// JWT Authentication middleware
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header required' });
  }
  
  const token = authHeader.split(' ')[1]; // Extract token from "Bearer <token>"
  
  if (!token) {
    return res.status(401).json({ error: 'Token not provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Get user from DB for JWT authenticated routes
const getUserFromJWT = async (req, res, next) => {
  try {
    // Get user by ID (from JWT)
    const user = await userDb.getUserById(req.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Role-based authorization middleware
const authorize = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Admin can access anything
    if (req.user.role === 'admin') {
      return next();
    }

    // For scanner role, check if it's in the allowed roles
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Forbidden: Insufficient permissions',
        userRole: req.user.role,
        requiredRoles: roles 
      });
    }

    next();
  };
};

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

// Register user
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  try {
    // Check if user already exists
    const existingUser = await userDb.getUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const result = await userDb.createUser(username, hashedPassword);
    
    res.status(201).json({ 
      message: 'User created successfully',
      userId: result.id
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/login', authenticateLogin, async (req, res) => {
  try {
    // Record login history
    const loginData = {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.headers['user-agent']
    };
    
    await userDb.updateLoginHistory(req.user.id, loginData);
    
    // Parse login history
    const loginHistory = JSON.parse(req.user.login_history || '[]');
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: req.user.id },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: req.user.id,
        username: req.user.username,
        role: req.user.role,
        loginHistory: loginHistory
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user profile
app.get('/api/profile', authenticateJWT, getUserFromJWT, (req, res) => {
  const loginHistory = JSON.parse(req.user.login_history || '[]');
  
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      loginHistory: loginHistory,
      createdAt: req.user.created_at
    }
  });
});

// Workshop API endpoints
// Get all workshops
app.get('/api/workshops', authenticateJWT, getUserFromJWT, authorize(['admin', 'scanner']), async (req, res) => {
  try {
    // For scanner role, pass null as userId to get all workshops
    // For admin role, pass their userId to only get their workshops
    const userId = req.user.role === 'scanner' ? null : req.userId;
    const workshops = await getAllWorkshops(userId);
    res.json(workshops);
  } catch (error) {
    console.error('Error fetching workshops:', error);
    res.status(500).json({ error: 'Failed to fetch workshops' });
  }
});

// Get workshop by id
app.get('/api/workshops/:id', authenticateJWT, getUserFromJWT, authorize(['admin', 'scanner']), async (req, res) => {
  try {
    // For scanner role, pass null as userId to get any workshop
    // For admin role, pass their userId to only get their workshop
    const userId = req.user.role === 'scanner' ? null : req.userId;
    const workshop = await getWorkshopById(req.params.id, userId);
    if (!workshop) {
      return res.status(404).json({ error: 'Workshop not found' });
    }
    res.json(workshop);
  } catch (error) {
    console.error('Error fetching workshop:', error);
    res.status(500).json({ error: 'Failed to fetch workshop' });
  }
});

// Create workshop
app.post('/api/workshops', authenticateJWT, getUserFromJWT, authorize(['admin']), async (req, res) => {
  try {
    const { name, description, date, location, isVip, maxCapacity } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Workshop name is required' });
    }

    // Validate VIP workshop capacity
    if (isVip && (!maxCapacity || maxCapacity > 31)) {
      return res.status(400).json({ error: 'VIP workshops must have a maximum capacity of 31 or less' });
    }
    
    const newWorkshop = await createWorkshop({
      name,
      description,
      date,
      location,
      isVip,
      maxCapacity: isVip ? maxCapacity : null,
      userId: req.userId
    });
    
    res.status(201).json(newWorkshop);
  } catch (error) {
    console.error('Error creating workshop:', error);
    res.status(500).json({ error: 'Failed to create workshop' });
  }
});

// Update workshop
app.put('/api/workshops/:id', authenticateJWT, getUserFromJWT, authorize(['admin']), async (req, res) => {
  try {
    const workshopId = req.params.id;
    const { name, description, date, location } = req.body;
    
    // Verify workshop exists and belongs to user
    const workshop = await getWorkshopById(workshopId, req.userId);
    if (!workshop) {
      return res.status(404).json({ error: 'Workshop not found' });
    }
    
    const updatedWorkshop = await updateWorkshop(workshopId, {
      name,
      description,
      date,
      location
    });
    
    res.json(updatedWorkshop);
  } catch (error) {
    console.error('Error updating workshop:', error);
    res.status(500).json({ error: 'Failed to update workshop' });
  }
});

// Delete workshop
app.delete('/api/workshops/:id', authenticateJWT, getUserFromJWT, authorize(['admin']), async (req, res) => {
  try {
    const workshopId = req.params.id;
    
    // Verify workshop exists and belongs to user
    const workshop = await getWorkshopById(workshopId, req.userId);
    if (!workshop) {
      return res.status(404).json({ error: 'Workshop not found' });
    }
    
    await deleteWorkshop(workshopId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting workshop:', error);
    res.status(500).json({ error: 'Failed to delete workshop' });
  }
});

// Guest API endpoints
// Get all guests
app.get('/api/guests', authenticateJWT, getUserFromJWT, authorize(['admin', 'scanner']), async (req, res) => {
  try {
    // For scanner role, pass null as userId to get all guests
    // For admin role, pass their userId to only get their guests
    const userId = req.user.role === 'scanner' ? null : req.userId;
    const guests = await getAllGuests(userId);
    res.json(guests);
  } catch (error) {
    console.error('Error fetching guests:', error);
    res.status(500).json({ error: 'Failed to fetch guests' });
  }
});

// Get guest by id
app.get('/api/guests/:id', authenticateJWT, getUserFromJWT, authorize(['admin']), async (req, res) => {
  try {
    const guest = await getGuestById(req.params.id, req.userId);
    if (!guest) {
      return res.status(404).json({ error: 'Guest not found' });
    }
    res.json(guest);
  } catch (error) {
    console.error('Error fetching guest by ID:', error);
    res.status(500).json({ error: 'Failed to fetch guest' });
  }
});

// Get guest by QR code - both admin and scanner can access this
app.get('/api/guests/qr/:qrCode', authenticateJWT, getUserFromJWT, authorize(['admin', 'scanner']), async (req, res) => {
  try {
    // For scanner role, pass null as userId to get any guest
    // For admin role, pass their userId to only get their guest
    const userId = req.user.role === 'scanner' ? null : req.userId;
    const guest = await getGuestByQRCode(req.params.qrCode, userId);
    if (!guest) {
      return res.status(404).json({ error: 'Guest not found' });
    }
    res.json(guest);
  } catch (error) {
    console.error('Error fetching guest by QR code:', error);
    res.status(500).json({ error: 'Failed to fetch guest' });
  }
});

// Create guest
app.post('/api/guests', authenticateJWT, getUserFromJWT, authorize(['admin']), async (req, res) => {
  try {
    const { name, email, organization, isVip } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Guest name is required' });
    }
    
    const newGuest = await createGuest({
      name,
      email,
      organization,
      isVip: isVip === true ? 1 : 0,
      userId: req.userId
    });
    
    res.status(201).json(newGuest);
  } catch (error) {
    console.error('Error creating guest:', error);
    res.status(500).json({ error: 'Failed to create guest' });
  }
});

// Update guest
app.put('/api/guests/:id', authenticateJWT, getUserFromJWT, authorize(['admin']), async (req, res) => {
  try {
    const guestId = req.params.id;
    const { name, email, organization, isVip } = req.body;
    
    // Verify guest exists and belongs to user
    const guest = await getGuestById(guestId, req.userId);
    if (!guest) {
      return res.status(404).json({ error: 'Guest not found' });
    }
    
    const updatedGuest = await updateGuest(guestId, {
      name,
      email,
      organization,
      isVip: isVip === true ? 1 : 0
    });
    
    res.json(updatedGuest);
  } catch (error) {
    console.error('Error updating guest:', error);
    res.status(500).json({ error: 'Failed to update guest' });
  }
});

// Delete guest
app.delete('/api/guests/:id', authenticateJWT, getUserFromJWT, authorize(['admin']), async (req, res) => {
  try {
    const guestId = req.params.id;
    
    // Verify guest exists and belongs to user
    const guest = await getGuestById(guestId, req.userId);
    if (!guest) {
      return res.status(404).json({ error: 'Guest not found' });
    }
    
    await deleteGuest(guestId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting guest:', error);
    res.status(500).json({ error: 'Failed to delete guest' });
  }
});

// Get VIP access list for a guest
app.get('/api/guests/:guestId/vip-access', authenticateJWT, getUserFromJWT, authorize(['admin']), async (req, res) => {
  try {
    const { guestId } = req.params;

    // Verify guest exists
    const guest = await getGuestById(guestId, req.userId);
    if (!guest) {
      return res.status(404).json({ error: 'Guest not found' });
    }
    
    // No need to check VIP status here - we want to allow checking even if a guest isn't VIP
    // so admins can see what VIP workshops a guest has access to, regardless of their VIP status

    // Get all VIP workshops this guest has access to
    const vipWorkshops = await getGuestVipWorkshops(guestId);
    res.json(vipWorkshops);
  } catch (error) {
    console.error('Error fetching guest VIP access list:', error);
    res.status(500).json({ error: 'Failed to fetch guest VIP access list' });
  }
});

// Attendance API endpoints
// Get all attendance records
app.get('/api/attendance', authenticateJWT, getUserFromJWT, authorize(['admin', 'scanner']), async (req, res) => {
  try {
    // For scanner role, pass null as userId to get all attendance records
    // For admin role, pass their userId to only get their attendance records
    const userId = req.user.role === 'scanner' ? null : req.userId;
    const attendance = await getAllAttendance(userId);
    res.json(attendance);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
});

// Record attendance - both admin and scanner can access this
app.post('/api/attendance', authenticateJWT, getUserFromJWT, authorize(['admin', 'scanner']), async (req, res) => {
  try {
    const { guestId, workshopId, timestamp } = req.body;
    
    if (!guestId || !workshopId) {
      return res.status(400).json({ error: 'Guest ID and Workshop ID are required' });
    }
    
    // For scanner role, pass null as userId to get any guest/workshop
    // For admin role, pass their userId to only get their guest/workshop
    const userId = req.user.role === 'scanner' ? null : req.userId;
    
    // Verify guest and workshop exist
    const [guest, workshop] = await Promise.all([
      getGuestById(guestId, userId),
      getWorkshopById(workshopId, userId)
    ]);

    if (!guest) {
      return res.status(404).json({ error: 'Guest not found' });
    }
    if (!workshop) {
      return res.status(404).json({ error: 'Workshop not found' });
    }

    // Check VIP access if workshop is VIP
    if (workshop.isVip || workshop.is_vip) {
      // First check if guest is VIP
      if (!guest.isVip && !guest.is_vip) {
        return res.status(403).json({ error: 'Non-VIP guest cannot attend VIP workshops' });
      }

      // Check workshop capacity
      if (workshop.maxCapacity || workshop.max_capacity) {
        const attendees = await getWorkshopAttendees(workshopId);
        const maxCap = workshop.maxCapacity || workshop.max_capacity;
        if (attendees.length >= maxCap) {
          return res.status(403).json({ error: 'Workshop has reached maximum capacity' });
        }
      }
    }
    
    // Check if attendance is already recorded
    const existingRecord = await getAttendanceRecord(guestId, workshopId);
    if (existingRecord) {
      return res.status(409).json({ error: 'Attendance already recorded' });
    }
    
    const attendanceRecord = await createAttendance({
      guestId,
      workshopId,
      timestamp: timestamp || new Date().toISOString(),
      userId: req.userId
    });
    
    res.status(201).json(attendanceRecord);
  } catch (error) {
    console.error('Error recording attendance:', error);
    res.status(500).json({ error: 'Failed to record attendance' });
  }
});

// Get guest attendance (workshops attended by a guest)
app.get('/api/attendance/guest/:guestId', authenticateJWT, getUserFromJWT, authorize(['admin']), async (req, res) => {
  try {
    const { guestId } = req.params;
    
    // Verify guest exists and belongs to user
    const guest = await getGuestById(guestId, req.userId);
    if (!guest) {
      return res.status(404).json({ error: 'Guest not found' });
    }
    
    const workshops = await getGuestAttendance(guestId);
    res.json(workshops);
  } catch (error) {
    console.error('Error fetching guest attendance:', error);
    res.status(500).json({ error: 'Failed to fetch guest attendance' });
  }
});

// Get workshop attendees
app.get('/api/attendance/workshop/:workshopId', authenticateJWT, getUserFromJWT, authorize(['admin']), async (req, res) => {
  try {
    const { workshopId } = req.params;
    
    // Verify workshop exists and belongs to user
    const workshop = await getWorkshopById(workshopId, req.userId);
    if (!workshop) {
      return res.status(404).json({ error: 'Workshop not found' });
    }
    
    const attendees = await getWorkshopAttendees(workshopId);
    res.json(attendees);
  } catch (error) {
    console.error('Error fetching workshop attendees:', error);
    res.status(500).json({ error: 'Failed to fetch workshop attendees' });
  }
});

// Get recent check-ins
app.get('/api/attendance/recent', authenticateJWT, getUserFromJWT, authorize(['admin']), async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 5;
    const recentCheckIns = await getRecentCheckIns(req.userId, count);
    res.json(recentCheckIns);
  } catch (error) {
    console.error('Error fetching recent check-ins:', error);
    res.status(500).json({ error: 'Failed to fetch recent check-ins' });
  }
});

// Analytics API endpoints
// Get guest attendance percentage
app.get('/api/analytics/guest/:guestId/percentage', authenticateJWT, getUserFromJWT, authorize(['admin']), async (req, res) => {
  try {
    const { guestId } = req.params;
    
    // Verify guest exists and belongs to user
    const guest = await getGuestById(guestId, req.userId);
    if (!guest) {
      return res.status(404).json({ error: 'Guest not found' });
    }
    
    const percentage = await calculateGuestAttendancePercentage(guestId, req.userId);
    res.json({ percentage });
  } catch (error) {
    console.error('Error calculating attendance percentage:', error);
    res.status(500).json({ error: 'Failed to calculate attendance percentage' });
  }
});

// Check if guest is eligible for attestation
app.get('/api/analytics/guest/:guestId/eligible', authenticateJWT, getUserFromJWT, authorize(['admin']), async (req, res) => {
  try {
    const { guestId } = req.params;
    
    // Verify guest exists and belongs to user
    const guest = await getGuestById(guestId, req.userId);
    if (!guest) {
      return res.status(404).json({ error: 'Guest not found' });
    }
    
    const percentage = await calculateGuestAttendancePercentage(guestId, req.userId);
    const eligible = percentage >= 70; // 70% attendance required for attestation
    
    res.json({ eligible, percentage });
  } catch (error) {
    console.error('Error checking attestation eligibility:', error);
    res.status(500).json({ error: 'Failed to check attestation eligibility' });
  }
});

// Get workshop attendance percentage
app.get('/api/analytics/workshop/:workshopId/percentage', authenticateJWT, getUserFromJWT, authorize(['admin']), async (req, res) => {
  try {
    const { workshopId } = req.params;
    
    // Verify workshop exists and belongs to user
    const workshop = await getWorkshopById(workshopId, req.userId);
    if (!workshop) {
      return res.status(404).json({ error: 'Workshop not found' });
    }
    
    const percentage = await calculateWorkshopAttendancePercentage(workshopId, req.userId);
    res.json({ percentage });
  } catch (error) {
    console.error('Error calculating workshop attendance percentage:', error);
    res.status(500).json({ error: 'Failed to calculate workshop attendance percentage' });
  }
});

// Generate certificate endpoint
app.post('/api/certificates/generate', authenticateJWT, getUserFromJWT, authorize(['admin']), async (req, res) => {
  try {
    const { guestId, guestName } = req.body;
    
    if (!guestId || !guestName) {
      return res.status(400).json({ error: 'Missing guest information' });
    }

    // Check if guest exists
    const guest = await getGuestById(guestId, req.userId);
    if (!guest) {
      return res.status(404).json({ error: 'Guest not found' });
    }

    // Check if guest has any attendance records
    const attendance = await getGuestAttendance(guestId);
    if (!attendance || attendance.length === 0) {
      return res.status(403).json({ error: 'Guest has not attended any workshops' });
    }

    // Calculate attendance percentage
    const percentage = await calculateGuestAttendancePercentage(guestId, req.userId);
    if (percentage < 1) { // At least attended one workshop
      return res.status(403).json({ error: 'Guest has not attended any workshops' });
    }

    // Read the certificate template
    const certificateTemplate = path.join(__dirname, 'cert.jpeg');
    
    // Create a sharp instance with the template
    const image = sharp(certificateTemplate);
    
    // Get image metadata
    const metadata = await image.metadata();
    
    // Calculate text position (center of image)
    const textX = Math.floor(metadata.width / 2);
    const textY = Math.floor(metadata.height / 2) + 35;

    // Create SVG text overlay with just the name
    const svgText = `
      <svg width="${metadata.width}" height="${metadata.height}">
        <style>
          .name { font: bold 65px sans-serif; fill: #23519e; }
        </style>
        <text x="${textX}" y="${textY}" text-anchor="middle" class="name">${guestName}</text>
      </svg>
    `;

    // Composite the text onto the image
    const certificateBuffer = await image
      .composite([
        {
          input: Buffer.from(svgText),
          top: 0,
          left: 0,
        },
      ])
      .jpeg()
      .toBuffer();

    // Set response headers
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${guestName.replace(/\\s+/g, '-')}.jpg"`);
    
    // Send the certificate
    res.send(certificateBuffer);
  } catch (error) {
    console.error('Error generating certificate:', error);
    res.status(500).json({ error: 'Failed to generate certificate' });
  }
});

// VIP Access Management Endpoints
app.post('/api/workshops/:workshopId/vip-access', authenticateJWT, getUserFromJWT, authorize(['admin']), async (req, res) => {
  try {
    const { workshopId } = req.params;
    const { guestId } = req.body;

    console.log(`Adding VIP access: Workshop ${workshopId}, Guest ${guestId}`);

    if (!workshopId || !guestId) {
      console.log('Missing required parameters', { workshopId, guestId });
      return res.status(400).json({ error: 'Workshop ID and Guest ID are required' });
    }

    // Verify workshop exists and is VIP
    const workshop = await getWorkshopById(workshopId, req.userId);
    if (!workshop) {
      console.log(`Workshop not found: ${workshopId}`);
      return res.status(404).json({ error: 'Workshop not found' });
    }
    
    console.log('Workshop details:', workshop);
    
    if (!workshop.is_vip && !workshop.isVip) {
      console.log('Workshop is not VIP');
      return res.status(400).json({ error: 'This is not a VIP workshop' });
    }

    // Check current VIP count
    const currentCount = await getVipWorkshopCount(workshopId);
    console.log(`Current VIP count: ${currentCount}, Max capacity: ${workshop.max_capacity || workshop.maxCapacity}`);
    
    if (currentCount >= (workshop.max_capacity || workshop.maxCapacity)) {
      return res.status(400).json({ error: 'VIP workshop has reached maximum capacity' });
    }

    // Verify guest exists
    const guest = await getGuestById(guestId, req.userId);
    if (!guest) {
      console.log(`Guest not found: ${guestId}`);
      return res.status(404).json({ error: 'Guest not found' });
    }
    
    console.log('Guest details:', guest);

    // Add VIP access
    console.log('Adding VIP access...');
    const result = await addVipAccess(guestId, workshopId);
    console.log('VIP access added:', result);
    
    res.status(201).json({ message: 'VIP access granted successfully' });
  } catch (error) {
    console.error('Error granting VIP access:', error);
    res.status(500).json({ error: `Failed to grant VIP access: ${error.message}` });
  }
});

app.delete('/api/workshops/:workshopId/vip-access/:guestId', authenticateJWT, getUserFromJWT, authorize(['admin']), async (req, res) => {
  try {
    const { workshopId, guestId } = req.params;

    // Verify workshop exists and is VIP
    const workshop = await getWorkshopById(workshopId, req.userId);
    if (!workshop) {
      return res.status(404).json({ error: 'Workshop not found' });
    }
    if (!workshop.isVip) {
      return res.status(400).json({ error: 'This is not a VIP workshop' });
    }

    // Remove VIP access
    await removeVipAccess(guestId, workshopId);
    res.status(200).json({ message: 'VIP access removed successfully' });
  } catch (error) {
    console.error('Error removing VIP access:', error);
    res.status(500).json({ error: 'Failed to remove VIP access' });
  }
});

app.get('/api/workshops/:workshopId/vip-access', authenticateJWT, getUserFromJWT, authorize(['admin']), async (req, res) => {
  try {
    const { workshopId } = req.params;

    // Verify workshop exists and is VIP
    const workshop = await getWorkshopById(workshopId, req.userId);
    if (!workshop) {
      return res.status(404).json({ error: 'Workshop not found' });
    }
    if (!workshop.isVip) {
      return res.status(400).json({ error: 'This is not a VIP workshop' });
    }

    // Get VIP access list
    const vipGuests = await getVipAccessList(workshopId);
    res.json(vipGuests);
  } catch (error) {
    console.error('Error fetching VIP access list:', error);
    res.status(500).json({ error: 'Failed to fetch VIP access list' });
  }
});

// Delete attendance record
app.delete('/api/attendance/:id', authenticateJWT, getUserFromJWT, authorize(['admin', 'scanner']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify attendance record exists
    const record = await db.get('SELECT * FROM attendance WHERE id = ?', [id]);
    if (!record) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    
    // Delete the record
    await db.run('DELETE FROM attendance WHERE id = ?', [id]);
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting attendance record:', error);
    res.status(500).json({ error: 'Failed to delete attendance record' });
  }
});

// Initialize database and start server
async function startServer() {
  try {
    // Ensure database tables are created before starting the server
    await initDb();
    
    // Run migrations
    await runRoleMigration();
    await runGuestVipMigration();
    
    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

// Start the server
startServer(); 