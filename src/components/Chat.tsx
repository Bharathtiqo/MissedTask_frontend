import React, { useState, useEffect, useRef, useCallback } from 'react';
import Icons from './icons';

// Type definitions for Chat
interface Message {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string;
  sender_profile_picture?: string;
  conversation_id: string;
  created_at: string;
  message_type: 'text' | 'system' | 'file';
  edited?: boolean;
  reply_to?: string;
}

interface Conversation {
  id: string;
  name: string;
  type: 'direct' | 'group' | 'general';
  participants: User[];
  last_message?: Message;
  last_activity: string;
  unread_count: number;
  is_active: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  is_online?: boolean;
  organization_id: string;
}

interface ChatProps {
  visible: boolean;
  onClose: () => void;
  apiCall: (endpoint: string, options?: RequestInit) => Promise<any>;
  wsRef: React.MutableRefObject<WebSocket | null>;
  currentUser?: {
    id: string;
    name: string;
    avatar: string;
    email: string;
    organization_id: string;
  } | null;
  showToast?: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

const Chat: React.FC<ChatProps> = ({ visible, onClose, apiCall, wsRef, currentUser, showToast }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [view, setView] = useState<'conversations' | 'chat' | 'users' | 'participants'>('conversations');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load chat data
  const loadChatData = useCallback(async () => {
    if (!currentUser) {
      console.log('Chat: No currentUser, skipping loadChatData');
      return;
    }

    try {
      setIsLoading(true);
      console.log('Chat: Loading data for user:', currentUser.name);

      // Load conversations
      const conversationsData = await apiCall('/api/chat/conversations');
      console.log('Chat: Loaded conversations:', conversationsData);
      const conversationsArray = Array.isArray(conversationsData) ? conversationsData : (conversationsData?.conversations || []);
      setConversations(conversationsArray);

      // Load users for creating conversations
      const usersData = await apiCall('/api/users');
      console.log('Chat: Loaded users from API:', usersData);
      const usersArray = Array.isArray(usersData) ? usersData : (usersData?.users || []);
      console.log('Chat: Users array:', usersArray);
      const filteredUsers = usersArray.filter((u: User) => u.id !== currentUser.id);
      console.log('Chat: Filtered users (excluding current user):', filteredUsers);
      setUsers(filteredUsers);

      // Set default general conversation if exists
      const generalConv = conversationsArray.find((c: Conversation) => c.type === 'general');
      if (generalConv && !activeConversation) {
        setActiveConversation(generalConv);
        setView('chat');
      }

    } catch (error) {
      console.error('Failed to load chat data:', error);
      setError('Failed to load chat data: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, currentUser, activeConversation]);

  // Load messages for active conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const messagesData = await apiCall(`/api/chat/conversations/${conversationId}/messages`);
      console.log('Chat: Loaded messages data:', messagesData);
      // Ensure we always set an array
      const messagesArray = Array.isArray(messagesData) ? messagesData : (messagesData?.messages || []);
      console.log('Chat: Messages array:', messagesArray);
      setMessages(messagesArray);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setError('Failed to load messages: ' + (error instanceof Error ? error.message : String(error)));
      setMessages([]); // Set empty array on error
    }
  }, [apiCall]);

  // WebSocket connection setup
  const connectSocket = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      setConnectionStatus('connected');
      
      // Listen for chat messages
      const originalOnMessage = wsRef.current.onmessage;
      wsRef.current.onmessage = (event) => {
        // Call original handler first
        if (originalOnMessage) originalOnMessage.call(wsRef.current, event);

        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'chat_message':
              // Prevent duplicate messages
              setMessages(prev => {
                if (prev.some(m => m.id === data.message.id)) {
                  console.log('Chat: Duplicate message received, ignoring:', data.message.id);
                  return prev;
                }
                return [...prev, data.message];
              });
              // Update conversation last message
              setConversations(prev => prev.map(conv =>
                conv.id === data.message.conversation_id
                  ? { ...conv, last_message: data.message, last_activity: data.message.created_at }
                  : conv
              ));

              // Show notification popup if message is from another user
              if (data.message.sender_id !== currentUser?.id && showToast) {
                const senderName = data.message.sender_name || 'Someone';
                showToast(
                  'info',
                  `New Message from ${senderName}`,
                  data.message.content.length > 50
                    ? data.message.content.substring(0, 50) + '...'
                    : data.message.content
                );
              }
              break;
              
            case 'user_typing':
              if (data.user_id !== currentUser?.id) {
                setTypingUsers(prev => [...prev.filter(id => id !== data.user_id), data.user_id]);
                setTimeout(() => {
                  setTypingUsers(prev => prev.filter(id => id !== data.user_id));
                }, 3000);
              }
              break;
              
            case 'user_online':
              setUsers(prev => prev.map(u => 
                u.id === data.user_id ? { ...u, is_online: true } : u
              ));
              break;
              
            case 'user_offline':
              setUsers(prev => prev.map(u =>
                u.id === data.user_id ? { ...u, is_online: false } : u
              ));
              break;

            case 'message_deleted':
              // Remove deleted message from state
              setMessages(prev => prev.filter(m => m.id !== data.message_id));
              console.log('Chat: Message deleted:', data.message_id);
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    }
  }, [wsRef, currentUser?.id]);

