const bcrypt = require('bcrypt');
const { db } = require('./database');

async function createUser() {
  try {
    // User credentials
    const username = 'user';
    const password = 'user123';
    const role = 'user';

    // Delete existing user if exists
    await db.run('DELETE FROM users WHERE username = ?', [username]);
    console.log('Cleaned up any existing user with the same username');

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert the new user
    const result = await db.run(
      'INSERT INTO users (username, password, role, created_at) VALUES (?, ?, ?, datetime("now"))',
      [username, hashedPassword, role]
    );

    console.log('User created successfully');
    console.log('Username:', username);
    console.log('Password:', password);
    console.log('Role:', role);

    // Verify the user was created
    const createdUser = await db.get('SELECT username, role, created_at FROM users WHERE username = ?', [username]);
    console.log('\nVerification:');
    console.log('Created user details:', createdUser);

  } catch (error) {
    console.error('Error creating user:', error);
  } finally {
    // Close the database connection
    await db.close();
  }
}

// Run the script
createUser();