let typingStates = {};

function updateTyping(complaintId, role, isTyping) {
  if (!typingStates[complaintId]) {
    typingStates[complaintId] = { student: false, admin: false };
  }
  typingStates[complaintId][role] = isTyping;
}

function getTyping(complaintId) {
  return typingStates[complaintId] || { student: false, admin: false };
}

module.exports = { updateTyping, getTyping };