  // Initialize chat when visible
  useEffect(() => {
    if (visible && currentUser) {
      loadChatData();
      connectSocket();
    }
  }, [visible, currentUser, loadChatData, connectSocket]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation.id);
    }
  }, [activeConversation, loadMessages]);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!isTyping && activeConversation && wsRef.current) {
      setIsTyping(true);
      wsRef.current.send(JSON.stringify({
        type: 'user_typing',
        conversation_id: activeConversation.id,
        user_id: currentUser?.id
      }));
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  }, [isTyping, activeConversation, wsRef, currentUser?.id]);

  // Send message
  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !activeConversation || !currentUser) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setIsTyping(false);

    try {
      const message = await apiCall('/api/chat/messages', {
        method: 'POST',
        body: JSON.stringify({
          content: messageContent,
          conversation_id: activeConversation.id
        })
      });

      // Add message optimistically (will be filtered if duplicate comes via WebSocket)
      setMessages(prev => {
        // Check if message already exists
        if (prev.some(m => m.id === message.id)) {
          console.log('Chat: Message already exists, not adding:', message.id);
          return prev;
        }
        console.log('Chat: Adding sent message to list:', message.id);
        return [...prev, message];
      });

      // Broadcast via WebSocket so other users see it
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'chat_message',
          message
        }));
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message');
      setNewMessage(messageContent);
    }
  }, [newMessage, activeConversation, currentUser, apiCall, wsRef]);

  // Delete message
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!currentUser) return;

    try {
      await apiCall(`/api/chat/messages/${messageId}`, {
        method: 'DELETE'
      });

      // Optimistically remove from UI
      setMessages(prev => prev.filter(m => m.id !== messageId));
      console.log('Chat: Message deleted successfully:', messageId);

    } catch (error) {
      console.error('Failed to delete message:', error);
      setError('Failed to delete message');
    }
  }, [currentUser, apiCall]);

  // Create new conversation

  const createConversation = useCallback(async (participantIds: string[], name?: string) => {

    if (!currentUser) return;



    const participants = Array.from(new Set([...participantIds, currentUser.id]));



    try {

      const conversation = await apiCall('/api/chat/conversations', {

        method: 'POST',

        body: JSON.stringify({

          participants,

          name,

          type: participants.length > 2 ? 'group' : (participants.length === 2 ? 'direct' : 'team')

        })

      });



      setConversations(prev => [conversation, ...prev]);

      setActiveConversation(conversation);

      setView('chat');

    } catch (error) {

      console.error('Failed to create conversation:', error);

      setError('Failed to create conversation');

    }

  }, [apiCall, currentUser]);

  // Format timestamp
  const formatTime = useCallback((timestamp: string) => {
    if (!timestamp) return '';

    try {
      const date = new Date(timestamp);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid timestamp:', timestamp);
        return 'Invalid date';
      }

      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInHours = diffInMs / (1000 * 60 * 60);
      const diffInMinutes = diffInMs / (1000 * 60);

      // Just now (less than 1 minute)
      if (diffInMinutes < 1) {
        return 'Just now';
      }

      // Minutes ago (less than 1 hour)
      if (diffInHours < 1) {
        return `${Math.floor(diffInMinutes)} min ago`;
      }

      // Today (less than 24 hours)
      if (diffInHours < 24) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }

      // Yesterday
      if (diffInHours < 48) {
        return 'Yesterday ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }

      // Older
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error('Error formatting timestamp:', error, timestamp);
      return timestamp;
    }
  }, []);

  // Render user list for creating conversations
  const renderUserList = () => (
    <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, color: '#172b4d' }}>Start a Conversation</h3>
        <button
          onClick={() => setView('conversations')}
          style={{
            background: 'none',
            border: 'none',
            color: '#6b778c',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {Icons.arrowLeft(14)}
            <span style={{ color: '#6b778c' }}>Back</span>
          </span>
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {users.length === 0 ? (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: '#6b778c',
            fontSize: '14px'
          }}>
            No other users in your organization yet
          </div>
        ) : (
          users.map(user => (
            <div
              key={user.id}
              onClick={() => createConversation([user.id])}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background 0.2s',
                background: 'transparent'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                position: 'relative',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6554c0, #9575cd)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '600'
              }}>
                {user.avatar}
                {user.is_online && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: '12px',
                    height: '12px',
                    background: '#36b37e',
                    borderRadius: '50%',
                    border: '2px solid white'
                  }} />
                )}
              </div>
              <div>
                <div style={{ fontWeight: '600', color: '#172b4d' }}>{user.name}</div>
                <div style={{ fontSize: '12px', color: '#6b778c' }}>
                  {user.is_online ? 'Online' : 'Offline'}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Render participants list
  const renderParticipantsList = () => (
    <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, color: '#172b4d' }}>Participants</h3>
        <button
          onClick={() => setView('chat')}
          style={{
            background: 'none',
            border: 'none',
            color: '#6b778c',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {Icons.arrowLeft(14)}
            <span style={{ color: '#6b778c' }}>Back</span>
          </span>
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {activeConversation?.participants.map(participant => (
          <div
            key={participant.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              borderRadius: '8px',
              background: 'transparent'
            }}
          >
            <div style={{
              position: 'relative',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6554c0, #9575cd)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '600'
            }}>
              {participant.avatar}
              {participant.is_online && (
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: '12px',
                  height: '12px',
                  background: '#36b37e',
                  borderRadius: '50%',
                  border: '2px solid white'
                }} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', color: '#172b4d' }}>
                {participant.name}
                {participant.id === currentUser?.id && (
                  <span style={{ fontSize: '12px', color: '#6b778c', marginLeft: '6px' }}>(You)</span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: '#6b778c' }}>
                {participant.email}
              </div>
            </div>
            <div style={{ fontSize: '11px', color: participant.is_online ? '#36b37e' : '#6b778c' }}>
              {participant.is_online ? 'Online' : 'Offline'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Render conversation list
  const renderConversationList = () => (
    <div style={{ padding: '20px', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, color: '#172b4d' }}>Conversations</h3>
        <button
          onClick={() => setView('users')}
          style={{
            background: '#0052cc',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          + New Chat
        </button>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {Array.isArray(conversations) && conversations.map(conv => (
          <div
            key={conv.id}
            onClick={() => {
              setActiveConversation(conv);
              setView('chat');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              borderRadius: '8px',
              cursor: 'pointer',
              background: activeConversation?.id === conv.id ? '#e3f2fd' : 'transparent',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => {
              if (activeConversation?.id !== conv.id) {
                e.currentTarget.style.background = '#f8f9fa';
              }
            }}
            onMouseLeave={(e) => {
              if (activeConversation?.id !== conv.id) {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: conv.type === 'general' ? '#36b37e' : 'linear-gradient(135deg, #6554c0, #9575cd)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '600',
              fontSize: '14px'
            }}>
              {conv.type === 'general' ? '#' : conv.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                fontWeight: '600', 
                color: '#172b4d',
                fontSize: '14px',
                marginBottom: '2px'
              }}>
                {conv.name}
              </div>
              {conv.last_message && (
                <div style={{ 
                  fontSize: '12px', 
                  color: '#6b778c',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {conv.last_message.content}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
              <div style={{ fontSize: '11px', color: '#6b778c' }}>
                {formatTime(conv.last_activity)}
              </div>
              {conv.unread_count > 0 && (
                <div style={{
                  background: '#ff5722',
                  color: 'white',
                  borderRadius: '10px',
                  padding: '2px 6px',
                  fontSize: '10px',
                  fontWeight: '600',
                  minWidth: '16px',
                  textAlign: 'center'
                }}>
                  {conv.unread_count}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Render chat messages
  const renderChat = () => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Chat Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #e1e5e9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setView('conversations')}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b778c',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {Icons.arrowLeft(14)}
              <span style={{ color: '#6b778c' }}>Back</span>
            </span>
          </button>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: activeConversation?.type === 'general' ? '#36b37e' : 'linear-gradient(135deg, #6554c0, #9575cd)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: '600'
          }}>
            {activeConversation?.type === 'general' ? '#' : activeConversation?.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: '600', color: '#172b4d' }}>
              {activeConversation?.name}
            </div>
            <div
              style={{ fontSize: '12px', color: '#0052cc', cursor: 'pointer' }}
              onClick={() => setView('participants')}
            >
              {activeConversation?.participants.length} participants
            </div>
          </div>
          </div>
        <div style={{
          fontSize: '11px',
          color: connectionStatus === 'connected' ? '#36b37e' : '#ff5722',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: connectionStatus === 'connected' ? '#36b37e' : '#ff5722'
          }} />
          {connectionStatus}
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {Array.isArray(messages) && messages.map((message, index) => {
          const isOwn = message.sender_id === currentUser?.id;
          const showAvatar = !isOwn && (index === 0 || messages[index - 1].sender_id !== message.sender_id);

          // Debug logging
          if (index === 0) {
            console.log('Chat: Current User ID:', currentUser?.id);
            console.log('Chat: Message sender_id:', message.sender_id);
            console.log('Chat: Is own message?', isOwn);
          }

          return (
            <div
              key={message.id}
              onMouseEnter={() => setHoveredMessageId(message.id)}
              onMouseLeave={() => setHoveredMessageId(null)}
              style={{
                display: 'flex',
                flexDirection: isOwn ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
                gap: '8px',
                position: 'relative'
              }}
            >
              {!isOwn && (
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: showAvatar ? 'linear-gradient(135deg, #6554c0, #9575cd)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '12px',
                  flexShrink: 0,
                  overflow: 'hidden'
                }}>
                  {showAvatar ? (
                    message.sender_profile_picture ? (
                      <img
                        src={message.sender_profile_picture}
                        alt={message.sender_name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      message.sender_avatar
                    )
                  ) : ''}
                </div>
              )}
              
              <div style={{
                maxWidth: '70%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: isOwn ? 'flex-end' : 'flex-start'
              }}>
                {showAvatar && !isOwn && (
                  <div style={{
                    fontSize: '12px',
                    color: '#6b778c',
                    marginBottom: '4px',
                    fontWeight: '600'
                  }}>
                    {message.sender_name}
                  </div>
                )}
                
                <div style={{
                  background: isOwn ? '#0052cc' : '#f8f9fa',
                  color: isOwn ? 'white' : '#172b4d',
                  padding: '12px 16px',
                  borderRadius: '18px',
                  borderTopLeftRadius: !isOwn && showAvatar ? '6px' : '18px',
                  borderTopRightRadius: isOwn && showAvatar ? '6px' : '18px',
                  fontSize: '14px',
                  lineHeight: '1.4'
                }}>
                  {message.content}
                </div>
                
                <div style={{
                  fontSize: '11px',
                  color: '#6b778c',
                  marginTop: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {formatTime(message.created_at)}
                  {isOwn && hoveredMessageId === message.id && (
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this message?')) {
                          deleteMessage(message.id);
                        }
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ff5722',
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 87, 34, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      title="Delete message"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Typing indicators */}
        {typingUsers.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: '#6b778c',
            fontStyle: 'italic'
          }}>
            <div style={{
              display: 'flex',
              gap: '2px'
            }}>
              <div style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background: '#6b778c',
                animation: 'typing 1.4s infinite ease-in-out'
              }} />
              <div style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background: '#6b778c',
                animation: 'typing 1.4s infinite ease-in-out 0.2s'
              }} />
              <div style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background: '#6b778c',
                animation: 'typing 1.4s infinite ease-in-out 0.4s'
              }} />
            </div>
            {typingUsers.length === 1 ? 'Someone is' : 'Multiple people are'} typing...
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid #e1e5e9',
        background: '#f8f9fa'
      }}>
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-end'
        }}>
          <textarea
            ref={messageInputRef}
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Type your message..."
            rows={1}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: '1px solid #dfe1e6',
              borderRadius: '20px',
              fontSize: '14px',
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              maxHeight: '100px'
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            style={{
              background: newMessage.trim() ? '#0052cc' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
              fontSize: '16px'
            }}
          >
            ?
          </button>
        </div>
      </div>
    </div>
  );

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      right: '24px',
      bottom: '100px',
      width: '360px',
      maxWidth: 'calc(100vw - 48px)',
      height: '520px',
      maxHeight: 'calc(100vh - 150px)',
      background: 'white',
      borderRadius: '18px 18px 12px 12px',
      boxShadow: '0 18px 45px rgba(0,0,0,0.2)',
      border: '1px solid rgba(0,0,0,0.08)',
      zIndex: 1090,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(7,23,57,0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #0A1F4F 0%, #153E75 100%)',
        color: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {Icons.chatBubble(16)}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', color: 'white' }}>Team Chat</h3>
            <span style={{ fontSize: '12px', opacity: 0.75 }}>
              {connectionStatus === 'connected' ? 'Online' : connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {Icons.close(16)}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          padding: '12px 20px',
          background: '#ffebee',
          color: '#c62828',
          borderBottom: '1px solid #e1e5e9',
          fontSize: '14px'
        }}>
          {error}
          <button
            onClick={() => setError(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#c62828',
              cursor: 'pointer',
              marginLeft: '8px'
            }}
          >
            �
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: '#6b778c'
        }}>
          Loading chat...
        </div>
      )}

      {/* Content */}
      {!isLoading && (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {view === 'conversations' && renderConversationList()}
          {view === 'users' && renderUserList()}
          {view === 'participants' && renderParticipantsList()}
          {view === 'chat' && activeConversation && renderChat()}
        </div>
      )}
    </div>
  );
};

export default Chat;















