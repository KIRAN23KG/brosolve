// src/pages/Student/StudentComplaintChat.jsx
import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { AuthContext } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import '../../styles/chat.css';

export default function StudentComplaintChat() {
  const isStudentView = window.location.pathname.includes("/student");
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { markComplaintAsRead } = useNotifications();
  const [messages, setMessages] = useState([]);
  const [complaint, setComplaint] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingStatus, setTypingStatus] = useState({ studentTyping: false, adminTyping: false });
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [activeReactionMessage, setActiveReactionMessage] = useState(null);
  const messageRefs = useRef({});
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const messagesContainerRef = useRef(null);

  const scrollToBottom = () => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleScroll = (e) => {
    const el = e.target;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setAutoScroll(isNearBottom);
  };

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/complaints/${id}/messages`);
      setMessages(res.data.messages || []);
      setComplaint(res.data.complaint);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error('Error fetching messages:', err);
      if (err.response?.status === 404) {
        alert('Complaint not found');
        navigate('/student/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTypingStatus = async () => {
    try {
      const res = await api.get(`/complaints/${id}/typing`);
      setTypingStatus(res.data);
    } catch (err) {
      console.error('Error fetching typing status:', err);
    }
  };

  useEffect(() => {
    fetchMessages();
    markComplaintAsRead(id);
    
    // Polling every 4 seconds
    const interval = setInterval(fetchMessages, 4000);
    // Poll typing status every 2 seconds
    const typingInterval = setInterval(fetchTypingStatus, 2000);
    
    return () => {
      clearInterval(interval);
      clearInterval(typingInterval);
    };
  }, [id]);

  // Initial scroll to bottom on first load
  useEffect(() => {
    if (messages.length > 0 && autoScroll) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, autoScroll]);

  // Handle typing indicator
  const handleTyping = (typing) => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setIsTyping(typing);
    
    if (typing) {
      api.post(`/complaints/${id}/typing`, { isTyping: true });
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        api.post(`/complaints/${id}/typing`, { isTyping: false });
      }, 1500);
    } else {
      api.post(`/complaints/${id}/typing`, { isTyping: false });
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && selectedFiles.length === 0) return;

    handleTyping(false);
    setSending(true);
    try {
      const formData = new FormData();
      formData.append('message', newMessage);
      selectedFiles.forEach((file) => {
        formData.append('attachments', file);
      });

      await api.post(`/complaints/${id}/messages`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setNewMessage('');
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      fetchMessages();
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const handleReactionClick = (messageId, e) => {
    e.stopPropagation();
    setActiveReactionMessage(
      activeReactionMessage === messageId ? null : messageId
    );
  };

  const handleReaction = async (messageId, emoji, e) => {
    e.stopPropagation();
    try {
      await api.post(`/complaints/${id}/messages/${messageId}/react`, { emoji });
      setActiveReactionMessage(null);
      fetchMessages();
    } catch (err) {
      console.error('Error adding reaction:', err);
    }
  };

  // Close reaction popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (activeReactionMessage && !messageRefs.current[activeReactionMessage]?.contains(e.target)) {
        setActiveReactionMessage(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeReactionMessage]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current = recorder;

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("audio", blob, "voice-message.webm");

        try {
          const response = await api.post(
            `/replies/complaint/${id}/audio`,
            formData,
            { headers: { "Content-Type": "multipart/form-data" } }
          );

          if (response.data.success && response.data.newMessage) {
            // Immediately add the new message to chat
            setMessages(prev => [...prev, response.data.newMessage]);
            // Also refresh to ensure sync
            fetchMessages();
          }
        } catch (err) {
          console.error('Error sending voice message:', err);
          alert('Failed to send voice message');
        }

        audioChunksRef.current = [];
        stream.getTracks().forEach(track => track.stop());
        setRecordingTime(0);
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      const interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      recordingIntervalRef.current = interval;
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const handleCloseComplaint = () => {
    if (complaint.status === 'resolved') {
      setShowRatingModal(true);
    } else {
      if (!window.confirm('Are you sure you want to close this complaint?')) return;
      closeComplaint();
    }
  };

  const closeComplaint = async () => {
    try {
      await api.patch(`/complaints/${id}/close`);
      alert('Complaint closed successfully');
      fetchMessages();
      setShowRatingModal(false);
    } catch (err) {
      console.error('Error closing complaint:', err);
      alert(err.response?.data?.message || 'Failed to close complaint');
    }
  };

  const handleSubmitRating = async () => {
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    setSubmittingRating(true);
    try {
      await api.post(`/complaints/${id}/rating`, {
        score: rating,
        comment: ratingComment
      });
      await closeComplaint();
      alert('Thanks for your feedback!');
    } catch (err) {
      console.error('Error submitting rating:', err);
      alert('Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'closed': return 'bg-gray-500';
      case 'resolved': return 'bg-green-500';
      case 'in_review': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const emojis = ['👍', '❤️', '😂', '😢'];

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Loading chat...</p>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Complaint not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto p-6 chat-container">
        {/* Header */}
        <div className="mb-6 flex-shrink-0">
          <button
            onClick={() => navigate('/student/dashboard')}
            className="text-[#00ffda] hover:underline mb-4"
          >
            ← Back to Dashboard
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-semibold mb-2">{complaint.title || 'Complaint Chat'}</h1>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded text-sm font-semibold ${getStatusColor(complaint.status)}`}>
                  {complaint.status?.toUpperCase() || 'OPEN'}
                </span>
                {unreadCount > 0 && (
                  <span className="text-yellow-400 text-sm">
                    {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
            {complaint.status === 'resolved' && (
              <button
                onClick={handleCloseComplaint}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition"
              >
                Mark as Solved
              </button>
            )}
          </div>
        </div>

        {/* Rating Modal */}
        {showRatingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
              <h2 className="text-2xl font-semibold mb-4">Rate Your Experience</h2>
              <div className="mb-4">
                <p className="text-sm text-gray-400 mb-2">How satisfied were you with the resolution?</p>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className={`text-4xl ${rating >= star ? 'text-yellow-400' : 'text-gray-600'} hover:text-yellow-400 transition`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">Any feedback? (Optional)</label>
                <textarea
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  className="w-full p-2 bg-gray-700 rounded text-white border border-gray-600 focus:outline-none focus:border-[#00ffda]"
                  rows="3"
                  placeholder="Share your thoughts..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRatingModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitRating}
                  disabled={submittingRating || rating === 0}
                  className="flex-1 px-4 py-2 bg-[#00ffda] text-black font-semibold rounded hover:opacity-80 transition disabled:opacity-50"
                >
                  {submittingRating ? 'Submitting...' : 'Submit & Close Complaint'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Messages Container */}
        <div 
          ref={messagesContainerRef}
          className="bg-gray-900 rounded-lg border border-gray-700 p-4 mb-4 chat-messages flex-shrink-0"
          onScroll={handleScroll}
        >
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(() => {
                let lastSenderType = null;
                return messages.map((msg, index) => {
                  const sender = msg.sender?.toLowerCase();

                  // student view → YOU = student
                  const isSelf = isStudentView ? sender === "student" : sender === "admin";

                  const sideClass = isSelf ? "right" : "left";
                  const colorClass = isSelf ? "pink" : "green";

                  const senderType = isSelf ? "you" : (isStudentView ? "admin" : "student");
                  const showHeader = lastSenderType !== senderType;
                  lastSenderType = senderType;
                  const showDate = index === 0 || 
                  formatDate(messages[index - 1].createdAt) !== formatDate(msg.createdAt);

                return (
                  <div key={msg._id || index}>
                    {showDate && (
                      <div className="text-center text-gray-500 text-sm my-4">
                        {formatDate(msg.createdAt)}
                      </div>
                    )}
                    {showHeader && (
                      <div className="text-center text-gray-400 text-xs my-3">
                        {senderType === "you" ? "[YOU]" : "[ADMIN]"}
                      </div>
                    )}
                    <div 
                      className={`msg-row ${sideClass}`}
                      ref={el => messageRefs.current[msg._id] = el}
                    >
                      <div className={`bubble ${colorClass}`} onClick={(e) => handleReactionClick(msg._id, e)}>
                        {msg.audioUrl && (
                          <audio
                            controls
                            src={`http://localhost:4000${msg.audioUrl}`}
                            className="w-full"
                          />
                        )}
                        {msg.message && (
                          <p className="text-sm mb-1">{msg.message}</p>
                        )}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {msg.attachments.map((file, idx) => {
                              const fileUrl = typeof file === 'string' ? file : file.url;
                              return (
                                <a
                                  key={idx}
                                  href={`http://localhost:4000${fileUrl}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`text-xs underline block ${isSelf ? 'text-black' : 'text-white'}`}
                                >
                                  Attachment {idx + 1}
                                </a>
                              );
                            })}
                          </div>
                        )}
                        <span className="timestamp">
                          {formatTime(msg.createdAt)}
                        </span>
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className={`reactions-container ${isSelf ? 'reactions-right' : 'reactions-left'}`}>
                            {Object.entries(
                              msg.reactions.reduce((acc, r) => {
                                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                return acc;
                              }, {})
                            ).map(([emoji, count]) => (
                              <span key={emoji} className="reaction-emoji">
                                {emoji} ×{count}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {activeReactionMessage === msg._id && (
                        <div className={`reaction-popup ${isSelf ? 'popup-right' : 'popup-left'}`}>
                          {emojis.map(emoji => (
                            <button
                              key={emoji}
                              onClick={(e) => handleReaction(msg._id, emoji, e)}
                              type="button"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
                });
              })()}
              {typingStatus.adminTyping && (
                <div className="msg-row left">
                  <div className="bubble pink">
                    Admin is typing...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="bg-gray-900 rounded-lg border border-gray-700 p-4 flex-shrink-0">
          {selectedFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {selectedFiles.map((file, idx) => (
                <span key={idx} className="text-xs bg-gray-700 px-2 py-1 rounded">
                  {file.name}
                </span>
              ))}
            </div>
          )}
          {isRecording && (
            <div className="mb-2 flex items-center gap-2 text-red-400">
              <span className="animate-pulse">🔴 Recording...</span>
              <span>{formatRecordingTime(recordingTime)}</span>
              <button
                type="button"
                onClick={stopRecording}
                className="ml-auto px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
              >
                Stop
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping(true);
              }}
              onBlur={() => handleTyping(false)}
              placeholder="Type your message..."
              className="flex-1 p-2 bg-gray-800 rounded text-white border border-gray-700 focus:outline-none focus:border-[#00ffda]"
              disabled={sending || isRecording}
            />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              className="hidden"
              id="file-input"
            />
            <label
              htmlFor="file-input"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded cursor-pointer transition"
            >
              📎
            </label>
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition"
                title="Voice Message"
              >
                🎤
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition"
              >
                ⏹️
              </button>
            )}
            <button
              type="submit"
              disabled={sending || isRecording || (!newMessage.trim() && selectedFiles.length === 0)}
              className="px-6 py-2 bg-[#00ffda] text-black font-semibold rounded hover:opacity-80 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
