// src/pages/Admin/AdminComplaintChat.jsx
import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { AuthContext } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import '../../styles/chat.css';

export default function AdminComplaintChat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { markComplaintAsRead } = useNotifications();
  const [messages, setMessages] = useState([]);
  const [complaint, setComplaint] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [quickReplies, setQuickReplies] = useState([]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [typingStatus, setTypingStatus] = useState({ studentTyping: false, adminTyping: false });
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [activeReactionMessage, setActiveReactionMessage] = useState(null);
  const messageRefs = useRef({});
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
        navigate('/admin/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchQuickReplies = async () => {
    try {
      const res = await api.get('/quick-replies');
      setQuickReplies(res.data.quickReplies || []);
    } catch (err) {
      console.error('Error fetching quick replies:', err);
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
    fetchQuickReplies();
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

  const handleQuickReplySelect = (text) => {
    setNewMessage(text);
    setShowQuickReplies(false);
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

        const response = await api.post(
          `/replies/complaint/${id}/audio`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        if (response.data.reply) {
          fetchMessages();
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

  const handleStatusUpdate = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      await api.patch(`/complaints/${id}/status`, { status: newStatus });
      alert(`Status updated to ${newStatus}`);
      fetchMessages();
    } catch (err) {
      console.error('Error updating status:', err);
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
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
            onClick={() => navigate('/admin/dashboard')}
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
            <div className="flex gap-2">
              {complaint.status === 'open' && (
                <button
                  onClick={() => handleStatusUpdate('in_review')}
                  disabled={updatingStatus}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded font-semibold transition disabled:opacity-50"
                >
                  Start Review
                </button>
              )}
              {(complaint.status === 'open' || complaint.status === 'in_review') && (
                <button
                  onClick={() => handleStatusUpdate('resolved')}
                  disabled={updatingStatus}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold transition disabled:opacity-50"
                >
                  Mark Resolved
                </button>
              )}
            </div>
          </div>
        </div>

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
                const currentUserId =
                  user?.id?.toString() ||
                  user?._id?.toString() ||
                  user?.userId?.toString() ||
                  user?.data?._id?.toString() ||
                  user?.data?.id?.toString();
                let lastSenderType = null;
                return messages.map((msg, index) => {
                  console.log("MESSAGE:", msg);
                  const currentUserId =
                    user?.id ||
                    user?._id ||
                    user?.userId ||
                    user?.id?.toString() ||
                    null;
                  console.log("CURRENT USER:", currentUserId);
                  // ADMIN VIEW: isSelf === true → RIGHT → PINK, else → LEFT → GREEN
                  const isSelf = msg.senderId?.toString() === currentUserId?.toString();
                  const senderType = isSelf ? "you" : "student";
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
                        {senderType === "you" ? "[YOU]" : "[STUDENT]"}
                      </div>
                    )}
                    <div 
                      className={`msg-row ${isSelf ? 'right' : 'left'}`}
                      ref={el => messageRefs.current[msg._id] = el}
                    >
                      <div className={`bubble ${isSelf ? 'pink' : 'green'}`} onClick={(e) => handleReactionClick(msg._id, e)}>
                        {msg.attachments?.length > 0 &&
                         msg.attachments[0].mimetype?.startsWith("audio") ? (
                          <audio
                            controls
                            src={`http://localhost:4000${msg.attachments[0].url}`}
                            className="w-full"
                          />
                        ) : null}
                        {msg.message && (
                          <p className="text-sm mb-1">{msg.message}</p>
                        )}
                        {msg.attachments && msg.attachments.length > 0 && 
                         !msg.attachments[0].mimetype?.startsWith("audio") && (
                          <div className="mt-2 space-y-1">
                            {msg.attachments.map((file, idx) => (
                              <a
                                key={idx}
                                href={`http://localhost:4000${file.url}`}
                                target="_blank"
                                rel="noreferrer"
                                className={`text-xs underline block ${isSelf ? 'text-black' : 'text-white'}`}
                              >
                                Attachment {idx + 1}
                              </a>
                            ))}
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
              {typingStatus.studentTyping && (
                <div className="msg-row left">
                  <div className="bubble pink">
                    Student is typing...
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
            <div className="relative flex-1">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping(true);
                }}
                onBlur={() => handleTyping(false)}
                placeholder="Type your message..."
                className="w-full p-2 bg-gray-800 rounded text-white border border-gray-700 focus:outline-none focus:border-[#00ffda]"
                disabled={sending || isRecording}
              />
              {showQuickReplies && (
                <div className="absolute bottom-full left-0 mb-2 w-full bg-gray-800 border border-gray-700 rounded-lg p-2 max-h-48 overflow-y-auto">
                  {quickReplies.length === 0 ? (
                    <p className="text-gray-400 text-sm">No quick replies available</p>
                  ) : (
                    quickReplies.map((qr) => (
                      <button
                        key={qr._id}
                        type="button"
                        onClick={() => handleQuickReplySelect(qr.text)}
                        className="w-full text-left p-2 hover:bg-gray-700 rounded text-sm mb-1"
                      >
                        <span className="font-semibold">{qr.label}:</span> {qr.text}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowQuickReplies(!showQuickReplies)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition"
              title="Quick Replies"
            >
              ⚡
            </button>
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
