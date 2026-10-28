const crypto = require('crypto');

/**
 * Verifies a password against a Werkzeug-style PBKDF2 hash: pbkdf2:sha256:<iterations>$<salt>$<hash>
 */
function verifyPassword(password, hashedPassword) {
  if (!hashedPassword) return false;
  
  if (!hashedPassword.startsWith('pbkdf2:sha256:')) {
    // Fallback if password is plaintext (just in case of manual database changes)
    return password === hashedPassword;
  }
  
  try {
    const parts = hashedPassword.split('$');
    if (parts.length !== 3) return false;
    
    const prefix = parts[0]; // e.g., "pbkdf2:sha256:600000"
    const salt = parts[1];
    const hashVal = parts[2];
    
    const iterations = parseInt(prefix.split(':')[2], 10);
    // Werkzeug hashes are hex-encoded, so keylen is hashVal length / 2
    const keylen = hashVal.length / 2; 
    
    const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, keylen, 'sha256');
    const computedHash = derivedKey.toString('hex');
    
    return computedHash === hashVal;
  } catch (error) {
    console.error("Error verifying password:", error);
    return false;
  }
}

/**
 * Hashes a password using Werkzeug-style PBKDF2 hash formatting: pbkdf2:sha256:<iterations>$<salt>$<hash>
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(8).toString('hex');
  const iterations = 600000;
  const keylen = 32;
  const derivedKey = crypto.pbkdf2Sync(password, salt, iterations, keylen, 'sha256');
  const hashVal = derivedKey.toString('hex');
  return `pbkdf2:sha256:${iterations}$${salt}$${hashVal}`;
}

module.exports = {
  verifyPassword,
  hashPassword
};
