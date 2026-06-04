import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '../Components/Navbar/Navbar';
import Footer from '../Components/Footer/Footer';
import { useSafety } from '../context/SafetyContext';
import { useAuth } from '../context/auth';
import axios from 'axios';
import {
  FiSend,
  FiArrowLeft,
  FiCheck,
  FiCheckCircle,
  FiWifi,
  FiWifiOff,
  FiMic,
  FiImage,
  FiPaperclip,
  FiAlertOctagon
} from 'react-icons/fi';
import '../styles/AegisHer.css';

/**
 * AegisHer Emergency Chat Console
 * Production-grade real-time messaging for victim ↔ volunteer communication.
 * Socket-driven with typing indicators, timestamps, auto-scroll, and message history.
 */
export default function ChatScreen() {
  const [auth] = useAuth();
  const {
    user,
    incidentId,
    isSosTriggered,
    isConnected,
    messages,
    sendMessage,
    typingUsers,
    emitTypingStatus,
    assignedResponders
  } = useSafety();

  const [inputText, setInputText] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Load historical chat messages from REST API on mount or incident change
  useEffect(() => {
    if (!incidentId || !auth?.token) {
      setHistoryLoaded(false);
      setChatHistory([]);
      return;
    }

    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const res = await axios.get(
          `http://localhost:8000/api/v1/chats/${user.id}/emergncye/${incidentId}`,
          { headers: { Authorization: `Bearer ${auth.token}` } }
        );
        if (res.status === 200 && Array.isArray(res.data)) {
          const formattedHistory = res.data.map(msg => ({
            senderId: msg.sender,
            senderName: msg.senderName || 'Unknown',
            text: msg.textChat,
            timestamp: msg.createdAt || new Date(),
            isHistory: true
          }));
          setChatHistory(formattedHistory);
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      } finally {
        setIsLoadingHistory(false);
        setHistoryLoaded(true);
      }
    };

    loadHistory();
  }, [incidentId, auth, user.id]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, chatHistory, scrollToBottom]);

  // Merge historical + live messages and deduplicate
  const allMessages = [...chatHistory, ...messages].reduce((acc, msg) => {
    const key = `${msg.senderId}-${msg.text}-${new Date(msg.timestamp).getTime()}`;
    if (!acc.seen.has(key)) {
      acc.seen.add(key);
      acc.list.push(msg);
    }
    return acc;
  }, { seen: new Set(), list: [] }).list;

  // Handle input changes with typing indicator debounce
  const handleInputChange = (e) => {
    setInputText(e.target.value);

    // Emit typing started
    emitTypingStatus(user.name, true);

    // Clear previous timeout and set new one to stop typing after 2 seconds of inactivity
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      emitTypingStatus(user.name, false);
    }, 2000);
  };

  // Send message handler
  const handleSendMessage = () => {
    const trimmed = inputText.trim();
    if (!trimmed || !incidentId) return;

    sendMessage(trimmed, user.name);
    setInputText('');

    // Stop typing indicator immediately
    emitTypingStatus(user.name, false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  // Handle Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Format timestamp for display
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Group messages by date
  const getDateGroups = () => {
    const groups = [];
    let currentDate = '';
    allMessages.forEach(msg => {
      const msgDate = formatDate(msg.timestamp);
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ type: 'date', label: msgDate });
      }
      groups.push({ type: 'message', data: msg });
    });
    return groups;
  };

  const isOwnMessage = (msg) => msg.senderId === user.id;

  // No active incident — show idle state
  if (!isSosTriggered || !incidentId) {
    return (
      <div className="aegis-container">
        <Navbar />
        <div className="container py-5 flex-grow-1 d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
          <div style={styles.emptyStateContainer}>
            <div style={styles.emptyIconContainer}>
              <FiAlertOctagon size={48} color="#64748b" />
            </div>
            <h3 style={styles.emptyTitle}>Emergency Chat Console</h3>
            <p style={styles.emptyDescription}>
              The real-time chat channel activates automatically when an SOS distress signal is triggered.
              All communication between victim and assigned responders will appear here.
            </p>
            <div style={styles.statusPill}>
              <span style={styles.statusDot(false)}></span>
              No Active Incident
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const dateGroups = getDateGroups();

  return (
    <div className="aegis-container">
      <Navbar />

      <div className="container py-4 flex-grow-1" style={{ maxWidth: '900px' }}>
        {/* Chat Header */}
        <div style={styles.chatHeader}>
          <div style={styles.chatHeaderLeft}>
            <div style={styles.chatHeaderAvatar}>
              <FiAlertOctagon size={22} color="#f43f5e" />
            </div>
            <div>
              <h3 style={styles.chatHeaderTitle}>
                Emergency Channel #{incidentId?.slice(-6).toUpperCase()}
              </h3>
              <div style={styles.chatHeaderSubtitle}>
                <span style={styles.statusDot(isConnected)}></span>
                {isConnected ? 'Connected' : 'Reconnecting...'}
                {assignedResponders.length > 0 && (
                  <span style={styles.responderCount}>
                    · {assignedResponders.length} responder{assignedResponders.length !== 1 ? 's' : ''} online
                  </span>
                )}
              </div>
            </div>
          </div>
          <div style={styles.connectionBadge(isConnected)}>
            {isConnected ? <FiWifi size={14} /> : <FiWifiOff size={14} />}
          </div>
        </div>

        {/* Messages Container */}
        <div ref={chatContainerRef} style={styles.messagesContainer}>
          {isLoadingHistory && (
            <div style={styles.loadingContainer}>
              <div className="spinner-border spinner-border-sm text-danger" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <span style={styles.loadingText}>Loading chat history...</span>
            </div>
          )}

          {!isLoadingHistory && allMessages.length === 0 && (
            <div style={styles.noMessagesContainer}>
              <p style={styles.noMessagesText}>
                No messages yet. Start communicating with your assigned responders.
              </p>
            </div>
          )}

          {dateGroups.map((item, idx) => {
            if (item.type === 'date') {
              return (
                <div key={`date-${idx}`} style={styles.dateDivider}>
                  <span style={styles.dateDividerText}>{item.label}</span>
                </div>
              );
            }

            const msg = item.data;
            const own = isOwnMessage(msg);

            return (
              <div
                key={`msg-${idx}`}
                style={styles.messageRow(own)}
              >
                <div style={styles.messageBubble(own)}>
                  {!own && (
                    <span style={styles.senderName}>{msg.senderName || 'Responder'}</span>
                  )}
                  <p style={styles.messageText}>{msg.text}</p>
                  <div style={styles.messageFooter}>
                    <span style={styles.messageTime}>{formatTime(msg.timestamp)}</span>
                    {own && (
                      <span style={styles.messageStatus}>
                        <FiCheck size={12} />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {typingUsers && typingUsers.length > 0 && (
            <div style={styles.typingContainer}>
              <div style={styles.typingBubble}>
                <div style={styles.typingDots}>
                  <span style={styles.typingDot(0)}></span>
                  <span style={styles.typingDot(1)}></span>
                  <span style={styles.typingDot(2)}></span>
                </div>
                <span style={styles.typingText}>
                  {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Area */}
        <div style={styles.inputContainer}>
          <div style={styles.inputWrapper}>
            <textarea
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type your emergency message..."
              rows={1}
              style={styles.textInput}
              disabled={!isConnected}
            />
            <div style={styles.inputActions}>
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || !isConnected}
                style={styles.sendButton(!inputText.trim() || !isConnected)}
                title="Send message"
              >
                <FiSend size={18} />
              </button>
            </div>
          </div>

          {!isConnected && (
            <div style={styles.offlineBanner}>
              <FiWifiOff size={14} />
              <span>Connection lost. Attempting to reconnect...</span>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  STYLES — Dark-mode chat UI with AegisHer branding
// ═══════════════════════════════════════════════════════════
const styles = {
  // Empty state
  emptyStateContainer: {
    textAlign: 'center',
    padding: '48px 24px',
    maxWidth: '420px'
  },
  emptyIconContainer: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: 'rgba(100,116,139,0.08)',
    border: '1px solid rgba(100,116,139,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px'
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#e2e8f0',
    marginBottom: '8px'
  },
  emptyDescription: {
    fontSize: '13px',
    color: '#64748b',
    lineHeight: '1.6',
    marginBottom: '20px'
  },
  statusPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    borderRadius: '20px',
    backgroundColor: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    fontSize: '12px',
    fontWeight: '600',
    color: '#64748b'
  },
  statusDot: (active) => ({
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: active ? '#10b981' : '#64748b',
    display: 'inline-block',
    boxShadow: active ? '0 0 8px rgba(16,185,129,0.5)' : 'none'
  }),

  // Chat header
  chatHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px 16px 0 0',
    backdropFilter: 'blur(12px)'
  },
  chatHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  chatHeaderAvatar: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    backgroundColor: 'rgba(244,63,94,0.08)',
    border: '1px solid rgba(244,63,94,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  chatHeaderTitle: {
    fontSize: '15px',
    fontWeight: '800',
    color: '#e2e8f0',
    margin: '0 0 2px 0'
  },
  chatHeaderSubtitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: '#64748b'
  },
  responderCount: {
    color: '#10b981'
  },
  connectionBadge: (connected) => ({
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: connected ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)',
    color: connected ? '#10b981' : '#f43f5e',
    border: `1px solid ${connected ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)'}`
  }),

  // Messages
  messagesContainer: {
    height: 'calc(100vh - 340px)',
    minHeight: '400px',
    overflowY: 'auto',
    padding: '20px 16px',
    backgroundColor: 'rgba(3, 7, 18, 0.5)',
    borderLeft: '1px solid rgba(255,255,255,0.04)',
    borderRight: '1px solid rgba(255,255,255,0.04)',
    scrollBehavior: 'smooth'
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '24px'
  },
  loadingText: {
    fontSize: '12px',
    color: '#64748b'
  },
  noMessagesContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: '24px'
  },
  noMessagesText: {
    fontSize: '13px',
    color: '#475569',
    textAlign: 'center'
  },

  // Date dividers
  dateDivider: {
    display: 'flex',
    justifyContent: 'center',
    margin: '16px 0'
  },
  dateDividerText: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#475569',
    backgroundColor: 'rgba(15,23,42,0.8)',
    padding: '4px 14px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.05)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em'
  },

  // Message bubbles
  messageRow: (own) => ({
    display: 'flex',
    justifyContent: own ? 'flex-end' : 'flex-start',
    marginBottom: '8px',
    paddingLeft: own ? '48px' : '0',
    paddingRight: own ? '0' : '48px'
  }),
  messageBubble: (own) => ({
    maxWidth: '75%',
    padding: '10px 14px',
    borderRadius: own ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
    backgroundColor: own ? 'rgba(244,63,94,0.12)' : 'rgba(30,41,59,0.7)',
    border: `1px solid ${own ? 'rgba(244,63,94,0.15)' : 'rgba(255,255,255,0.06)'}`,
    wordBreak: 'break-word'
  }),
  senderName: {
    display: 'block',
    fontSize: '11px',
    fontWeight: '700',
    color: '#10b981',
    marginBottom: '4px'
  },
  messageText: {
    fontSize: '13px',
    color: '#e2e8f0',
    margin: '0',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap'
  },
  messageFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '4px',
    marginTop: '4px'
  },
  messageTime: {
    fontSize: '10px',
    color: '#475569'
  },
  messageStatus: {
    color: '#10b981',
    display: 'flex',
    alignItems: 'center'
  },

  // Typing indicator
  typingContainer: {
    padding: '4px 0',
    marginBottom: '4px'
  },
  typingBubble: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 14px',
    borderRadius: '14px',
    backgroundColor: 'rgba(30,41,59,0.5)',
    border: '1px solid rgba(255,255,255,0.04)'
  },
  typingDots: {
    display: 'flex',
    gap: '3px'
  },
  typingDot: (index) => ({
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#64748b',
    animation: `typingPulse 1.4s infinite ease-in-out ${index * 0.2}s`
  }),
  typingText: {
    fontSize: '11px',
    color: '#64748b',
    fontStyle: 'italic'
  },

  // Input area
  inputContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '0 0 16px 16px',
    padding: '12px 16px',
    backdropFilter: 'blur(12px)'
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '10px',
    backgroundColor: 'rgba(3,7,18,0.4)',
    borderRadius: '12px',
    padding: '8px 12px',
    border: '1px solid rgba(255,255,255,0.06)'
  },
  textInput: {
    flex: 1,
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#e2e8f0',
    fontSize: '13px',
    resize: 'none',
    minHeight: '22px',
    maxHeight: '100px',
    fontFamily: 'inherit',
    lineHeight: '1.5'
  },
  inputActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  sendButton: (disabled) => ({
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: disabled ? 'rgba(255,255,255,0.03)' : 'rgba(244,63,94,0.8)',
    color: disabled ? '#475569' : '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease'
  }),
  offlineBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '8px',
    padding: '8px',
    borderRadius: '8px',
    backgroundColor: 'rgba(244,63,94,0.06)',
    border: '1px solid rgba(244,63,94,0.12)',
    fontSize: '11px',
    color: '#f43f5e'
  }
};
