// Test bcrypt hashing and comparison
const bcrypt = require('bcryptjs');

async function testBcrypt() {
  const password = 'admin123';
  const storedHash = '$2b$10$X2R8CVDFYkdlbjdYWtTK7uJ1v3uCG2lLBVmOAXoJ2i8LojRxurxDO';
  
  console.log('🔐 Testing bcrypt:');
  console.log('  - Password:', password);
  console.log('  - Stored hash:', storedHash);
  console.log('');
  
  // Test 1: Compare with stored hash
  console.log('Test 1: Comparing password with stored hash');
  const match1 = await bcrypt.compare(password, storedHash);
  console.log('  Result:', match1);
  console.log('');
  
  // Test 2: Create new hash and compare
  console.log('Test 2: Creating new hash from password');
  const newHash = await bcrypt.hash(password, 10);
  console.log('  New hash:', newHash);
  const match2 = await bcrypt.compare(password, newHash);
  console.log('  New hash matches password:', match2);
  console.log('');
  
  // Test 3: Compare stored hash with new hash
  console.log('Test 3: Comparing stored hash with new hash');
  const match3 = await bcrypt.compare(password, newHash);
  console.log('  Stored hash matches new hash:', storedHash === newHash);
  console.log('  But both should verify the same password:', match1, match2);
}

testBcrypt().catch(console.error);

