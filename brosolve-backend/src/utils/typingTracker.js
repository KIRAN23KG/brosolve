// src/utils/typingTracker.js
// In-memory typing tracker
const typingState = new Map();

// Update typing state
function updateTyping(complaintId, userRole, isTyping) {
  const key = complaintId.toString();
  if (!typingState.has(key)) {
    typingState.set(key, {
      studentTyping: false,
      adminTyping: false,
      updatedAt: new Date()
    });
  }

  const state = typingState.get(key);
  if (userRole === 'student') {
    state.studentTyping = isTyping;
  } else if (['admin', 'superadmin'].includes(userRole)) {
    state.adminTyping = isTyping;
  }
  state.updatedAt = new Date();
}

// Get typing state (auto-expire after 5 seconds)
function getTyping(complaintId) {
  const key = complaintId.toString();
  if (!typingState.has(key)) {
    return { studentTyping: false, adminTyping: false };
  }

  const state = typingState.get(key);
  const now = new Date();
  const diffMs = now - state.updatedAt;
  
  // Auto-expire after 5 seconds
  if (diffMs > 5000) {
    typingState.delete(key);
    return { studentTyping: false, adminTyping: false };
  }

  return {
    studentTyping: state.studentTyping,
    adminTyping: state.adminTyping
  };
}

module.exports = { updateTyping, getTyping };

