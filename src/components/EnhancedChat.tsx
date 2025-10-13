import React, { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  timestamp: string;
  chat_type: 'team' | 'personal';
  recipient_id?: string;
  read?: boolean;
}

interface User {
  id: string;
  name: string;
  avatar: string;
  is_online?: boolean;
}

interface ChatProps {
  visible: boolean;
  onClose: () => void;
  currentUser: User;
  users: User[];
  apiCall: (endpoint: string, options?: RequestInit) => Promise<any>;
  wsRef: React.MutableRefObject<WebSocket | null>;
}

const EnhancedChat: React.FC<ChatProps> = ({ 
  visible, 
  onClose, 
  currentUser,
  users,
  apiCall,
  wsRef 
}) => {
  const [activeTab, setActiveTab] = useState<'team' | 'personal'>('team');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [teamMessages, setTeamMessages] = useState<Message[]>([]);
  const [personalChats, setPersonalChats] = useState<{[userId: string]: Message[]}>({});
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [teamMessages, personalChats, selectedUser]);

  // Load messages
  useEffect(() => {
    if (visible) {
      loadTeamMessages();
      loadPersonalChats();
    }
  }, [visible]);

  // WebSocket message handler
  useEffect(() => {
    if (!wsRef.current) return;

    const handleMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'new_team_message') {
        setTeamMessages(prev => [...prev, data.message]);
      } else if (data.type === 'new_personal_message') {
        const otherUserId = data.message.sender_id === currentUser.id 
          ? data.message.recipient_id 
          : data.message.sender_id;
        
        setPersonalChats(prev => ({
          ...prev,
          [otherUserId]: [...(prev[otherUserId] || []), data.message]
        }));
      }
    };

    wsRef.current.addEventListener('message', handleMessage);
    return () => {
      wsRef.current?.removeEventListener('message', handleMessage);
    };
  }, [wsRef.current, currentUser.id]);

  const loadTeamMessages = async () => {
    try {
      const messages = await apiCall('/api/chat/team');
      setTeamMessages(messages);
    } catch (error) {
      console.error('Failed to load team messages:', error);
    }
  };

  const loadPersonalChats = async () => {
    try {
      const chats = await apiCall('/api/chat/personal');
      setPersonalChats(chats);
    } catch (error) {
      console.error('Failed to load personal chats:', error);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim()) return;

    try {
      const endpoint = activeTab === 'team' 
        ? '/api/chat/team' 
        : `/api/chat/personal/${selectedUser?.id}`;
      
      const message = await apiCall(endpoint, {
        method: 'POST',
        body: JSON.stringify({ content: messageInput })
      });

      if (activeTab === 'team') {
        setTeamMessages(prev => [...prev, message]);
      } else if (selectedUser) {
        setPersonalChats(prev => ({
          ...prev,
          [selectedUser.id]: [...(prev[selectedUser.id] || []), message]
        }));
      }

      setMessageInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getActiveMessages = () => {
    if (activeTab === 'team') return teamMessages;
    if (selectedUser) return personalChats[selectedUser.id] || [];
    return [];
  };

  const getUnreadCount = (userId: string) => {
    const messages = personalChats[userId] || [];
    return messages.filter(m => 
      m.sender_id === userId && 
      !m.read
    ).length;
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '400px',
      height: '600px',
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: 0, fontSize: '18px' }}>
          {activeTab === 'team' ? '💬 Team Chat' : `💬 ${selectedUser?.name || 'Personal Chat'}`}
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer',
            padding: '0',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ×
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e0e0e0',
        background: '#f5f5f5'
      }}>
        <button
          onClick={() => {
            setActiveTab('team');
            setSelectedUser(null);
          }}
          style={{
            flex: 1,
            padding: '12px',
            border: 'none',
            background: activeTab === 'team' ? 'white' : 'transparent',
            borderBottom: activeTab === 'team' ? '2px solid #667eea' : 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'team' ? '600' : '400',
            color: activeTab === 'team' ? '#667eea' : '#666'
          }}
        >
          Team
        </button>
        <button
          onClick={() => setActiveTab('personal')}
          style={{
            flex: 1,
            padding: '12px',
            border: 'none',
            background: activeTab === 'personal' ? 'white' : 'transparent',
            borderBottom: activeTab === 'personal' ? '2px solid #667eea' : 'none',
            cursor: 'pointer',
            fontWeight: activeTab === 'personal' ? '600' : '400',
            color: activeTab === 'personal' ? '#667eea' : '#666'
          }}
        >
          Direct Messages
        </button>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* User List (for personal chat) */}
        {activeTab === 'personal' && (
          <div style={{
            width: '140px',
            borderRight: '1px solid #e0e0e0',
            overflowY: 'auto',
            background: '#fafafa'
          }}>
            {users
              .filter(u => u.id !== currentUser.id)
              .map(user => (
                <div
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  style={{
                    padding: '12px',
                    cursor: 'pointer',
                    background: selectedUser?.id === user.id ? '#e8eaf6' : 'transparent',
                    borderBottom: '1px solid #e0e0e0',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #667eea, #764ba2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '600',
                      position: 'relative'
                    }}>
                      {user.avatar}
                      {user.is_online && (
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: '#4ade80',
                          border: '2px solid white'
                        }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#1f2937',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {user.name}
                      </div>
                      {getUnreadCount(user.id) > 0 && (
                        <div style={{
                          fontSize: '10px',
                          background: '#ef4444',
                          color: 'white',
                          borderRadius: '10px',
                          padding: '2px 6px',
                          display: 'inline-block',
                          marginTop: '2px'
                        }}>
                          {getUnreadCount(user.id)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Messages Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'personal' && !selectedUser ? (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#999',
              fontSize: '14px'
            }}>
              Select a user to start chatting
            </div>
          ) : (
            <>
              {/* Messages */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {getActiveMessages().map(message => {
                  const isOwn = message.sender_id === currentUser.id;
                  return (
                    <div
                      key={message.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isOwn ? 'flex-end' : 'flex-start'
                      }}
                    >
                      {!isOwn && (
                        <div style={{
                          fontSize: '11px',
                          color: '#666',
                          marginBottom: '4px',
                          marginLeft: '8px'
                        }}>
                          {message.sender_name}
                        </div>
                      )}
                      <div style={{
                        maxWidth: '70%',
                        padding: '10px 14px',
                        borderRadius: '16px',
                        background: isOwn 
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : '#f0f0f0',
                        color: isOwn ? 'white' : '#1f2937',
                        wordWrap: 'break-word'
                      }}>
                        {message.content}
                      </div>
                      <div style={{
                        fontSize: '10px',
                        color: '#999',
                        marginTop: '4px',
                        marginLeft: isOwn ? '0' : '8px',
                        marginRight: isOwn ? '8px' : '0'
                      }}>
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div style={{
                padding: '16px',
                borderTop: '1px solid #e0e0e0',
                background: 'white'
              }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '20px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!messageInput.trim()}
                    style={{
                      background: messageInput.trim() 
                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        : '#ccc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      cursor: messageInput.trim() ? 'pointer' : 'not-allowed',
                      fontSize: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ➤
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Floating Chat Button Component
export const FloatingChatButton: React.FC<{
  onClick: () => void;
  unreadCount?: number;
}> = ({ onClick, unreadCount = 0 }) => {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        border: 'none',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '28px',
        color: 'white',
        transition: 'transform 0.2s',
        zIndex: 999
      }}
      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      💬
      {unreadCount > 0 && (
        <div style={{
          position: 'absolute',
          top: '0',
          right: '0',
          background: '#ef4444',
          color: 'white',
          borderRadius: '50%',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: '700',
          border: '2px solid white'
        }}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </div>
      )}
    </button>
  );
};

export default EnhancedChat;