import React, { useState, useEffect, useRef } from 'react';
import Icons from './components/icons';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import AdminPanel from './components/AdminPanel.tsx';

// Type definitions
interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  profile_picture?: string;
  role: 'super_admin' | 'admin' | 'project_manager' | 'developer' | 'tester'| 'employees';
  organization_id: string;
  is_active: boolean;
  created_at: string;
  last_seen?: string;
  is_online?: boolean;
}

interface Organization {
  id: string;
  name: string;
  domain: string;
  plan: 'free' | 'pro' | 'enterprise';
  user_count: number;
  max_users: number;
  created_at: string;
}

interface Issue {
  id: string;
  key: string;
  title: string;
  description: string;
  issue_type: 'STORY' | 'TASK' | 'BUG' | 'EPIC';
  priority: 'HIGHEST' | 'HIGH' | 'MEDIUM' | 'LOW' | 'LOWEST';
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  assignee_id: string | null;
  reporter_id: string;
  story_points: number | null;
  created_at: string;
  updated_at: string;
  labels: string[];
  organization_id: string;
  deadline?: string | null;
  comments?: Comment[];
}

interface Comment {
  id: string;
  content: string;
  author_id: string;
  issue_id: string;
  created_at: string;
  updated_at: string;
}

interface Notification {
  id: string;
  type: 'issue_created' | 'issue_updated' | 'issue_assigned' | 'comment_added' | 'status_changed' | 'user_joined' | 'new_message';
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  data?: any;
}

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

// API Base URL - fallback to localhost for development
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://missedtask-backend-2.onrender.com';
const WS_BASE_URL = process.env.REACT_APP_WS_BASE_URL;

// Toast notification component
const Toast: React.FC<{ toast: ToastMessage; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, toast.duration || 5000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const getToastColor = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success': return '#36b37e';
      case 'error': return '#ff5722';
      case 'warning': return '#ffa500';
      case 'info': return '#0052cc';
    }
  };

  const getToastIcon = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
    }
  };

  return (
    <div style={{
      background: 'white',
      border: `1px solid ${getToastColor(toast.type)}`,
      borderLeft: `4px solid ${getToastColor(toast.type)}`,
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      animation: 'slideIn 0.3s ease-out'
    }}>
      <span style={{ fontSize: '18px' }}>{getToastIcon(toast.type)}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '600', color: '#172b4d', marginBottom: '4px' }}>
          {toast.title}
        </div>
        <div style={{ color: '#6b778c', fontSize: '14px' }}>
          {toast.message}
        </div>
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        style={{
          background: 'none',
          border: 'none',
          color: '#6b778c',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        ×
      </button>
    </div>
  );
};

// Toast container
const ToastContainer: React.FC<{ toasts: ToastMessage[]; onRemove: (id: string) => void }> = ({ toasts, onRemove }) => (
  <div style={{
    position: 'fixed',
    top: '80px',
    right: '20px',
    zIndex: 2000,
    maxWidth: '400px'
  }}>
    {toasts.map(toast => (
      <Toast key={toast.id} toast={toast} onRemove={onRemove} />
    ))}
  </div>
);

// Notification panel component
const NotificationPanel: React.FC<{
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}> = ({ notifications, onMarkAsRead, onMarkAllAsRead }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        style={{
          position: 'relative',
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          borderRadius: '6px',
          color: 'white',
          padding: '8px 12px',
          fontSize: '14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        ?? Notifications
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            background: '#ff5722',
            color: 'white',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: '600'
          }}>
            {unreadCount}
          </span>
        )}
      </button>
      
      {showNotifications && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          background: 'white',
          border: '1px solid #e1e5e9',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          padding: '12px',
          width: '320px',
          maxHeight: '400px',
          overflowY: 'auto',
          zIndex: 1000,
          marginTop: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '14px', color: '#172b4d' }}>
              Recent Activity
            </h4>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0052cc',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Mark all as read
              </button>
            )}
          </div>
          {notifications.length > 0 ? (
            notifications.slice().reverse().map(notification => (
              <div
                key={notification.id}
                style={{
                  padding: '8px',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  background: notification.read ? 'transparent' : '#f0f8ff',
                  border: notification.read ? '1px solid #f0f0f0' : '1px solid #e3f2fd',
                  cursor: 'pointer'
                }}
                onClick={() => onMarkAsRead(notification.id)}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: notification.read ? 'normal' : 'bold', marginBottom: '4px' }}>
                      {notification.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b778c' }}>
                      {notification.message}
                    </div>
                    <div style={{ fontSize: '11px', color: '#97a0af', marginTop: '4px' }}>
                      {new Date(notification.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ color: '#6b778c', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
              No recent activity
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Online Users Indicator Component
const OnlineUsersIndicator: React.FC<{ users: User[] }> = ({ users }) => {
  const onlineUsers = users.filter(u => u.is_online);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      background: 'rgba(255,255,255,0.1)',
      padding: '8px 12px',
      borderRadius: '20px'
    }}>
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: '#36b37e'
      }} />
      <span style={{ fontSize: '12px', color: 'white' }}>
        {onlineUsers.length} online
      </span>
    </div>
  );
};

// Comment Section Component
const CommentSection: React.FC<{
  comments: Comment[];
  users: User[];
  onAddComment: (content: string) => Promise<void>;
  currentUserId: string;
}> = ({ comments, users, onAddComment, currentUserId }) => {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getUserById = (userId: string) => {
    return users.find(u => u.id === userId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAddComment(newComment.trim());
      setNewComment('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      background: 'white',
      border: '1px solid #e1e5e9',
      borderRadius: '8px',
      padding: '16px',
      marginTop: '16px'
    }}>
      <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#172b4d' }}>
        Comments ({comments.length})
      </h4>

      <div style={{
        maxHeight: '300px',
        overflowY: 'auto',
        marginBottom: '16px'
      }}>
        {comments.map(comment => {
          const author = getUserById(comment.author_id);
          return (
            <div key={comment.id} style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '16px',
              padding: '12px',
              background: '#f8f9fa',
              borderRadius: '8px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6554c0, #9575cd)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '600',
                color: 'white',
                flexShrink: 0
              }}>
                {author?.avatar || 'U'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '4px'
                }}>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#172b4d'
                  }}>
                    {author?.name || 'Unknown User'}
                  </span>
                  <span style={{
                    fontSize: '11px',
                    color: '#6b778c'
                  }}>
                    {new Date(comment.created_at).toLocaleString()}
                  </span>
                </div>
                <div style={{
                  fontSize: '13px',
                  color: '#172b4d',
                  lineHeight: '1.4'
                }}>
                  {comment.content}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-end'
        }}>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={3}
            style={{
              flex: 1,
              padding: '12px',
              border: '1px solid #dfe1e6',
              borderRadius: '6px',
              fontSize: '14px',
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit'
            }}
          />
          <button
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            style={{
              background: newComment.trim() && !isSubmitting ? '#0052cc' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: newComment.trim() && !isSubmitting ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap'
            }}
          >
            {isSubmitting ? 'Posting...' : 'Comment'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Main App Component
const App: React.FC = () => {
  // Global dark theme styles
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      * {
        box-sizing: border-box;
      }

      body {
        background: #0d1b2a;
        color: #e0e7ff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        margin: 0;
        padding: 0;
      }

      input, textarea, select {
        background: #1b2838 !important;
        border: 1px solid #2d3e50 !important;
        color: #e0e7ff !important;
        border-radius: 8px !important;
        padding: 12px 16px !important;
        font-size: 14px !important;
        outline: none !important;
        transition: all 0.2s ease;
      }

      input:focus, textarea:focus, select:focus {
        border-color: #3b82f6 !important;
        background: #1e2f42 !important;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
      }

      input::placeholder, textarea::placeholder {
        color: #64748b !important;
        opacity: 0.8;
      }

      button {
        cursor: pointer;
        transition: all 0.2s ease;
        font-weight: 600;
        border-radius: 8px;
      }

      button:hover:not(:disabled) {
        transform: translateY(-1px);
        filter: brightness(1.1);
      }

      button:active:not(:disabled) {
        transform: translateY(0);
      }

      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }

      ::-webkit-scrollbar-track {
        background: #1b2838;
      }

      ::-webkit-scrollbar-thumb {
        background: #3b82f6;
        border-radius: 4px;
      }

      ::-webkit-scrollbar-thumb:hover {
        background: #60a5fa;
      }

      label {
        color: #94a3b8 !important;
        font-weight: 500;
        font-size: 14px;
      }

      h1, h2, h3, h4, h5, h6 {
        color: #e0e7ff;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // State
  const [showSplashScreen, setShowSplashScreen] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentView, setCurrentView] = useState<'auth' | 'dashboard' | 'board' | 'admin' | 'profile' | 'settings'>('auth');
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'verify-otp'>('login');
  const [signupMode, setSignupMode] = useState<'create_org' | 'join_org'>('create_org');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showChatPopup, setShowChatPopup] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('developer');
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    organization_name: ''
  });
  const [otpForm, setOtpForm] = useState({ otp: '', email: '' });
  const [newIssue, setNewIssue] = useState({
    title: '',
    description: '',
    issue_type: 'STORY' as Issue['issue_type'],
    priority: 'MEDIUM' as Issue['priority'],
    assignee_id: '',
    story_points: 1,
    labels: [] as string[],
    deadline: ''
  });
  const [chatMessage, setChatMessage] = useState('');
  const [selectedChatUser, setSelectedChatUser] = useState<string | null>(null); // null = team chat, user_id = direct message
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Record<string, any>>({});
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    user: string;
    userId: string;
    message: string;
    timestamp: string;
    avatar?: string;
    recipientId?: string; // For direct messages
  }>>([]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  // Profile and Settings states
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    avatar: ''
  });
  const [settingsForm, setSettingsForm] = useState({
    emailNotifications: true,
    pushNotifications: true,
    weeklyDigest: false,
    theme: 'dark',
    language: 'en',
    timezone: 'UTC'
  });
  const [showImportExportModal, setShowImportExportModal] = useState(false);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userRef = useRef<User | null>(null);
  const usersRef = useRef<User[]>([]);

  // Helper functions
  const showToast = (type: ToastMessage['type'], title: string, message: string) => {
    const toast: ToastMessage = {
      id: Date.now().toString(),
      type,
      title,
      message
    };
    setToasts(prev => [...prev, toast]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const markNotificationAsRead = (id: string) => {
    const notification = notifications.find(n => n.id === id);

    // If it's a message notification, open the chat
    if (notification?.type === 'new_message' && notification.data?.conversationId) {
      setShowChatPopup(true);
      setSelectedConversationId(notification.data.conversationId);
    }

    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Show splash screen on initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplashScreen(false);
    }, 2500); // Hide after 2.5 seconds

    return () => clearTimeout(timer);
  }, []);

  // Load saved session on app start
  useEffect(() => {
    const validateAndRestoreSession = async () => {
      console.log('🚀 App starting up...');
      console.log('📡 API Base URL:', API_BASE_URL);

      const savedToken = localStorage.getItem('accessToken');
      const savedUser = localStorage.getItem('user');
      const savedOrg = localStorage.getItem('organization');

      console.log('💾 Checking saved session...');
      console.log('Token exists:', !!savedToken);
      console.log('User exists:', !!savedUser);
      console.log('Org exists:', !!savedOrg);

      if (savedToken && savedUser && savedOrg) {
        try {
          const parsedUser = JSON.parse(savedUser);
          const parsedOrg = JSON.parse(savedOrg);

          console.log('✅ Restoring session for user:', parsedUser.email);

          // Validate token by making a test API call
          console.log('🔍 Validating token...');
          const response = await fetch(`${API_BASE_URL}/api/users`, {
            headers: { 'Authorization': `Bearer ${savedToken}` }
          });

          if (response.status === 401) {
            console.warn('❌ Token validation failed - clearing session');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');
            localStorage.removeItem('organization');
            setCurrentView('auth');
            return;
          }

          if (!response.ok) {
            throw new Error('Token validation failed');
          }

          console.log('✅ Token validated successfully');

          setAccessToken(savedToken);
          setUser(parsedUser);
          setOrganization(parsedOrg);
          setIsAuthenticated(true);
          setCurrentView('dashboard');

          // Load data
          loadIssues(savedToken);
          loadUsers(savedToken);
          connectWebSocket();
        } catch (error) {
          console.error('❌ Error validating saved session:', error);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          localStorage.removeItem('organization');
          setCurrentView('auth');
        }
      } else {
        console.log('📝 No saved session found, showing auth screen');
      }
    };

    validateAndRestoreSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize profile form when viewing profile
  useEffect(() => {
    if (user && currentView === 'profile') {
      setProfileForm({
        name: user.name,
        email: user.email,
        avatar: user.avatar
      });
    }
  }, [user, currentView]);

  // Load settings from localStorage when viewing settings
  useEffect(() => {
    if (currentView === 'settings') {
      const savedSettings = localStorage.getItem('appSettings');
      if (savedSettings) {
        setSettingsForm(JSON.parse(savedSettings));
      }
    }
  }, [currentView]);

  // API call helper
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

    try {
      const response = await fetch(url, { ...options, headers });
      const contentType = response.headers.get('content-type') || '';
      const isJsonResponse = contentType.includes('application/json');
      const statusHasBody = ![204, 205].includes(response.status);
      const responseBodyText = statusHasBody ? await response.text() : '';
      let parsedBody: any = null;

      if (responseBodyText && isJsonResponse) {
        try {
          parsedBody = JSON.parse(responseBodyText);
        } catch (parseError) {
          console.error('Received malformed JSON from API:', parseError);
          console.debug('Malformed payload preview:', responseBodyText.slice(0, 200));
          throw new Error('Received malformed JSON response from server.');
        }
      } else if (responseBodyText) {
        parsedBody = responseBodyText;
      }
      if (!response.ok) {
        // Handle 401 Unauthorized - clear session and redirect to login
        if (response.status === 401) {
          console.warn('⚠️ 401 Unauthorized - Token expired or invalid');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          localStorage.removeItem('organization');
          setAccessToken('');
          setUser(null);
          setOrganization(null);
          setIsAuthenticated(false);
          setCurrentView('auth');
          showToast('warning', 'Session Expired', 'Please login again');
          throw new Error('Session expired. Please login again.');
        }

        console.error('API Error Response:', parsedBody ?? responseBodyText);

        // Handle different error formats
        let errorMessage = `HTTP ${response.status}`;
        if (parsedBody && typeof parsedBody === 'object') {
          if (typeof parsedBody.detail === 'string') {
            errorMessage = parsedBody.detail;
          } else if (typeof parsedBody.detail === 'object') {
            // FastAPI validation errors
            errorMessage = JSON.stringify(parsedBody.detail);
          } else if (parsedBody.message) {
            errorMessage = parsedBody.message;
          }
        } else if (responseBodyText.trim()) {
          const trimmed = responseBodyText.trim();
          errorMessage = trimmed.length > 200 ? `${trimmed.slice(0, 200)}...` : trimmed;
        }

        throw new Error(errorMessage);
      }
      if (!responseBodyText) {
        return null;
      }
      return isJsonResponse ? parsedBody : responseBodyText;
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  };

  // Load issues
  const loadIssues = async (token: string) => {
    try {
      console.log('📋 Loading issues...');
      const issuesData = await apiCall('/api/issues', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Issues loaded:', issuesData.length);
      setIssues(issuesData);
    } catch (error) {
      console.error('❌ Failed to load issues:', error);
      showToast('error', 'Loading Failed', 'Could not load issues');
    }
  };

  // Load users
  const loadUsers = async (token: string) => {
    try {
      console.log('👥 Loading users...');
      const usersData = await apiCall('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Users loaded:', usersData.length);

      // Preserve online status from backend when available and default to offline otherwise
      const usersWithStatus = usersData.map((u: any) => {
        const derivedOnline =
          typeof u.is_online === 'boolean'
            ? u.is_online
            : typeof u.online === 'boolean'
              ? u.online
              : typeof u.status?.is_online === 'boolean'
                ? u.status.is_online
                : undefined;

        return {
          ...u,
          is_online: derivedOnline ?? false
        };
      });

      console.log('✅ Users with online status:', usersWithStatus);
      setUsers(usersWithStatus);
    } catch (error) {
      console.error('❌ Failed to load users:', error);
      showToast('error', 'Loading Failed', 'Could not load users');
    }
  };

  // WebSocket connection
  const connectWebSocket = () => {
    if (!accessToken) return;

    let wsUrl: string | null = null;

    if (WS_BASE_URL) {
      wsUrl = `${WS_BASE_URL.replace(/\/$/, '')}/ws/${accessToken}`;
    } else {
      try {
        const apiUrl = new URL(API_BASE_URL);
        const wsProtocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
        const sanitizedPath = apiUrl.pathname.replace(/\/+$/, '');
        const pathPrefix = sanitizedPath && sanitizedPath !== '/' ? sanitizedPath : '';
        wsUrl = `${wsProtocol}//${apiUrl.host}${pathPrefix}/ws/${accessToken}`;
      } catch (error) {
        console.warn('⚠️ Failed to derive WebSocket URL from API_BASE_URL, falling back to localhost.', error);
        wsUrl = `ws://localhost:4000/ws/${accessToken}`;
      }
    }

    if (!wsUrl) {
      console.error('❌ Unable to determine WebSocket URL.');
      return;
    }

    console.log('🔌 Connecting to WebSocket:', wsUrl);
    if (wsRef.current) {
      wsRef.current.close();
    }

    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log('✅ WebSocket connected');
    };

    wsRef.current.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };

    wsRef.current.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      setTimeout(() => {
        if (accessToken) {
          connectWebSocket();
        }
      }, 5000);
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 WebSocket message:', data);

        // Handle incoming chat messages
        if (data.type === 'chat_message' && data.message) {
          const message = data.message;

          // Only show notification if the message is not from the current user
          if (message.sender_id !== user?.id) {
            // Find sender name
            const sender = users.find(u => u.id === message.sender_id);
            const senderName = sender?.name || message.sender_name || 'Someone';

            // Show popup toast
            showToast(
              'info',
              `New Message from ${senderName}`,
              message.content.length > 50
                ? message.content.substring(0, 50) + '...'
                : message.content
            );

            // Add to notification panel
            addNotification({
              type: 'comment_added',
              title: `New Message from ${senderName}`,
              message: message.content.length > 100
                ? message.content.substring(0, 100) + '...'
                : message.content,
              read: false,
              data: {
                message_id: message.id,
                sender_id: message.sender_id,
                conversation_id: message.conversation_id
              }
            });
          }
        }
      } catch (error) {
        console.error('❌ WebSocket message parse error:', error);
      }
    };
  };

  // Enhanced auth functions with logging
  const login = async (email: string, password: string): Promise<boolean> => {
    console.log('\n🔐 === LOGIN ATTEMPT ===');
    console.log('📧 Email:', email);
    console.log('🔒 Password length:', password.length);
    
    setIsLoading(true);
    setAuthError('');

    try {
      const data = await apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      console.log('✅ Login successful!');
      console.log('👤 User data:', data.user);
      console.log('🏢 Organization:', data.organization);
      console.log('🔑 Access token received:', data.access_token.substring(0, 10) + '...');

      setUser(data.user);
      setOrganization(data.organization);
      setAccessToken(data.access_token);
      setIsAuthenticated(true);
      
      // Store session
      localStorage.setItem('accessToken', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('organization', JSON.stringify(data.organization));
      
      console.log('💾 Session saved to localStorage');
      
      setCurrentView('dashboard');
      
      // Load data
      await loadIssues(data.access_token);
      await loadUsers(data.access_token);
      
      // Connect WebSocket
      connectWebSocket();
      
      showToast('success', 'Welcome Back!', `Logged in as ${data.user.name}`);
      
      setIsLoading(false);
      console.log('🔐 === LOGIN COMPLETE ===\n');
      return true;
    } catch (error: any) {
      console.error('❌ Login failed:', error.message);
      setAuthError(error.message || 'Login failed');
      showToast('error', 'Login Failed', error.message || 'Invalid credentials');
      setIsLoading(false);
      return false;
    }
  };

    const signup = async () => {
    setIsLoading(true);
    setAuthError('');

    if (signupMode === 'create_org') {
      if (signupForm.password !== signupForm.confirmPassword) {
        setAuthError('Passwords do not match');
        showToast('error', 'Signup Failed', 'Passwords do not match');
        setIsLoading(false);
        return;
      }
      try {
        const requestBody = {
          email: signupForm.email,
          password: signupForm.password,
          name: signupForm.name,
          organization_name: signupForm.organization_name
        };
        await apiCall('/api/auth/signup', { method: 'POST', body: JSON.stringify(requestBody) });
        setOtpForm({ ...otpForm, email: signupForm.email });
        setAuthMode('verify-otp');
        showToast('info', 'Verification Required', 'Check backend console for the OTP code');
      } catch (error: any) {
        setAuthError(error.message || 'Signup failed');
        showToast('error', 'Signup Failed', error.message || 'Account creation failed');
      } finally {
        setIsLoading(false);
      }
    } else {
      try {
        const requestBody = {
          email: signupForm.email,
          password: signupForm.password,
          name: signupForm.name
        };
        await apiCall('/api/auth/signup-member', { method: 'POST', body: JSON.stringify(requestBody) });
        setOtpForm({ ...otpForm, email: signupForm.email });
        setAuthMode('verify-otp');
        showToast('info', 'Verification Required', 'Check backend console for the OTP code');
      } catch (error: any) {
        setAuthError(error.message || 'Signup failed');
        showToast('error', 'Signup Failed', error.message || 'Signup to existing org failed');
      } finally {
        setIsLoading(false);
      }
    }
  };
      
    const verifyOTP = async () => {
    setIsLoading(true);
    setAuthError('');
    try {
      const body = { email: otpForm.email, otp: otpForm.otp };
      const endpoint = signupMode === 'create_org' ? '/api/auth/verify-otp' : '/api/auth/verify-otp-member';
      const data = await apiCall(endpoint, { method: 'POST', body: JSON.stringify(body) });

      setAccessToken(data.access_token);
      setUser(data.user);
      setOrganization(data.organization);
      setIsAuthenticated(true);
      setCurrentView('dashboard');
      loadUsers(data.access_token);
      loadIssues(data.access_token);
      connectWebSocket();
    } catch (error: any) {
      setAuthError(error.message || 'Verification failed');
      showToast('error', 'Verification Failed', error.message || 'Invalid or expired code');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    console.log('👋 Logging out...');
    
    // Close WebSocket connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    try {
      await apiCall('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      console.log('✅ Logout API call successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }

    // Clear local state
    setUser(null);
    setOrganization(null);
    setAccessToken('');
    setIsAuthenticated(false);
    setCurrentView('auth');
    setAuthMode('login');
    setIssues([]);
    setUsers([]);
    setNotifications([]);
    setToasts([]);
    
    // Clear storage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    localStorage.removeItem('organization');
    
    showToast('info', 'Logged Out', 'See you next time!');
    console.log('✅ Logout complete - all data cleared');
  };

  const createIssue = async () => {
    if (!newIssue.title.trim()) {
      console.error('❌ Cannot create issue: Title is empty');
      showToast('error', 'Validation Error', 'Issue title is required');
      return;
    }

    console.log('📝 Creating new issue:', newIssue.title);

    try {
      // Convert deadline to ISO format if provided
      let deadlineISO = null;
      if (newIssue.deadline) {
        try {
          // Convert "dd-mm-yyyy" to ISO datetime
          const dateObj = new Date(newIssue.deadline);
          if (!isNaN(dateObj.getTime())) {
            deadlineISO = dateObj.toISOString();
          }
        } catch (e) {
          console.warn('Invalid deadline format:', newIssue.deadline);
        }
      }

      const payload = {
        title: newIssue.title,
        description: newIssue.description,
        issue_type: newIssue.issue_type,
        priority: newIssue.priority,
        assignee_id: newIssue.assignee_id || null,
        story_points: newIssue.story_points,
        labels: newIssue.labels,
        deadline: deadlineISO
      };

      console.log('📤 Sending issue payload:', payload);

      const issueData = await apiCall('/api/issues', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      console.log('✅ Issue created successfully:', issueData.key);
      setIssues([...issues, issueData]);
      setNewIssue({
        title: '',
        description: '',
        issue_type: 'STORY',
        priority: 'MEDIUM',
        assignee_id: '',
        story_points: 1,
        labels: [],
        deadline: ''
      });
      setShowCreateModal(false);
      
      showToast('success', 'Issue Created', `${issueData.key}: ${issueData.title}`);
      
      addNotification({
        type: 'issue_created',
        title: 'Issue Created',
        message: `You created ${issueData.key}: ${issueData.title}`,
        read: false,
        data: issueData
      });
    } catch (error: any) {
      console.error('❌ Failed to create issue:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Full error:', JSON.stringify(error));

      const errorMessage = error.message || error.toString() || 'Failed to create issue';
      setAuthError(errorMessage);
      showToast('error', 'Creation Failed', errorMessage);
    }
  };

  const updateIssue = async (issueId: string, updates: Partial<Issue>) => {
    console.log('📝 Updating issue:', issueId, updates);
    try {
      const updatedIssue = await apiCall(`/api/issues/${issueId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      console.log('✅ Issue updated successfully');
      setIssues(prev => prev.map(issue => 
        issue.id === issueId ? updatedIssue : issue
      ));
      
      showToast('success', 'Issue Updated', `${updatedIssue.key} has been updated`);
      
      addNotification({
        type: 'issue_updated',
        title: 'Issue Updated',
        message: `You updated ${updatedIssue.key}`,
        read: false,
        data: updatedIssue
      });
    } catch (error: any) {
      console.error('❌ Failed to update issue:', error.message);
      setAuthError(error.message || 'Failed to update issue');
      showToast('error', 'Update Failed', error.message || 'Could not update issue');
    }
  };

  const addComment = async (issueId: string, content: string) => {
    try {
      const comment = await apiCall(`/api/issues/${issueId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content }),
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      setIssues(prev => prev.map(issue => 
        issue.id === issueId 
          ? { ...issue, comments: [...(issue.comments || []), comment] }
          : issue
      ));
      
      showToast('success', 'Comment Added', 'Your comment has been posted');
    } catch (error: any) {
      console.error('❌ Failed to add comment:', error.message);
      showToast('error', 'Comment Failed', error.message || 'Could not add comment');
    }
  };

  // Import/Export Functions
  const exportToCSV = () => {
    try {
      const csvData = issues.map(issue => ({
        Key: issue.key,
        Title: issue.title,
        Type: issue.issue_type,
        Status: issue.status,
        Priority: issue.priority,
        Assignee: users.find(u => u.id === issue.assignee_id)?.name || 'Unassigned',
        'Story Points': issue.story_points || 0,
        Created: new Date(issue.created_at).toLocaleDateString(),
        Deadline: issue.deadline ? new Date(issue.deadline).toLocaleDateString() : '',
        Description: issue.description || ''
      }));

      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `issues_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('success', 'Export Successful', 'Issues exported to CSV');
    } catch (error: any) {
      console.error('❌ Failed to export CSV:', error);
      showToast('error', 'Export Failed', 'Could not export to CSV');
    }
  };

  const exportToExcel = () => {
    try {
      const excelData = issues.map(issue => ({
        Key: issue.key,
        Title: issue.title,
        Type: issue.issue_type,
        Status: issue.status,
        Priority: issue.priority,
        Assignee: users.find(u => u.id === issue.assignee_id)?.name || 'Unassigned',
        'Story Points': issue.story_points || 0,
        Created: new Date(issue.created_at).toLocaleDateString(),
        Deadline: issue.deadline ? new Date(issue.deadline).toLocaleDateString() : '',
        Description: issue.description || ''
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Issues');
      XLSX.writeFile(wb, `issues_${new Date().toISOString().split('T')[0]}.xlsx`);

      showToast('success', 'Export Successful', 'Issues exported to Excel');
    } catch (error: any) {
      console.error('❌ Failed to export Excel:', error);
      showToast('error', 'Export Failed', 'Could not export to Excel');
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          importIssuesFromData(results.data);
        },
        error: (error) => {
          console.error('❌ CSV parsing error:', error);
          showToast('error', 'Import Failed', 'Could not parse CSV file');
        }
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          importIssuesFromData(jsonData);
        } catch (error) {
          console.error('❌ Excel parsing error:', error);
          showToast('error', 'Import Failed', 'Could not parse Excel file');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      showToast('error', 'Invalid File', 'Please select a CSV or Excel file');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const importIssuesFromData = async (data: any[]) => {
    try {
      let successCount = 0;
      let failCount = 0;

      for (const row of data) {
        if (!row.Title || row.Title.toString().trim() === '') continue;

        try {
          const assignee = users.find(u =>
            u.name.toLowerCase() === (row.Assignee || '').toString().toLowerCase()
          );

          const issuePayload = {
            title: row.Title?.toString() || '',
            description: row.Description?.toString() || '',
            issue_type: ['STORY', 'TASK', 'BUG', 'EPIC'].includes(row.Type?.toString().toUpperCase())
              ? row.Type.toString().toUpperCase()
              : 'TASK',
            priority: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(row.Priority?.toString().toUpperCase())
              ? row.Priority.toString().toUpperCase()
              : 'MEDIUM',
            assignee_id: assignee?.id || null,
            story_points: parseInt(row['Story Points']?.toString() || '1') || 1,
            labels: [],
            deadline: row.Deadline ? new Date(row.Deadline).toISOString() : null
          };

          const issueData = await apiCall('/api/issues', {
            method: 'POST',
            body: JSON.stringify(issuePayload),
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });

          setIssues(prev => [...prev, issueData]);
          successCount++;
        } catch (error) {
          console.error('❌ Failed to import issue:', row.Title, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        showToast('success', 'Import Successful', `${successCount} issue(s) imported successfully`);
        loadIssues(accessToken); // Reload all issues to ensure consistency
      }
      if (failCount > 0) {
        showToast('warning', 'Partial Import', `${failCount} issue(s) failed to import`);
      }

      setShowImportExportModal(false);
    } catch (error: any) {
      console.error('❌ Import error:', error);
      showToast('error', 'Import Failed', 'Could not import issues');
    }
  };

  // Utility functions
  const getTypeIcon = (type: Issue['issue_type']) => {
    switch (type) {
      case 'STORY': return '📖';
      case 'TASK': return '✅';
      case 'BUG': return '🐛';
      case 'EPIC': return '⚡';
    }
  };

  const getPriorityColor = (priority: Issue['priority']) => {
    switch (priority) {
      case 'HIGHEST': return '#cd1316';
      case 'HIGH': return '#ea2f00';
      case 'MEDIUM': return '#ffa500';
      case 'LOW': return '#2d8738';
      case 'LOWEST': return '#57a55a';
    }
  };

  const getStatusColor = (status: Issue['status']) => {
    switch (status) {
      case 'DONE': return '#36b37e';
      case 'IN_PROGRESS': return '#0052cc';
      case 'REVIEW': return '#ffa500';
      default: return '#42526e';
    }
  };

  const getUserById = (userId: string | null) => {
    if (!userId) return null;
    return users.find(u => u.id === userId);
  };

  const getIssuesByStatus = (status: Issue['status']) => {
    return issues.filter(issue => issue.status === status);
  };

  // Drag and Drop
  const handleDragStart = (e: React.DragEvent, issue: Issue) => {
    e.dataTransfer.setData('issueId', issue.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, newStatus: Issue['status']) => {
    e.preventDefault();
    const issueId = e.dataTransfer.getData('issueId');
    if (issueId) {
      updateIssue(issueId, { status: newStatus });
    }
  };

  // Calculate metrics
  const metrics = {
    totalIssues: issues.length,
    completedIssues: issues.filter(i => i.status === 'DONE').length,
    inProgressIssues: issues.filter(i => i.status === 'IN_PROGRESS').length,
    totalPoints: issues.reduce((sum, i) => sum + (i.story_points || 0), 0),
    completedPoints: issues.filter(i => i.status === 'DONE').reduce((sum, i) => sum + (i.story_points || 0), 0),
  };

  // Render functions
  const renderAuth = () => (
    <div style={{
      minHeight: '100vh',
      background: '#0d1b2a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: '#1b2838',
        border: '1px solid #2d3e50',
        borderRadius: '12px',
        padding: '48px',
        width: '100%',
        maxWidth: '480px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '100px',
            height: '100px',
            margin: '0 auto 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img
              src="/logo.png"
              alt="MissedTask Logo"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
             }}
           />
          </div>
          <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#e0e7ff' }}>
            MissedTask
          </h1>
        </div>

        {authMode === 'login' && (
          <div>
            <h2 style={{ margin: '0 0 32px 0', fontSize: '26px', fontWeight: '700', color: '#e0e7ff' }}>
              Welcome Back
            </h2>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#94a3b8', fontSize: '14px' }}>
                Email
              </label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => {
                  console.log('Email input changed:', e.target.value);
                  setLoginForm({...loginForm, email: e.target.value});
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #2d3e50',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  background: '#1b2838',
                  color: '#e0e7ff'
                }}
                placeholder="Enter your email"
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#94a3b8', fontSize: '14px' }}>
                Password
              </label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => {
                  console.log('Password input changed, length:', e.target.value.length);
                  setLoginForm({...loginForm, password: e.target.value});
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #2d3e50',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  background: '#1b2838',
                  color: '#e0e7ff'
                }}
                placeholder="Enter your password"
              />
            </div>

            {authError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px',
                color: '#fca5a5',
                fontSize: '14px'
              }}>
                {authError}
              </div>
            )}

            <button
              onClick={() => {
                console.log('Login button clicked');
                login(loginForm.email, loginForm.password);
              }}
              disabled={isLoading || !loginForm.email || !loginForm.password}
              style={{
                width: '100%',
                padding: '14px',
                background: isLoading ? '#334155' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                marginBottom: '20px'
              }}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>

            <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
              Don't have an account?{' '}
              <button
                onClick={() => {
                  console.log('Switching to signup mode');
                  setAuthMode('signup');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Sign Up
              </button>
            </p>
          </div>
        )}

        {authMode === 'signup' && (
          <div>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '26px', fontWeight: '700', color: '#e0e7ff' }}>
              Create Account
            </h2>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
              <button onClick={() => setSignupMode('create_org')}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: signupMode==='create_org' ? '2px solid #3b82f6' : '1px solid #2d3e50',
                  background: signupMode==='create_org' ? 'rgba(59, 130, 246, 0.2)' : '#1b2838',
                  color: signupMode==='create_org' ? '#60a5fa' : '#94a3b8',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px'
                }}>
                Create Organization
              </button>
              <button onClick={() => setSignupMode('join_org')}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: signupMode==='join_org' ? '2px solid #3b82f6' : '1px solid #2d3e50',
                  background: signupMode==='join_org' ? 'rgba(59, 130, 246, 0.2)' : '#1b2838',
                  color: signupMode==='join_org' ? '#60a5fa' : '#94a3b8',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px'
                }}>
                Join Organization
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#94a3b8', fontSize: '14px' }}>
                Full Name
              </label>
              <input
                type="text"
                value={signupForm.name}
                onChange={(e) => setSignupForm({...signupForm, name: e.target.value})}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #2d3e50',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  background: '#1b2838',
                  color: '#e0e7ff'
                }}
                placeholder="John Doe"
              />
            </div>

            {signupMode === 'create_org' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#94a3b8', fontSize: '14px' }}>
                  Organization Name
                </label>
                <input
                  type="text"
                  value={signupForm.organization_name}
                  onChange={(e) => setSignupForm({...signupForm, organization_name: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #2d3e50',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    background: '#1b2838',
                    color: '#e0e7ff'
                  }}
                  placeholder="Your Company Name"
                />
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#94a3b8', fontSize: '14px' }}>
                Email
              </label>
              <input
                type="email"
                value={signupForm.email}
                onChange={(e) => setSignupForm({...signupForm, email: e.target.value})}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #2d3e50',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  background: '#1b2838',
                  color: '#e0e7ff'
                }}
                placeholder="john@company.com"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#94a3b8', fontSize: '14px' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={signupForm.password}
                  onChange={(e) => setSignupForm({...signupForm, password: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #2d3e50',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    background: '#1b2838',
                    color: '#e0e7ff'
                  }}
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#94a3b8', fontSize: '14px' }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={signupForm.confirmPassword}
                  onChange={(e) => setSignupForm({...signupForm, confirmPassword: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #2d3e50',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    background: '#1b2838',
                    color: '#e0e7ff'
                  }}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {authError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px',
                color: '#fca5a5',
                fontSize: '14px'
              }}>
                {authError}
              </div>
            )}

            <button
              onClick={() => {
                console.log('Signup button clicked');
                signup();
              }}
              disabled={isLoading || !signupForm.name || !signupForm.email || !signupForm.password || (signupMode==='create_org' && !signupForm.organization_name)}
              style={{
                width: '100%',
                padding: '14px',
                background: isLoading ? '#334155' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                marginBottom: '16px'
              }}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>

            <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
              Already have an account?{' '}
              <button
                onClick={() => setAuthMode('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Sign In
              </button>
            </p>
          </div>
        )}

        {authMode === 'verify-otp' && (
          <div>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '26px', fontWeight: '700', color: '#e0e7ff' }}>
              Verify Your Email
            </h2>
            <p style={{ margin: '0 0 28px 0', color: '#94a3b8', fontSize: '14px', lineHeight: '1.6' }}>
              We've sent a verification code to <span style={{ color: '#60a5fa', fontWeight: '600' }}>{otpForm.email}</span>. Check your backend console for the OTP.
            </p>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: '500', color: '#94a3b8', fontSize: '14px' }}>
                Verification Code
              </label>
              <input
                type="text"
                value={otpForm.otp}
                onChange={(e) => {
                  console.log('OTP input changed:', e.target.value);
                  setOtpForm({...otpForm, otp: e.target.value});
                }}
                style={{
                  width: '100%',
                  padding: '16px',
                  border: '1px solid #2d3e50',
                  borderRadius: '8px',
                  fontSize: '24px',
                  textAlign: 'center',
                  letterSpacing: '6px',
                  outline: 'none',
                  background: '#1b2838',
                  color: '#e0e7ff',
                  fontWeight: '700'
                }}
                placeholder="000000"
                maxLength={6}
              />
              <p style={{ margin: '10px 0 0 0', color: '#64748b', fontSize: '12px', textAlign: 'center' }}>
                Check your backend console for the 6-digit OTP
              </p>
            </div>

            {authError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px',
                color: '#fca5a5',
                fontSize: '14px'
              }}>
                {authError}
              </div>
            )}

            <button
              onClick={() => {
                console.log('Verify OTP button clicked');
                verifyOTP();
              }}
              disabled={isLoading || !otpForm.otp}
              style={{
                width: '100%',
                padding: '14px',
                background: isLoading ? '#334155' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                marginBottom: '16px'
              }}
            >
              {isLoading ? 'Verifying...' : 'Verify & Continue'}
            </button>

            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => setAuthMode('signup')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                Back to Sign Up
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderHeader = () => (
    <header style={{
      height: '60px',
      background: '#1e3a8a',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      justifyContent: 'space-between',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '20px',
            flexDirection: 'column',
            gap: '4px',
            padding: '8px'
          }}
        >
          <div style={{ width: '18px', height: '2px', background: 'white', borderRadius: '2px' }}></div>
          <div style={{ width: '18px', height: '2px', background: 'white', borderRadius: '2px' }}></div>
          <div style={{ width: '18px', height: '2px', background: 'white', borderRadius: '2px' }}></div>
        </button>

        {/* Logo Icon */}
        <div style={{
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <img
            src="/logo.png"
            alt="MissedTask Logo"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          />
        </div>

        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', lineHeight: 1 }}>MissedTask</h1>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotificationsPanel(!showNotificationsPanel)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              padding: '8px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {Icons.bell(22)}
            {notifications.filter(n => !n.read).length > 0 && (
              <div style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                minWidth: '20px',
                height: '20px',
                borderRadius: '10px',
                background: '#ef4444',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: '700',
                border: '2px solid #1e3a8a',
                padding: '0 4px'
              }}>
                {notifications.filter(n => !n.read).length > 99 ? '99+' : notifications.filter(n => !n.read).length}
              </div>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotificationsPanel && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: '0',
              marginTop: '8px',
              width: '380px',
              maxHeight: '500px',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.1)',
              overflow: 'hidden',
              zIndex: 1000
            }}>
              <div style={{
                padding: '16px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'white' }}>
                  Notifications
                </h3>
                {notifications.filter(n => !n.read).length > 0 && (
                  <button
                    onClick={markAllNotificationsAsRead}
                    style={{
                      padding: '4px 12px',
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '6px',
                      color: '#60a5fa',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              <div style={{
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                {notifications.length === 0 ? (
                  <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: '#64748b'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔔</div>
                    <p style={{ margin: 0, fontSize: '14px' }}>No notifications yet</p>
                  </div>
                ) : (
                  notifications.map(notification => (
                    <div
                      key={notification.id}
                      onClick={() => markNotificationAsRead(notification.id)}
                      style={{
                        padding: '16px',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        cursor: 'pointer',
                        background: notification.read ? 'transparent' : 'rgba(59, 130, 246, 0.05)',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = notification.read ? 'transparent' : 'rgba(59, 130, 246, 0.05)'}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px'
                      }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: notification.read ? 'transparent' : '#3b82f6',
                          marginTop: '6px',
                          flexShrink: 0
                        }} />
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: 'white',
                            marginBottom: '4px'
                          }}>
                            {notification.title}
                          </div>
                          <div style={{
                            fontSize: '13px',
                            color: '#94a3b8',
                            marginBottom: '4px'
                          }}>
                            {notification.message}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            color: '#64748b'
                          }}>
                            {new Date(notification.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }} data-profile-menu>
          <div
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: user?.profile_picture ? 'transparent' : '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '15px',
              fontWeight: '700',
              color: 'white',
              cursor: 'pointer',
              overflow: 'hidden'
            }}
          >
            {user?.profile_picture ? (
              <img
                src={user.profile_picture}
                alt={user.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            ) : (
              user?.name?.substring(0, 2).toUpperCase() || 'BH'
            )}
          </div>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div style={{
              position: 'absolute',
              top: '50px',
              right: '0',
              width: '220px',
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              zIndex: 1000,
              overflow: 'hidden'
            }}>
              {/* User Info Header */}
              <div style={{
                padding: '16px',
                borderBottom: '1px solid #e5e7eb',
                background: '#f9fafb'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '8px',
                    background: user?.profile_picture ? 'transparent' : '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: '700',
                    color: 'white',
                    overflow: 'hidden'
                  }}>
                    {user?.profile_picture ? (
                      <img
                        src={user.profile_picture}
                        alt={user.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      user?.name?.substring(0, 2).toUpperCase() || 'BH'
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>
                      {user?.name || 'User'}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                      {user?.email || 'user@example.com'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div style={{ padding: '8px 0' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowProfileMenu(false);
                    setCurrentView('profile');
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  <span style={{ fontWeight: '500' }}>Profile</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowProfileMenu(false);
                    setCurrentView('settings');
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 1v6m0 6v6m8.66-14.66l-4.24 4.24m-4.84 4.84l-4.24 4.24M23 12h-6m-6 0H1m17.66 8.66l-4.24-4.24m-4.84-4.84l-4.24-4.24"/>
                  </svg>
                  <span style={{ fontWeight: '500' }}>Settings</span>
                </button>

                <div style={{
                  height: '1px',
                  background: '#e5e7eb',
                  margin: '8px 0'
                }}></div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowProfileMenu(false);
                    logout();
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontSize: '18px' }}>🚪</span>
                  <span style={{ fontWeight: '500' }}>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );

  const renderSidebar = () => (
    <aside style={{
      width: '240px',
      background: '#0c1e3d',
      color: 'white',
      position: 'fixed',
      left: sidebarOpen ? '0' : '-240px',
      top: '60px',
      bottom: 0,
      padding: '20px 0',
      boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
      zIndex: 50,
      transition: 'left 0.3s ease-in-out'
    }}>
      <nav>
        <button
          onClick={() => setCurrentView('dashboard')}
          style={{
            width: '100%',
            background: currentView === 'dashboard' ? '#1e40af' : 'transparent',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            padding: '12px 20px',
            fontSize: '15px',
            fontWeight: '500',
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '4px 12px'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          Dashboard
        </button>

        <button
          onClick={() => setCurrentView('board')}
          style={{
            width: '100%',
            background: currentView === 'board' ? '#1e40af' : 'transparent',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            padding: '12px 20px',
            fontSize: '15px',
            fontWeight: '500',
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '4px 12px'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Board
        </button>

        {/* Create Issue - Only for admin, super_admin, and project_manager */}
        {user && ['super_admin', 'admin', 'project_manager'].includes(user.role) && (
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              padding: '12px 20px',
              fontSize: '15px',
              fontWeight: '500',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              margin: '4px 12px'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create Issue
          </button>
        )}

        {/* Admin Panel - Only for Super Admin */}
        {user?.role === 'super_admin' && (
          <button
            onClick={() => setCurrentView('admin')}
            style={{
              width: '100%',
              background: currentView === 'admin' ? '#1e40af' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              padding: '12px 20px',
              fontSize: '15px',
              fontWeight: '500',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              margin: '4px 12px',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              marginTop: '8px',
              paddingTop: '20px'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
            Admin Panel
          </button>
        )}
      </nav>

      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '12px',
        right: '12px'
      }}>
        <OnlineUsersIndicator users={users} />

        <button
          onClick={logout}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            padding: '10px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            marginTop: '12px'
          }}
        >
          Logout
        </button>
      </div>
    </aside>
  );

  const renderDashboard = () => {
    // Filter issues based on user role
    const filteredIssues = user && ['super_admin', 'admin', 'project_manager'].includes(user.role)
      ? issues // Admins see all issues
      : issues.filter(issue => issue.assignee_id === user?.id); // Employees only see their assigned tasks

    return (
    <div style={{ padding: '40px' }}>
      <div style={{ marginBottom: '36px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px', color: 'white' }}>
          Project Dashboard
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '15px', margin: 0 }}>
          Welcome back! Here's your project overview.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {[
          {
            label: 'Total Issues',
            value: metrics.totalIssues,
            color: '#3b82f6',
            bgColor: '#dbeafe',
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          },
          {
            label: 'Completed',
            value: metrics.completedIssues,
            color: '#10b981',
            bgColor: '#d1fae5',
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
          },
          {
            label: 'In Progress',
            value: metrics.inProgressIssues,
            color: '#f59e0b',
            bgColor: '#fef3c7',
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          },
          {
            label: 'Story Points',
            value: `${metrics.completedPoints}/${metrics.totalPoints}`,
            color: '#8b5cf6',
            bgColor: '#ede9fe',
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          }
        ].map((metric, index) => (
          <div key={index} style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: metric.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: metric.color,
                fontSize: '20px',
                fontWeight: '700',
                marginRight: '12px'
              }}>
                {metric.icon}
              </div>
              <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{metric.label}</span>
            </div>
            <div style={{ fontSize: '40px', fontWeight: '700', color: metric.color, lineHeight: 1 }}>{metric.value}</div>
          </div>
        ))}
      </div>

      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '28px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px', color: '#111827' }}>
          Recent Issues
        </h3>
        {filteredIssues.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredIssues.slice(0, 5).map((issue) => (
              <div 
                key={issue.id} 
                onClick={() => {
                  setSelectedIssue(issue);
                  setShowIssueModal(true);
                }}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '12px',
                  border: '1px solid #f0f0f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <span style={{ marginRight: '12px', fontSize: '16px' }}>{getTypeIcon(issue.issue_type)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#172b4d' }}>
                    {issue.key}: {issue.title}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b778c' }}>
                    Updated {new Date(issue.updated_at).toLocaleDateString()}
                  </div>
                </div>
                <div style={{
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '600',
                  background: issue.status === 'DONE' ? '#e3fcef' : issue.status === 'IN_PROGRESS' ? '#deebff' : '#f4f5f7',
                  color: getStatusColor(issue.status)
                }}>
                  {issue.status.replace('_', ' ')}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: '#6b778c', padding: '40px' }}>
            <div style={{ marginBottom: '16px', opacity: 0.5 }}>
              {Icons.clipboard(48)}
            </div>
            <h4 style={{ margin: '0 0 8px 0' }}>No issues yet</h4>
            <p style={{ margin: 0, fontSize: '14px' }}>
              {user && ['super_admin', 'admin', 'project_manager'].includes(user.role)
                ? 'Create your first issue to get started'
                : 'No tasks assigned to you yet'}
            </p>
            {user && ['super_admin', 'admin', 'project_manager'].includes(user.role) && (
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  marginTop: '16px',
                  background: '#0052cc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Create Issue
              </button>
            )}
          </div>
        )}
      </div>
    </div>
    );
  };

  const renderBoard = () => {
    // Filter issues based on user role
    const filteredIssues = user && ['super_admin', 'admin', 'project_manager'].includes(user.role)
      ? issues // Admins see all issues
      : issues.filter(issue => issue.assignee_id === user?.id); // Employees only see their assigned tasks

    // Local function to get filtered issues by status
    const getFilteredIssuesByStatus = (status: Issue['status']) => {
      return filteredIssues.filter(issue => issue.status === status);
    };

    return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '700', margin: 0, color: 'white' }}>Sprint Board</h1>
          <p style={{ color: '#94a3b8', margin: '4px 0 0 0', fontSize: '15px' }}>
            Drag and drop issues to update their status
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowImportExportModal(true)}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            {Icons.upload(16)}
            Import/Export
          </button>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px',
        height: 'calc(100vh - 250px)',
        minHeight: '600px'
      }}>
        {[
          { status: 'TODO' as const, title: 'To Do', color: '#42526e' },
          { status: 'IN_PROGRESS' as const, title: 'In Progress', color: '#0052cc' },
          { status: 'REVIEW' as const, title: 'In Review', color: '#ffa500' },
          { status: 'DONE' as const, title: 'Done', color: '#36b37e' }
        ].map((column) => (
          <div
            key={column.status}
            style={{
              background: '#f8f9fa',
              borderRadius: '12px',
              padding: '16px',
              border: '2px dashed transparent'
            }}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.status)}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: `2px solid ${column.color}`
            }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: '700',
                color: column.color,
                textTransform: 'uppercase',
                margin: 0,
                letterSpacing: '0.5px'
              }}>
                {column.title}
              </h3>
              <div style={{
                background: column.color,
                color: 'white',
                borderRadius: '12px',
                padding: '4px 8px',
                fontSize: '12px',
                fontWeight: '600',
                minWidth: '20px',
                textAlign: 'center'
              }}>
                {getFilteredIssuesByStatus(column.status).length}
              </div>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              height: 'calc(100% - 60px)',
              overflowY: 'auto'
            }}>
              {getFilteredIssuesByStatus(column.status).length > 0 ? (
                getFilteredIssuesByStatus(column.status).map((issue) => (
                  <div
                    key={issue.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, issue)}
                    onClick={() => {
                      setSelectedIssue(issue);
                      setShowIssueModal(true);
                    }}
                    style={{
                      background: 'white',
                      border: '1px solid #e1e5e9',
                      borderRadius: '8px',
                      padding: '16px',
                      cursor: 'grab',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#172b4d',
                      marginBottom: '8px',
                      lineHeight: '1.4'
                    }}>
                      {issue.title}
                    </div>

                    <div style={{
                      fontSize: '12px',
                      color: '#6b778c',
                      marginBottom: '12px',
                      lineHeight: '1.3'
                    }}>
                      {issue.description.length > 60 ? issue.description.substring(0, 60) + '...' : issue.description}
                    </div>

                    {issue.deadline && (
                      <div style={{
                        fontSize: '11px',
                        color: new Date(issue.deadline) < new Date() ? '#dc2626' : new Date(issue.deadline) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) ? '#f59e0b' : '#64748b',
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: '500'
                      }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        {new Date(issue.deadline).toLocaleDateString()}
                      </div>
                    )}

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: '#6b778c', fontWeight: '600' }}>{issue.key}</span>
                        <span style={{ fontSize: '14px' }}>{getTypeIcon(issue.issue_type)}</span>
                        <div style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: getPriorityColor(issue.priority)
                        }} />
                        <span style={{
                          fontSize: '10px',
                          background: '#f4f5f7',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: '600',
                          color: '#6b778c'
                        }}>
                          {issue.story_points}
                        </span>
                      </div>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: !issue.assignee_id ? '#ccc' : 'linear-gradient(135deg, #6554c0, #9575cd)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: 'white'
                      }}>
                        {issue.assignee_id ? getUserById(issue.assignee_id)?.avatar || 'UN' : 'UN'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '200px',
                  color: '#6b778c',
                  fontSize: '14px'
                }}>
                  <div style={{ marginBottom: '8px', opacity: 0.5 }}>
                    {Icons.list(32)}
                  </div>
                  <div>No issues in {column.title}</div>
                  {column.status === 'TODO' && (
                    <button
                      onClick={() => setShowCreateModal(true)}
                      style={{
                        marginTop: '12px',
                        background: 'transparent',
                        border: '1px dashed #dfe1e6',
                        borderRadius: '6px',
                        padding: '8px 16px',
                        fontSize: '12px',
                        color: '#6b778c',
                        cursor: 'pointer'
                      }}
                    >
                      Create issue
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
    );
  };

  const renderAdminPanel = () => {
    const handleUserUpdate = (updatedUsers: User[]) => {
      setUsers(updatedUsers);
    };

    const apiCall = async (endpoint: string, options?: RequestInit) => {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options?.headers
        }
      });

      if (!response.ok) throw new Error('API call failed');
      return await response.json();
    };

    return (
      <AdminPanel
        currentUser={user!}
        organization={organization!}
        users={users}
        issues={issues}
        apiCall={apiCall}
        onUserUpdate={handleUserUpdate}
        showToast={showToast}
      />
    );
  };

  // Profile Page
  const renderProfile = () => {
    const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        console.log('No file selected');
        return;
      }

      console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type);

      // Validate file type
      if (!file.type.startsWith('image/')) {
        console.error('Invalid file type:', file.type);
        showToast('error', 'Invalid File', 'Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        console.error('File too large:', file.size);
        showToast('error', 'File Too Large', 'Please select an image smaller than 5MB');
        return;
      }

      try {
        setIsLoading(true);
        console.log('Starting image upload...');

        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64String = reader.result as string;
          console.log('Image converted to base64, length:', base64String.length);

          try {
            const token = localStorage.getItem('accessToken');
            console.log('Uploading profile picture...');

            const response = await fetch(`${API_BASE_URL}/user/profile-picture`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                profile_picture: base64String
              })
            });

            console.log('Response status:', response.status);

            if (!response.ok) {
              const errorText = await response.text();
              console.error('Upload failed:', response.status, errorText);
              throw new Error(`Failed to upload: ${response.status}`);
            }

            const updatedUser = await response.json();
            console.log('Profile picture updated successfully');
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            showToast('success', 'Profile Picture Updated', 'Your profile picture has been updated successfully');
          } catch (error) {
            console.error('Profile picture upload error:', error);
            showToast('error', 'Upload Failed', error instanceof Error ? error.message : 'Failed to upload profile picture');
          } finally {
            setIsLoading(false);
          }
        };

        reader.readAsDataURL(file);
      } catch (error) {
        showToast('error', 'Error', 'Failed to process image');
        setIsLoading(false);
      }
    };

    const handleUpdateProfile = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('accessToken');

        const response = await fetch(`${API_BASE_URL}/api/users/${user?.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: profileForm.name,
            email: profileForm.email
          })
        });

        if (!response.ok) throw new Error('Failed to update profile');

        const updatedUser = await response.json();
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        showToast('success', 'Profile Updated', 'Your profile has been updated successfully');
      } catch (error) {
        showToast('error', 'Error', 'Failed to update profile');
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>Profile Settings</h1>
        <p style={{ color: '#64748b', marginBottom: '32px' }}>Manage your personal information and preferences</p>

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '32px' }}>
          {/* Left Column - Avatar and Quick Info */}
          <div>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid #e2e8f0',
              textAlign: 'center'
            }}>
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: '16px' }}>
                {user?.profile_picture ? (
                  <img
                    src={user.profile_picture}
                    alt="Profile"
                    style={{
                      width: '120px',
                      height: '120px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '4px solid #e2e8f0'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '48px',
                    fontWeight: '700',
                    color: 'white'
                  }}>
                    {user?.avatar || user?.name?.substring(0, 2).toUpperCase()}
                  </div>
                )}

                {/* Upload Button */}
                <label style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#1e40af',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: '3px solid white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureUpload}
                    style={{ display: 'none' }}
                    disabled={isLoading}
                  />
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </label>
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                {user?.name}
              </h3>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>{user?.email}</p>

              <div style={{
                display: 'inline-block',
                padding: '6px 12px',
                background: '#dbeafe',
                color: '#1e40af',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'capitalize',
                marginBottom: '16px'
              }}>
                {user?.role?.replace('_', ' ')}
              </div>

              <div style={{
                borderTop: '1px solid #e2e8f0',
                paddingTop: '16px',
                marginTop: '16px',
                textAlign: 'left'
              }}>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Member Since</div>
                  <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: '500' }}>
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Organization</div>
                  <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: '500' }}>
                    {organization?.name || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Profile Form */}
          <div>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '32px',
              border: '1px solid #e2e8f0'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1e293b', marginBottom: '24px' }}>
                Personal Information
              </h2>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#1e40af'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#1e40af'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Role
                </label>
                <input
                  type="text"
                  value={user?.role?.replace('_', ' ').toUpperCase()}
                  disabled
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: '#f9fafb',
                    color: '#6b7280',
                    cursor: 'not-allowed'
                  }}
                />
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  Contact your administrator to change your role
                </p>
              </div>

              <div style={{
                borderTop: '1px solid #e2e8f0',
                paddingTop: '24px',
                display: 'flex',
                gap: '12px'
              }}>
                <button
                  onClick={handleUpdateProfile}
                  disabled={isLoading}
                  style={{
                    padding: '12px 24px',
                    background: isLoading ? '#94a3b8' : '#1e40af',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: isLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setCurrentView('dashboard')}
                  style={{
                    padding: '12px 24px',
                    background: 'transparent',
                    color: '#64748b',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Activity Stats */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid #e2e8f0',
              marginTop: '24px'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1e293b', marginBottom: '24px' }}>
                Activity Statistics
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#1e40af', marginBottom: '4px' }}>
                    {issues.filter(i => i.reporter_id === user?.id).length}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Issues Created</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#059669', marginBottom: '4px' }}>
                    {issues.filter(i => i.assignee_id === user?.id && i.status === 'DONE').length}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Completed</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#f59e0b', marginBottom: '4px' }}>
                    {issues.filter(i => i.assignee_id === user?.id && i.status === 'IN_PROGRESS').length}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>In Progress</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Settings Page
  const renderSettings = () => {
    const handleSaveSettings = () => {
      localStorage.setItem('appSettings', JSON.stringify(settingsForm));
      showToast('success', 'Settings Saved', 'Your preferences have been updated');
    };

    return (
      <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', color: 'white', marginBottom: '8px' }}>Settings</h1>
        <p style={{ color: '#94a3b8', marginBottom: '32px', fontSize: '15px' }}>Manage your application preferences and notifications</p>

        {/* Notifications Settings */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '12px',
          padding: '32px',
          border: '1px solid rgba(255,255,255,0.1)',
          marginBottom: '24px',
          backdropFilter: 'blur(10px)'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#e2e8f0', marginBottom: '8px' }}>
            Notifications
          </h2>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '24px' }}>
            Choose how you want to be notified about updates
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '8px',
              cursor: 'pointer',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0', marginBottom: '4px' }}>
                  Email Notifications
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Receive email updates about issues and mentions
                </div>
              </div>
              <input
                type="checkbox"
                checked={settingsForm.emailNotifications}
                onChange={(e) => setSettingsForm({ ...settingsForm, emailNotifications: e.target.checked })}
                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#2563eb' }}
              />
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '8px',
              cursor: 'pointer',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0', marginBottom: '4px' }}>
                  Push Notifications
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Get instant browser notifications for important updates
                </div>
              </div>
              <input
                type="checkbox"
                checked={settingsForm.pushNotifications}
                onChange={(e) => setSettingsForm({ ...settingsForm, pushNotifications: e.target.checked })}
                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#2563eb' }}
              />
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '8px',
              cursor: 'pointer',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0', marginBottom: '4px' }}>
                  Weekly Digest
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Receive a weekly summary of your activity and team updates
                </div>
              </div>
              <input
                type="checkbox"
                checked={settingsForm.weeklyDigest}
                onChange={(e) => setSettingsForm({ ...settingsForm, weeklyDigest: e.target.checked })}
                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#2563eb' }}
              />
            </label>
          </div>
        </div>

        {/* Appearance Settings */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '12px',
          padding: '32px',
          border: '1px solid rgba(255,255,255,0.1)',
          marginBottom: '24px',
          backdropFilter: 'blur(10px)'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#e2e8f0', marginBottom: '8px' }}>
            Appearance
          </h2>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '24px' }}>
            Customize how the application looks
          </p>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#94a3b8',
              marginBottom: '8px'
            }}>
              Theme
            </label>
            <select
              value={settingsForm.theme}
              onChange={(e) => setSettingsForm({ ...settingsForm, theme: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                cursor: 'pointer',
                background: 'rgba(15,23,42,0.5)',
                color: '#e2e8f0'
              }}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto (System)</option>
            </select>
          </div>
        </div>

        {/* Regional Settings */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '12px',
          padding: '32px',
          border: '1px solid rgba(255,255,255,0.1)',
          marginBottom: '24px',
          backdropFilter: 'blur(10px)'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#e2e8f0', marginBottom: '8px' }}>
            Regional Settings
          </h2>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '24px' }}>
            Set your language and timezone preferences
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#94a3b8',
                marginBottom: '8px'
              }}>
                Language
              </label>
              <select
                value={settingsForm.language}
                onChange={(e) => setSettingsForm({ ...settingsForm, language: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'pointer',
                  background: 'rgba(15,23,42,0.5)',
                  color: '#e2e8f0'
                }}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="ja">Japanese</option>
              </select>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#94a3b8',
                marginBottom: '8px'
              }}>
                Timezone
              </label>
              <select
                value={settingsForm.timezone}
                onChange={(e) => setSettingsForm({ ...settingsForm, timezone: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'pointer',
                  background: 'rgba(15,23,42,0.5)',
                  color: '#e2e8f0'
                }}
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="Europe/London">London</option>
                <option value="Europe/Paris">Paris</option>
                <option value="Asia/Tokyo">Tokyo</option>
                <option value="Asia/Dubai">Dubai</option>
                <option value="Australia/Sydney">Sydney</option>
              </select>
            </div>
          </div>
        </div>

        {/* Account Security */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '12px',
          padding: '32px',
          border: '1px solid rgba(255,255,255,0.1)',
          marginBottom: '24px',
          backdropFilter: 'blur(10px)'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#e2e8f0', marginBottom: '8px' }}>
            Security
          </h2>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '24px' }}>
            Manage your account security settings
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => showToast('info', 'Coming Soon', 'Password change functionality will be available soon')}
              style={{
                padding: '12px 20px',
                background: 'rgba(255,255,255,0.05)',
                color: '#60a5fa',
                border: '1px solid rgba(96,165,250,0.3)',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s'
              }}
            >
              <span>Change Password</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>

            <button
              onClick={() => showToast('info', 'Coming Soon', 'Two-factor authentication will be available soon')}
              style={{
                padding: '12px 20px',
                background: 'rgba(255,255,255,0.05)',
                color: '#60a5fa',
                border: '1px solid rgba(96,165,250,0.3)',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s'
              }}
            >
              <span>Enable Two-Factor Authentication</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setCurrentView('dashboard')}
            style={{
              padding: '12px 24px',
              background: 'rgba(255,255,255,0.05)',
              color: '#94a3b8',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSaveSettings}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(29,78,216,0.3)',
              transition: 'all 0.2s'
            }}
          >
            Save Settings
          </button>
        </div>
      </div>
    );
  };

  // ============= CHAT FUNCTIONS =============

  // Get or create conversation
  const getOrCreateConversation = async (participantId: string | null): Promise<string | null> => {
    try {
      if (!participantId) {
        // Team chat - get or create team conversation
        console.log('Fetching conversations for team chat...');
        const response = await apiCall('/api/chat/conversations', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        console.log('Conversations response:', response);

        // Response might be an array directly or wrapped in object
        const conversations = Array.isArray(response) ? response : response.conversations || [];

        const teamConv = conversations.find((c: any) => c.type === 'team');
        if (teamConv) {
          console.log('Found existing team conversation:', teamConv.id);
          return teamConv.id;
        }

        // Create team conversation if it doesn't exist
        console.log('Creating new team conversation...');

        // Get all active users in organization for team chat
        const orgUserIds = users
          .filter(u => u.organization_id === user?.organization_id && u.is_active)
          .map(u => u.id);

        const createResponse = await apiCall('/api/chat/conversations', {
          method: 'POST',
          body: JSON.stringify({
            type: 'team',
            name: 'Team Chat',
            participants: orgUserIds
          }),
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        console.log('Created team conversation:', createResponse);
        return createResponse.id;
      } else {
        // Direct message - check if conversation exists
        console.log('Fetching conversations for direct message with user:', participantId);
        const response = await apiCall('/api/chat/conversations', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        console.log('Conversations response:', response);

        // Response might be an array directly or wrapped in object
        const conversations = Array.isArray(response) ? response : response.conversations || [];

        const existingConv = conversations.find((c: any) => {
          if (c.type !== 'direct') return false;
          const participants = c.participants || [];
          return participants.includes(participantId) && participants.includes(user?.id);
        });

        if (existingConv) {
          console.log('Found existing direct conversation:', existingConv.id);
          return existingConv.id;
        }

        // Create new direct conversation
        console.log('Creating new direct conversation...');
        const createResponse = await apiCall('/api/chat/conversations', {
          method: 'POST',
          body: JSON.stringify({
            type: 'direct',
            participants: [user?.id, participantId] // Must have exactly 2 participants
          }),
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        console.log('Created direct conversation:', createResponse);
        return createResponse.id;
      }
    } catch (error: any) {
      console.error('Error getting/creating conversation:', error);
      showToast('error', 'Error', error.message || 'Failed to load conversation');
      return null;
    }
  };

  // Load messages for conversation
  const loadConversationMessages = async (conversationId: string) => {
    try {
      console.log('Loading messages for conversation:', conversationId);
      const response = await apiCall(`/api/chat/conversations/${conversationId}/messages`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      console.log('Messages response:', response);

      // Response might be an array directly or wrapped in object
      const messages = Array.isArray(response) ? response : response.messages || [];

      // Convert API messages to local format
      const formattedMessages = messages.map((msg: any) => {
        console.log('Raw message from API:', msg);

        const formatted = {
          id: msg.id,
          user: msg.sender_name || msg.author_name || msg.author?.name || 'Unknown',
          userId: msg.sender_id || msg.author_id || msg.author?.id || '',
          message: msg.content,
          timestamp: msg.created_at,
          avatar: msg.sender_avatar || msg.author_avatar || msg.author?.avatar || 'U',
          recipientId: undefined // Backend handles this via conversation
        };

        console.log('Formatted message:', formatted);
        return formatted;
      });

      console.log('Formatted messages:', formattedMessages);

      // Get last seen message ID from localStorage
      const lastSeenKey = `lastSeenMessage_${conversationId}`;
      const lastSeenMessageId = localStorage.getItem(lastSeenKey);

      // If this is the first time loading, set the last seen to the latest message (don't show old messages as new)
      if (!lastSeenMessageId && formattedMessages.length > 0 && !showChatPopup) {
        const latestMessage = formattedMessages[formattedMessages.length - 1];
        if (latestMessage) {
          localStorage.setItem(lastSeenKey, latestMessage.id);
          console.log(`📌 First load - marking message ${latestMessage.id} as last seen`);
        }
      }

      // Check for new messages from other users (only if chat is closed AND we have a baseline)
      if (!showChatPopup && formattedMessages.length > 0 && lastSeenMessageId) {
        const newNotifications: Notification[] = [];

        formattedMessages.forEach((msg: any) => {
          const isFromOtherUser = msg.userId !== user?.id;
          // A message is new if it comes after the last seen message
          const isNewMessage = isFromOtherUser && msg.id > lastSeenMessageId;

          if (isNewMessage && isFromOtherUser) {
            console.log('🔔 New message from other user detected:', msg);

            // Add to notifications panel
            const messagePreview = msg.message.length > 40
              ? msg.message.substring(0, 40) + '...'
              : msg.message;

            const notificationId = `msg_${msg.id}`;

            // Check if notification already exists in current state
            setNotifications(prev => {
              const exists = prev.find(n => n.id === notificationId);
              if (!exists) {
                const newNotif: Notification = {
                  id: notificationId,
                  type: 'new_message',
                  title: `New message from ${msg.user}`,
                  message: messagePreview,
                  read: false,
                  timestamp: msg.timestamp || new Date().toISOString(),
                  data: { conversationId, messageId: msg.id }
                };
                newNotifications.push(newNotif);
                return [newNotif, ...prev];
              }
              return prev;
            });
          }
        });

        // Update unread count if we found new messages
        if (newNotifications.length > 0) {
          setUnreadMessagesCount(prev => prev + newNotifications.length);
          console.log(`📊 Added ${newNotifications.length} new message(s) to unread count`);
        }
      }

      // When chat is opened, mark all messages as seen
      if (showChatPopup && formattedMessages.length > 0) {
        const latestMessage = formattedMessages[formattedMessages.length - 1];
        if (latestMessage) {
          localStorage.setItem(lastSeenKey, latestMessage.id);
          // Reset unread count
          setUnreadMessagesCount(0);
          // Mark message notifications as read
          setNotifications(prev => prev.map(n =>
            n.type === 'new_message' && n.data?.conversationId === conversationId
              ? { ...n, read: true }
              : n
          ));
        }
      }

      setChatMessages(formattedMessages);
      setConversations(prev => ({ ...prev, [conversationId]: formattedMessages }));
    } catch (error: any) {
      console.error('Error loading messages:', error);
      showToast('error', 'Error', error.message || 'Failed to load messages');
    }
  };

  // Send message via API
  const sendMessageAPI = async (content: string, conversationId: string) => {
    try {
      console.log('Sending message to conversation:', conversationId);
      const response = await apiCall('/api/chat/messages', {
        method: 'POST',
        body: JSON.stringify({
          content,
          conversation_id: conversationId
        }),
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      console.log('Message sent response:', response);

      // Add message to local state
      const newMessage = {
        id: response.id,
        user: response.sender_name || response.author_name || user?.name || 'You',
        userId: response.sender_id || response.author_id || user?.id || '',
        message: response.content,
        timestamp: response.created_at,
        avatar: response.sender_avatar || response.author_avatar || user?.avatar || 'U'
      };

      setChatMessages(prev => [...prev, newMessage]);
      setConversations(prev => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), newMessage]
      }));

      return response;
    } catch (error: any) {
      console.error('Error sending message:', error);
      showToast('error', 'Error', error.message || 'Failed to send message');
      throw error;
    }
  };

  // Load team chat when popup opens
  useEffect(() => {
    if (showChatPopup && !selectedConversationId) {
      // Auto-load team chat when opening
      handleChatSelectionInit(null);
    }
  }, [showChatPopup]);

  const handleChatSelectionInit = async (userId: string | null) => {
    const conversationId = await getOrCreateConversation(userId);
    if (conversationId) {
      setSelectedConversationId(conversationId);
      setSelectedChatUser(userId);
      await loadConversationMessages(conversationId);
    }
  };

  // Poll for new messages
  useEffect(() => {
    if (!selectedConversationId || !accessToken) return;

    const pollMessages = async () => {
      await loadConversationMessages(selectedConversationId);
    };

    // Poll every 3 seconds
    const interval = setInterval(pollMessages, 3000);

    return () => clearInterval(interval);
  }, [selectedConversationId, accessToken]);

  const renderFloatingChat = () => {
    if (!showChatPopup) return null;

    const handleSendMessage = async () => {
      if (!chatMessage.trim() || !selectedConversationId) return;

      try {
        await sendMessageAPI(chatMessage, selectedConversationId);
        setChatMessage('');
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    };

    const handleChatSelection = async (userId: string | null) => {
      setSelectedChatUser(userId);

      // Get or create conversation
      const conversationId = await getOrCreateConversation(userId);
      if (conversationId) {
        setSelectedConversationId(conversationId);
        // Load messages for this conversation
        await loadConversationMessages(conversationId);
      }
    };

    const selectedUser = selectedChatUser ? users.find(u => u.id === selectedChatUser) : null;
    const orgUsers = users.filter(u => u.organization_id === user?.organization_id && u.id !== user?.id);

    return (
      <div style={{
        position: 'fixed',
        bottom: '100px',
        right: '24px',
        width: '500px',
        height: '600px',
        background: '#0f1729',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        zIndex: 1000,
        border: '1px solid #1e293b',
        animation: 'slideUp 0.3s ease-out',
        overflow: 'hidden'
      }}>
        {/* User List Sidebar */}
        <div style={{
          width: '180px',
          background: 'rgba(0,0,0,0.2)',
          borderRight: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            padding: '16px',
            borderBottom: '1px solid #1e293b'
          }}>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#94a3b8' }}>
              CONVERSATIONS
            </h4>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {/* Team Chat */}
            <button
              onClick={() => handleChatSelection(null)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: selectedChatUser === null ? 'rgba(30, 64, 175, 0.2)' : 'transparent',
                border: 'none',
                borderLeft: selectedChatUser === null ? '3px solid #1e40af' : '3px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.2s'
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#1e40af',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {Icons.chatBubble(18)}
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'white' }}>
                  Team Chat
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  {orgUsers.length} members
                </div>
              </div>
            </button>

            {/* Direct Messages */}
            <div style={{
              padding: '12px 16px 6px',
              fontSize: '11px',
              fontWeight: '600',
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Direct Messages
            </div>

            {orgUsers.map(u => (
              <button
                key={u.id}
                onClick={() => handleChatSelection(u.id)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: selectedChatUser === u.id ? 'rgba(30, 64, 175, 0.2)' : 'transparent',
                  border: 'none',
                  borderLeft: selectedChatUser === u.id ? '3px solid #1e40af' : '3px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: '600',
                  flexShrink: 0,
                  position: 'relative'
                }}>
                  {u.avatar}
                  {u.is_online && (
                    <div style={{
                      position: 'absolute',
                      bottom: '0',
                      right: '0',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#22c55e',
                      border: '2px solid #0f1729'
                    }} />
                  )}
                </div>
                <div style={{ flex: 1, textAlign: 'left', overflow: 'hidden' }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '500',
                    color: 'white',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {u.name}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>
                    {u.is_online ? 'Online' : 'Offline'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Chat Header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'white' }}>
                {selectedUser ? selectedUser.name : 'Team Chat'}
              </h3>
              <p style={{ color: '#94a3b8', margin: '2px 0 0 0', fontSize: '11px' }}>
                {selectedUser
                  ? (selectedUser.is_online ? 'Online' : 'Offline')
                  : `${orgUsers.length} team members`}
              </p>
            </div>
            <button
              onClick={() => setShowChatPopup(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '24px',
                padding: '4px',
                lineHeight: 1
              }}
            >
              ×
            </button>
          </div>

          {/* Messages Area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {chatMessages.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#64748b'
              }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '12px' }}>
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
                <p style={{ fontSize: '14px', fontWeight: '500', margin: 0 }}>No messages yet</p>
                <p style={{ fontSize: '12px', color: '#475569', margin: '4px 0 0 0' }}>
                  {selectedUser ? `Start a conversation with ${selectedUser.name}` : 'Say hi to your team!'}
                </p>
              </div>
            ) : (
              chatMessages.map((msg: any) => {
                const isOwnMessage = msg.userId === user?.id;
                return (
                  <div key={msg.id} style={{
                    display: 'flex',
                    gap: '10px',
                    flexDirection: isOwnMessage ? 'row-reverse' : 'row'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: isOwnMessage ? '#1e40af' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: '600',
                      fontSize: '12px',
                      flexShrink: 0
                    }}>
                      {msg.avatar}
                    </div>
                    <div style={{ flex: 1, maxWidth: '70%' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '6px',
                        marginBottom: '2px',
                        flexDirection: isOwnMessage ? 'row-reverse' : 'row'
                      }}>
                        <span style={{ fontWeight: '600', color: 'white', fontSize: '12px' }}>{msg.user}</span>
                        <span style={{ fontSize: '10px', color: '#64748b' }}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={{
                        background: isOwnMessage ? '#1e40af' : '#1e293b',
                        borderRadius: '12px',
                        padding: '8px 12px',
                        color: '#e2e8f0',
                        fontSize: '13px',
                        lineHeight: '1.4'
                      }}>
                        {msg.message}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Message Input */}
          <div style={{
            padding: '16px',
            borderTop: '1px solid #1e293b'
          }}>
            <div style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center'
            }}>
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={`Message ${selectedUser ? selectedUser.name : 'team'}...`}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #2d3e50',
                  background: '#1b2838',
                  color: '#e0e7ff',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!chatMessage.trim()}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: chatMessage.trim() ? '#1e40af' : '#1e293b',
                  color: 'white',
                  cursor: chatMessage.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderInviteModal = () => {
    if (!showInviteModal) return null;

    const handleInvite = async () => {
      if (!inviteEmail.trim()) {
        showToast('error', 'Error', 'Please enter an email address');
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(inviteEmail)) {
        showToast('error', 'Invalid Email', 'Please enter a valid email address');
        return;
      }

      try {
        setIsLoading(true);
        // Here you would call your invite API endpoint
        // For now, we'll just show a success message
        showToast('success', 'Invitation Sent', `Invitation email sent to ${inviteEmail}`);
        setShowInviteModal(false);
        setInviteEmail('');
        setInviteRole('developer');
      } catch (error) {
        showToast('error', 'Error', 'Failed to send invitation');
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e40af" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="8.5" cy="7" r="4"/>
                <line x1="20" y1="8" x2="20" y2="14"/>
                <line x1="23" y1="11" x2="17" y2="11"/>
              </svg>
              Invite Team Member
            </h2>
            <button
              onClick={() => {
                setShowInviteModal(false);
                setInviteEmail('');
                setInviteRole('developer');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '28px',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '0',
                lineHeight: 1
              }}
            >
              ×
            </button>
          </div>

          {/* Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '8px' }}>
                Email Address *
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#1e40af'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
              />
            </div>

            <div>
              <label style={{ fontSize: '14px', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '8px' }}>
                Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '14px',
                  outline: 'none',
                  cursor: 'pointer',
                  background: 'white'
                }}
              >
                <option value="developer">💻 Developer</option>
                <option value="tester">🧪 Tester</option>
                <option value="scrum_master">🎯 Scrum Master</option>
                <option value="project_manager">📊 Project Manager</option>
                <option value="admin">🔧 Admin</option>
              </select>
            </div>

            <div style={{
              background: '#f8fafc',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              gap: '8px',
              alignItems: 'start'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" style={{ marginTop: '2px', flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: '1.5' }}>
                An invitation email will be sent to the user with instructions to join your organization.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button
              onClick={() => {
                setShowInviteModal(false);
                setInviteEmail('');
                setInviteRole('developer');
              }}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: 'white',
                color: '#64748b',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleInvite}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                background: isLoading ? '#94a3b8' : '#1e40af',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {isLoading ? (
                'Sending...'
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                  Send Invitation
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderCreateModal = () => (
    showCreateModal && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: '12px',
          padding: '24px',
          width: '500px',
          maxHeight: '80vh',
          overflow: 'auto',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
        }}>
          <h2 style={{ marginBottom: '20px', color: '#e2e8f0', fontWeight: '600' }}>Create New Issue</h2>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#94a3b8', fontSize: '13px' }}>Title *</label>
            <input
              type="text"
              value={newIssue.title}
              onChange={(e) => setNewIssue({...newIssue, title: e.target.value})}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                background: 'rgba(15,23,42,0.5)',
                color: '#e2e8f0'
              }}
              placeholder="What needs to be done?"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#94a3b8', fontSize: '13px' }}>Description</label>
            <textarea
              value={newIssue.description}
              onChange={(e) => setNewIssue({...newIssue, description: e.target.value})}
              rows={4}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                fontSize: '14px',
                resize: 'vertical',
                outline: 'none',
                background: 'rgba(15,23,42,0.5)',
                color: '#e2e8f0',
                fontFamily: 'inherit'
              }}
              placeholder="Describe the issue in detail..."
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#94a3b8', fontSize: '13px' }}>Type</label>
              <select
                value={newIssue.issue_type}
                onChange={(e) => setNewIssue({...newIssue, issue_type: e.target.value as Issue['issue_type']})}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  background: 'rgba(15,23,42,0.5)',
                  color: '#e2e8f0',
                  cursor: 'pointer'
                }}
              >
                <option value="STORY">Story</option>
                <option value="TASK">Task</option>
                <option value="BUG">Bug</option>
                <option value="EPIC">Epic</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#94a3b8', fontSize: '13px' }}>Priority</label>
              <select
                value={newIssue.priority}
                onChange={(e) => setNewIssue({...newIssue, priority: e.target.value as Issue['priority']})}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  background: 'rgba(15,23,42,0.5)',
                  color: '#e2e8f0',
                  cursor: 'pointer'
                }}
              >
                <option value="LOWEST">Lowest</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="HIGHEST">Highest</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#94a3b8', fontSize: '13px' }}>Assignee</label>
              <select
                value={newIssue.assignee_id || ''}
                onChange={(e) => setNewIssue({...newIssue, assignee_id: e.target.value})}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  background: 'rgba(15,23,42,0.5)',
                  color: '#e2e8f0',
                  cursor: 'pointer'
                }}
              >
                <option value="">Unassigned</option>
                {users.filter(u => u.organization_id === user?.organization_id && u.is_active).map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#94a3b8', fontSize: '13px' }}>Story Points</label>
              <input
                type="number"
                min="1"
                max="21"
                value={newIssue.story_points}
                onChange={(e) => setNewIssue({...newIssue, story_points: parseInt(e.target.value) || 1})}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  background: 'rgba(15,23,42,0.5)',
                  color: '#e2e8f0'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#94a3b8', fontSize: '13px' }}>
              Deadline
            </label>
            <input
              type="date"
              value={newIssue.deadline}
              onChange={(e) => setNewIssue({...newIssue, deadline: e.target.value})}
              min={new Date().toISOString().split('T')[0]}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                cursor: 'pointer',
                background: 'rgba(15,23,42,0.5)',
                color: '#e2e8f0',
                colorScheme: 'dark'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#94a3b8', fontSize: '13px' }}>Labels</label>
            <input
              type="text"
              value={newIssue.labels.join(', ')}
              onChange={(e) => setNewIssue({...newIssue, labels: e.target.value.split(',').map(l => l.trim()).filter(l => l)})}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                background: 'rgba(15,23,42,0.5)',
                color: '#e2e8f0'
              }}
              placeholder="Comma-separated labels (e.g., frontend, api, urgent)"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              onClick={() => setShowCreateModal(false)}
              style={{
                padding: '12px 24px',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.05)',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#e2e8f0',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
            >
              Cancel
            </button>
            <button
              onClick={createIssue}
              disabled={!newIssue.title.trim()}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '6px',
                background: newIssue.title.trim() ? 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)' : 'rgba(255,255,255,0.1)',
                color: 'white',
                cursor: newIssue.title.trim() ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                fontWeight: '600',
                boxShadow: newIssue.title.trim() ? '0 4px 12px rgba(29,78,216,0.3)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              Create Issue
            </button>
          </div>
        </div>
      </div>
    )
  );

  const renderIssueModal = () => (
    showIssueModal && selectedIssue && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          width: '600px',
          maxHeight: '80vh',
          overflow: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <h2 style={{ margin: '0 0 8px 0', color: '#172b4d' }}>{selectedIssue.key}: {selectedIssue.title}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '16px' }}>{getTypeIcon(selectedIssue.issue_type)}</span>
                <span style={{ fontSize: '12px', color: '#6b778c' }}>{selectedIssue.issue_type}</span>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: getPriorityColor(selectedIssue.priority)
                }} />
                <span style={{ fontSize: '12px', color: '#6b778c' }}>{selectedIssue.priority}</span>
                <div style={{
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '600',
                  background: selectedIssue.status === 'DONE' ? '#e3fcef' : selectedIssue.status === 'IN_PROGRESS' ? '#deebff' : '#f4f5f7',
                  color: getStatusColor(selectedIssue.status)
                }}>
                  {selectedIssue.status.replace('_', ' ')}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowIssueModal(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#6b778c'
              }}
            >
              ×
            </button>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#172b4d' }}>Description</h4>
            <p style={{ margin: 0, color: '#6b778c', lineHeight: '1.5' }}>
              {selectedIssue.description || 'No description provided.'}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#172b4d' }}>Assignee</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: selectedIssue.assignee_id ? 'linear-gradient(135deg, #6554c0, #9575cd)' : '#ccc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: '600',
                  color: 'white'
                }}>
                  {selectedIssue.assignee_id ? getUserById(selectedIssue.assignee_id)?.avatar || 'UN' : 'UN'}
                </div>
                <span style={{ fontSize: '14px', color: '#172b4d' }}>
                  {selectedIssue.assignee_id ? getUserById(selectedIssue.assignee_id)?.name || 'Unknown User' : 'Unassigned'}
                </span>
              </div>
            </div>
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#172b4d' }}>Story Points</h4>
              <span style={{ fontSize: '14px', color: '#172b4d' }}>{selectedIssue.story_points}</span>
            </div>
          </div>

          {selectedIssue.labels && selectedIssue.labels.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#172b4d' }}>Labels</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {selectedIssue.labels.map((label, index) => (
                  <span
                    key={index}
                    style={{
                      background: '#f4f5f7',
                      color: '#6b778c',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}

          <CommentSection
            comments={selectedIssue.comments || []}
            users={users}
            onAddComment={(content) => addComment(selectedIssue.id, content)}
            currentUserId={user?.id || ''}
          />
        </div>
      </div>
    )
  );

  // Import/Export Modal
  const renderImportExportModal = () => (
    showImportExportModal && (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}
        onClick={() => setShowImportExportModal(false)}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: 'white' }}>
              Import / Export Issues
            </h2>
            <button
              onClick={() => setShowImportExportModal(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#94a3b8';
              }}
            >
              {Icons.close(24)}
            </button>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
              Export Issues
            </h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={exportToCSV}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '14px 20px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {Icons.download(16)}
                Export to CSV
              </button>
              <button
                onClick={exportToExcel}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '14px 20px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {Icons.download(16)}
                Export to Excel
              </button>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '24px' }}>
            <h3 style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
              Import Issues
            </h3>
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.xlsx,.xls"
              onChange={handleFileImport}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                padding: '14px 20px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              {Icons.upload(16)}
              Choose CSV or Excel File
            </button>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '12px', textAlign: 'center' }}>
              Supported formats: .csv, .xlsx, .xls
            </p>
          </div>

          <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
              {Icons.info(16)}
              <p style={{ color: '#93c5fd', fontSize: '13px', margin: 0, lineHeight: '1.5' }}>
                <strong>Format:</strong> Your file should include columns: Title, Type, Status, Priority, Assignee, Story Points, Description, Deadline
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  );

  // Main render logic
  if (!isAuthenticated) {
    return (
      <>
        {renderAuth()}
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  return (
    <>
      {/* Splash Screen */}
      {showSplashScreen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100vh',
          background: 'linear-gradient(135deg, #0f1729 0%, #1e3a8a 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'fadeOut 0.5s ease-in-out 2s forwards'
        }}>
          <style>{`
            @keyframes fadeOut {
              to {
                opacity: 0;
                visibility: hidden;
              }
            }

            @keyframes scaleIn {
              0% {
                transform: scale(0.5);
                opacity: 0;
              }
              50% {
                transform: scale(1.05);
              }
              100% {
                transform: scale(1);
                opacity: 1;
              }
            }

            @keyframes rotateRing {
              0% {
                transform: rotate(0deg);
              }
              100% {
                transform: rotate(360deg);
              }
            }

            @keyframes pulse {
              0%, 100% {
                transform: scale(1);
                opacity: 1;
              }
              50% {
                transform: scale(1.05);
                opacity: 0.8;
              }
            }
          `}</style>

          <div style={{
            textAlign: 'center',
            animation: 'scaleIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
          }}>
            {/* SVG Logo with animations */}
            <div style={{
              display: 'inline-block',
              animation: 'pulse 2s ease-in-out infinite'
            }}>
              {/* Circular checkmark icon */}
              <svg width="200" height="200" viewBox="0 0 200 200" style={{
                filter: 'drop-shadow(0 10px 40px rgba(59, 130, 246, 0.4))',
                marginBottom: '30px'
              }}>
                {/* Outer ring */}
                <circle
                  cx="100"
                  cy="100"
                  r="85"
                  fill="none"
                  stroke="#14b8a6"
                  strokeWidth="8"
                  opacity="0.8"
                />
                {/* Inner ring */}
                <circle
                  cx="100"
                  cy="100"
                  r="65"
                  fill="none"
                  stroke="#14b8a6"
                  strokeWidth="6"
                  opacity="0.6"
                />
                {/* Checkmark */}
                <path
                  d="M 60 100 L 85 125 L 140 70"
                  fill="none"
                  stroke="#14b8a6"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              {/* Text */}
              <div style={{
                fontSize: '48px',
                fontWeight: '800',
                color: 'white',
                letterSpacing: '2px',
                marginBottom: '10px',
                textShadow: '0 2px 20px rgba(59, 130, 246, 0.5)'
              }}>
                MISSEDTASK
              </div>
              <div style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#94a3b8',
                letterSpacing: '4px'
              }}>
                BY SHAPPE
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        style={{ background: '#0f1729', minHeight: '100vh', color: '#e0e7ff' }}
        onClick={(e) => {
          // Close profile menu when clicking outside
          const target = e.target as HTMLElement;
          if (!target.closest('[data-profile-menu]')) {
            setShowProfileMenu(false);
          }
        }}
      >
        {renderHeader()}
        {renderSidebar()}

      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: '60px',
            left: '240px',
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 40,
            display: window.innerWidth < 768 ? 'block' : 'none',
            transition: 'opacity 0.3s ease-in-out'
          }}
        />
      )}

      <main style={{
        marginLeft: sidebarOpen ? '240px' : '0',
        marginTop: '60px',
        minHeight: 'calc(100vh - 60px)',
        transition: 'margin-left 0.3s ease-in-out'
      }}>
        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'board' && renderBoard()}
        {currentView === 'admin' && renderAdminPanel()}
        {currentView === 'profile' && renderProfile()}
        {currentView === 'settings' && renderSettings()}
      </main>
      {renderCreateModal()}
      {renderIssueModal()}
      {renderInviteModal()}
      {renderImportExportModal()}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Floating Chat Button */}
      <button
        onClick={() => {
          setShowChatPopup(!showChatPopup);
          // Reset unread count when opening chat
          if (!showChatPopup) {
            setUnreadMessagesCount(0);
          }
        }}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: '#1e40af',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(30, 64, 175, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          transition: 'all 0.3s ease',
          transform: showChatPopup ? 'rotate(360deg)' : 'rotate(0deg)'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = showChatPopup ? 'scale(1.1) rotate(360deg)' : 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 12px 32px rgba(30, 64, 175, 0.6)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = showChatPopup ? 'rotate(360deg)' : 'rotate(0deg)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(30, 64, 175, 0.4)';
        }}
      >
        {showChatPopup ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        )}
        {/* Unread Messages Badge */}
        {(() => {
          console.log('💬 Chat badge check - showChatPopup:', showChatPopup, 'unreadMessagesCount:', unreadMessagesCount);
          return !showChatPopup && unreadMessagesCount > 0;
        })() && (
          <div style={{
            position: 'absolute',
            top: '0',
            right: '0',
            minWidth: '24px',
            height: '24px',
            borderRadius: '12px',
            background: '#ef4444',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: '700',
            border: '2px solid white',
            padding: '0 6px'
          }}>
            {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
          </div>
        )}
      </button>

      {/* Floating Chat Popup */}
      {renderFloatingChat()}
      </div>
    </>
  );
};

export default App;

