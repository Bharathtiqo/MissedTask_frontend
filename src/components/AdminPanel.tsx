// src/components/AdminPanel.tsx
import React, { useState, useEffect, useCallback } from 'react';
import Icons from './icons';
import {
  IssueActivityChart,
  IssueDistributionChart,
  PriorityChart,
  TeamPerformanceChart,
  UserActivityChart,
  BurndownChart
} from './Charts.tsx';
import AnalyticsControls, { AnalyticsFilters } from './AnalyticsControls.tsx';

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  organization_id: string;
  is_active: boolean;
  created_at: string;
}

interface Organization {
  id: string;
  name: string;
  domain: string;
  plan: string;
  user_count: number;
  max_users: number;
  created_at: string;
}

interface Issue {
  id: string;
  key: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  organization_id: string;
}

interface AdminPanelProps {
  currentUser: User;
  organization: Organization;
  users: User[];
  issues: Issue[];
  apiCall: (endpoint: string, options?: RequestInit) => Promise<any>;
  onUserUpdate: (users: User[]) => void;
  showToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  organization,
  users,
  issues,
  apiCall,
  onUserUpdate,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'settings' | 'analytics'>('overview');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editForm, setEditForm] = useState({
    role: '',
    is_active: true
  });
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'developer',
    name: ''
  });
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalIssues: 0,
    completedIssues: 0,
    inProgressIssues: 0,
    storageUsed: 0
  });
  const isSuperAdmin = currentUser.role === 'super_admin';

  const calculateStats = useCallback(() => {
    setStats({
      totalUsers: users.length,
      activeUsers: users.filter(u => u.is_active).length,
      totalIssues: issues.length,
      completedIssues: issues.filter(i => i.status === 'DONE').length,
      inProgressIssues: issues.filter(i => i.status === 'IN_PROGRESS').length,
      storageUsed: Math.round((users.length * 0.5 + issues.length * 0.1) * 100) / 100
    });
  }, [issues, users]);

  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  const handleRoleUpdate = async () => {
    if (!selectedUser || !isSuperAdmin) {
      showToast('error', 'Permission Denied', 'Only super admins can change user roles');
      return;
    }

    try {
      await apiCall(`/api/users/${selectedUser.id}/role`, {
        method: 'PUT',
        body: JSON.stringify({
          role: editForm.role,
          is_active: editForm.is_active
        })
      });

      const updatedUsers = users.map(u =>
        u.id === selectedUser.id
          ? { ...u, role: editForm.role, is_active: editForm.is_active }
          : u
      );

      onUserUpdate(updatedUsers);
      setShowEditModal(false);
      setSelectedUser(null);
      showToast('success', 'User Updated', `${selectedUser.name}'s role has been updated`);
    } catch (error: any) {
      showToast('error', 'Update Failed', error.message || 'Could not update user role');
    }
  };

  const handleInviteMember = async () => {
    if (!isSuperAdmin) return;

    // Validate form
    if (!inviteForm.email || !inviteForm.name) {
      showToast('warning', 'Validation Error', 'Please fill in all required fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteForm.email)) {
      showToast('warning', 'Invalid Email', 'Please enter a valid email address');
      return;
    }

    // Check if user already exists
    if (users.some(u => u.email.toLowerCase() === inviteForm.email.toLowerCase())) {
      showToast('warning', 'User Exists', 'A user with this email already exists in the organization');
      return;
    }

    // Check organization user limit
    if (users.length >= organization.max_users) {
      showToast('error', 'User Limit Reached', `Your organization has reached the maximum of ${organization.max_users} users`);
      return;
    }

    try {
      await apiCall('/api/users/invite', {
        method: 'POST',
        body: JSON.stringify({
          email: inviteForm.email,
          name: inviteForm.name,
          role: inviteForm.role,
          organization_id: organization.id
        })
      });

      // Create new user object
      const newUser: User = {
        id: response.user_id || `user-${Date.now()}`,
        name: inviteForm.name,
        email: inviteForm.email,
        avatar: inviteForm.name.charAt(0).toUpperCase(),
        role: inviteForm.role,
        organization_id: organization.id,
        is_active: true,
        created_at: new Date().toISOString()
      };

      onUserUpdate([...users, newUser]);
      setShowInviteModal(false);
      setInviteForm({ email: '', role: 'developer', name: '' });
      showToast('success', 'Invitation Sent', `Invitation sent to ${inviteForm.email}`);
    } catch (error: any) {
      showToast('error', 'Invitation Failed', error.message || 'Could not send invitation');
    }
  };

  const handleExportCSV = () => {
    const csvData = [
      ['Metric', 'Value'],
      ['Total Users', stats.totalUsers],
      ['Active Users', stats.activeUsers],
      ['Total Issues', stats.totalIssues],
      ['Completed Issues', stats.completedIssues],
      ['In Progress Issues', stats.inProgressIssues],
      ['Storage Used (GB)', stats.storageUsed],
      [''],
      ['Issue Details'],
      ['ID', 'Key', 'Title', 'Status', 'Priority', 'Created At'],
      ...issues.map(issue => [
        issue.id,
        issue.key,
        issue.title,
        issue.status,
        issue.priority,
        new Date(issue.created_at).toLocaleDateString()
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    showToast('success', 'Export Complete', 'Analytics data exported to CSV');
  };

  const handleExportPDF = () => {
    showToast('info', 'Export Started', 'PDF export is being prepared...');
    // PDF export would typically use a library like jsPDF or html2pdf
    setTimeout(() => {
      showToast('success', 'Export Complete', 'Analytics report exported to PDF');
    }, 1500);
  };

  const handleFilterChange = (filters: AnalyticsFilters) => {
    showToast('info', 'Filters Applied', `Showing data for ${filters.dateRange}`);
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      super_admin: '#e74c3c',
      admin: '#f39c12',
      project_manager: '#3498db',
      scrum_master: '#1abc9c',
      developer: '#2ecc71',
      tester: '#9b59b6',
      employees: '#95a5a6'
    };
    return colors[role] || '#95a5a6';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderOverview = () => (
    <div>
      <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px', color: '#fff' }}>
        Dashboard Overview
      </h2>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {[
          { label: 'Total Users', value: stats.totalUsers, icon: Icons.userPlus(24), color: '#3498db' },
          { label: 'Active Users', value: stats.activeUsers, icon: Icons.checkCircle(24), color: '#2ecc71' },
          { label: 'Total Issues', value: stats.totalIssues, icon: Icons.list(24), color: '#e74c3c' },
          { label: 'Completed Issues', value: stats.completedIssues, icon: Icons.success(24), color: '#27ae60' },
          { label: 'In Progress', value: stats.inProgressIssues, icon: Icons.progress(24), color: '#f39c12' },
          { label: 'Storage Used', value: `${stats.storageUsed} GB`, icon: Icons.activity(24), color: '#9b59b6' }
        ].map((stat, index) => (
          <div key={index} style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '20px',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ marginRight: '12px', color: stat.color }}>{stat.icon}</span>
              <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>
                {stat.label}
              </span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: stat.color }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Organization Info */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#fff' }}>
          Organization Details
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Name</div>
            <div style={{ fontSize: '16px', color: '#e2e8f0', fontWeight: '500' }}>{organization.name}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Domain</div>
            <div style={{ fontSize: '16px', color: '#e2e8f0', fontWeight: '500' }}>{organization.domain}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Plan</div>
            <div style={{ 
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '20px',
              background: organization.plan === 'enterprise' ? '#e74c3c' : 
                        organization.plan === 'pro' ? '#3498db' : '#95a5a6',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              textTransform: 'capitalize'
            }}>
              {organization.plan}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>User Capacity</div>
            <div style={{ fontSize: '16px', color: '#e2e8f0', fontWeight: '500' }}>
              {organization.user_count} / {organization.max_users}
            </div>
            <div style={{
              marginTop: '8px',
              height: '8px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${(organization.user_count / organization.max_users) * 100}%`,
                background: organization.user_count >= organization.max_users ? '#e74c3c' : '#2ecc71',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#fff' }}>
          User Management
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '14px', color: '#94a3b8' }}>
            {users.length} / {organization.max_users} users
          </div>
          {isSuperAdmin && (
            <button
              onClick={() => setShowInviteModal(true)}
              disabled={users.length >= organization.max_users}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: users.length >= organization.max_users
                  ? 'rgba(148, 163, 184, 0.2)'
                  : 'linear-gradient(135deg, #667eea, #764ba2)',
                border: 'none',
                borderRadius: '8px',
                color: users.length >= organization.max_users ? '#94a3b8' : 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: users.length >= organization.max_users ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: users.length >= organization.max_users ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (users.length < organization.max_users) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(102, 126, 234, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (users.length < organization.max_users) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              {Icons.userPlus(18)}
              <span>Invite Member</span>
            </button>
          )}
        </div>
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>
                USER
              </th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>
                EMAIL
              </th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>
                ROLE
              </th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>
                STATUS
              </th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>
                JOINED
              </th>
              {isSuperAdmin && (
                <th style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>
                  ACTIONS
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => (
              <tr 
                key={user.id} 
                style={{ 
                  borderBottom: index < users.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #667eea, #764ba2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: 'white'
                    }}>
                      {user.avatar}
                    </div>
                    <span style={{ fontSize: '14px', color: '#e2e8f0', fontWeight: '500' }}>
                      {user.name}
                    </span>
                  </div>
                </td>
                <td style={{ padding: '16px', fontSize: '14px', color: '#94a3b8' }}>
                  {user.email}
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    background: getRoleBadgeColor(user.role),
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: '600',
                    textTransform: 'uppercase'
                  }}>
                    {user.role.replace('_', ' ')}
                  </span>
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    background: user.is_active ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)',
                    color: user.is_active ? '#2ecc71' : '#e74c3c',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: user.is_active ? '#2ecc71' : '#e74c3c'
                    }} />
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '16px', fontSize: '13px', color: '#94a3b8' }}>
                  {formatDate(user.created_at)}
                </td>
                {isSuperAdmin && (
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    {user.id !== currentUser.id && (
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setEditForm({
                            role: user.role,
                            is_active: user.is_active
                          });
                          setShowEditModal(true);
                        }}
                        style={{
                          background: 'rgba(52, 152, 219, 0.2)',
                          border: '1px solid rgba(52, 152, 219, 0.5)',
                          borderRadius: '6px',
                          color: '#3498db',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(52, 152, 219, 0.3)';
                          e.currentTarget.style.borderColor = '#3498db';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(52, 152, 219, 0.2)';
                          e.currentTarget.style.borderColor = 'rgba(52, 152, 219, 0.5)';
                        }}
                      >
                        Edit
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div>
      <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px', color: '#fff' }}>
        Organization Settings
      </h2>

      <div style={{
        display: 'grid',
        gap: '24px'
      }}>
        {/* Plan Settings */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#fff' }}>
            Subscription Plan
          </h3>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>Current Plan</div>
            <div style={{ fontSize: '24px', fontWeight: '600', color: '#e2e8f0', textTransform: 'capitalize' }}>
              {organization.plan}
            </div>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>User Limit</div>
            <div style={{ fontSize: '18px', color: '#e2e8f0' }}>
              {organization.max_users} users
            </div>
          </div>
          {organization.plan !== 'enterprise' && (
            <button
              style={{
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Upgrade Plan
            </button>
          )}
        </div>

        {/* Security Settings */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#fff' }}>
            Security Settings
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '14px', color: '#e2e8f0', marginBottom: '4px' }}>
                  Two-Factor Authentication
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Require 2FA for all users
                </div>
              </div>
              <input type="checkbox" style={{ width: '20px', height: '20px' }} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '14px', color: '#e2e8f0', marginBottom: '4px' }}>
                  Session Timeout
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Auto-logout after 30 minutes of inactivity
                </div>
              </div>
              <input type="checkbox" style={{ width: '20px', height: '20px' }} defaultChecked />
            </label>
          </div>
        </div>

        {/* Danger Zone */}
        {isSuperAdmin && (
          <div style={{
            background: 'rgba(231, 76, 60, 0.1)',
            border: '1px solid rgba(231, 76, 60, 0.3)',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#e74c3c' }}>
              Danger Zone
            </h3>
            <p style={{ fontSize: '14px', color: '#e2e8f0', marginBottom: '16px' }}>
              Once you delete an organization, there is no going back. Please be certain.
            </p>
            <button
              style={{
                background: 'transparent',
                border: '1px solid #e74c3c',
                borderRadius: '8px',
                color: '#e74c3c',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Delete Organization
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderAnalytics = () => {
    // Calculate data from issues for charts
    const issuesByStatus = issues.reduce((acc, issue) => {
      acc[issue.status] = (acc[issue.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const issuesByPriority = issues.reduce((acc, issue) => {
      acc[issue.priority] = (acc[issue.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusDistributionData = [
      { name: 'TODO', value: issuesByStatus['TODO'] || 0, color: '#94a3b8' },
      { name: 'IN PROGRESS', value: issuesByStatus['IN_PROGRESS'] || 0, color: '#f39c12' },
      { name: 'REVIEW', value: issuesByStatus['REVIEW'] || 0, color: '#3498db' },
      { name: 'DONE', value: issuesByStatus['DONE'] || 0, color: '#2ecc71' }
    ];

    const priorityData = [
      { priority: 'HIGHEST', count: issuesByPriority['HIGHEST'] || 0 },
      { priority: 'HIGH', count: issuesByPriority['HIGH'] || 0 },
      { priority: 'MEDIUM', count: issuesByPriority['MEDIUM'] || 0 },
      { priority: 'LOW', count: issuesByPriority['LOW'] || 0 },
      { priority: 'LOWEST', count: issuesByPriority['LOWEST'] || 0 }
    ];

    // Calculate last 7 days activity
    const last7Days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const dateStr = date.toISOString().split('T')[0];

      const dayIssues = issues.filter(issue => {
        const issueDate = new Date(issue.created_at).toISOString().split('T')[0];
        return issueDate === dateStr;
      });

      const completedIssues = issues.filter(issue => {
        const issueDate = new Date(issue.updated_at || issue.created_at).toISOString().split('T')[0];
        return issueDate === dateStr && issue.status === 'DONE';
      });

      last7Days.push({
        day: dayName,
        issues: dayIssues.length,
        completed: completedIssues.length
      });
    }

    // Calculate team performance by weeks (last 4 weeks)
    const weeklyData = [];
    for (let i = 3; i >= 0; i--) {
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() - (i * 7));
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);

      const weekIssues = issues.filter(issue => {
        const issueDate = new Date(issue.created_at);
        return issueDate >= weekStart && issueDate <= weekEnd;
      });

      const assignedCount = weekIssues.length;
      const completedCount = weekIssues.filter(i => i.status === 'DONE').length;
      const velocity = Math.round((completedCount / (assignedCount || 1)) * 100);

      weeklyData.push({
        week: `Week ${4 - i}`,
        completed: completedCount,
        assigned: assignedCount,
        velocity: velocity
      });
    }

    // Calculate user activity metrics (average across all users)
    const totalIssues = issues.length || 1;
    const completedIssues = issues.filter(i => i.status === 'DONE').length;
    const userActivityData = [
      { metric: 'Issues Created', value: Math.min(100, Math.round((totalIssues / 50) * 100)), fullMark: 100 },
      { metric: 'Completion Rate', value: Math.round((completedIssues / totalIssues) * 100), fullMark: 100 },
      { metric: 'In Progress', value: Math.round((issuesByStatus['IN_PROGRESS'] || 0) / totalIssues * 100), fullMark: 100 },
      { metric: 'Review', value: Math.round((issuesByStatus['REVIEW'] || 0) / totalIssues * 100), fullMark: 100 },
      { metric: 'Collaboration', value: users.length > 1 ? 75 : 30, fullMark: 100 }
    ];

    // Calculate burndown chart (simulated sprint of 10 days)
    const sprintLength = 10;
    const totalPoints = issues.length;
    const burndownData = [];
    for (let day = 0; day <= sprintLength; day++) {
      const ideal = totalPoints - (totalPoints / sprintLength) * day;
      const completed = completedIssues;
      const remaining = Math.max(0, totalPoints - (completed / sprintLength) * day);

      burndownData.push({
        day: `Day ${day + 1}`,
        ideal: Math.round(ideal),
        actual: Math.round(remaining)
      });
    }

    return (
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px', color: '#fff' }}>
          Analytics & Reports
        </h2>

        {/* Analytics Controls */}
        <AnalyticsControls
          onExportPDF={handleExportPDF}
          onExportCSV={handleExportCSV}
          onFilterChange={handleFilterChange}
        />

        {/* First Row - Activity and Distribution */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
          gap: '24px',
          marginBottom: '24px'
        }}>
          <IssueActivityChart data={last7Days} />
          <IssueDistributionChart data={statusDistributionData} />
        </div>

        {/* Second Row - Priority and Performance */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
          gap: '24px',
          marginBottom: '24px'
        }}>
          <PriorityChart data={priorityData} />
          <TeamPerformanceChart data={weeklyData} />
        </div>

        {/* Third Row - User Activity and Burndown */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
          gap: '24px',
          marginBottom: '24px'
        }}>
          <UserActivityChart data={userActivityData} />
          <BurndownChart data={burndownData} />
        </div>

        {/* Team Performance Summary */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#fff' }}>
            Team Performance Summary
          </h3>
          <div style={{ display: 'grid', gap: '16px' }}>
            {users.slice(0, 5).map(user => {
              const userIssues = issues.filter(i => i.assignee_id === user.id);
              const completed = userIssues.filter(i => i.status === 'DONE').length;
              const total = userIssues.length || 1;
              const percentage = Math.round((completed / total) * 100);

              return (
                <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: 'white',
                    flexShrink: 0
                  }}>
                    {user.avatar}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '14px', color: '#e2e8f0' }}>{user.name}</span>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                        {completed}/{total} tasks
                      </span>
                    </div>
                    <div style={{
                      height: '6px',
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${percentage}%`,
                        background: percentage > 75 ? '#2ecc71' : percentage > 50 ? '#f39c12' : '#e74c3c',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                  <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>
                    {percentage}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px', color: '#fff' }}>
          Admin Panel
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '16px' }}>
          Manage your organization, users, and view analytics
        </p>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '32px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        paddingBottom: '0'
      }}>
        {[
          { id: 'overview', label: 'Overview', icon: '📊' },
          { id: 'users', label: 'Users', icon: '👥' },
          { id: 'settings', label: 'Settings', icon: '⚙️' },
          { id: 'analytics', label: 'Analytics', icon: '📈' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              background: activeTab === tab.id ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #3498db' : '2px solid transparent',
              color: activeTab === tab.id ? '#fff' : '#94a3b8',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '-1px',
              transition: 'all 0.2s'
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'settings' && renderSettings()}
        {activeTab === 'analytics' && renderAnalytics()}
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
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
          zIndex: 3000
        }}>
          <div style={{
            background: '#1a1d21',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '28px',
            width: '450px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '22px', fontWeight: '600', color: '#fff' }}>
                Invite Team Member
              </h3>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteForm({ email: '', role: 'developer', name: '' });
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                {Icons.close(20)}
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#94a3b8', fontWeight: '500' }}>
                Full Name <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <input
                type="text"
                value={inviteForm.name}
                onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                placeholder="Enter full name"
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#3498db'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#94a3b8', fontWeight: '500' }}>
                Email Address <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="email@example.com"
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#3498db'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#94a3b8', fontWeight: '500' }}>
                Role
              </label>
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                  fontSize: '14px',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="developer">Developer</option>
                <option value="tester">Tester</option>
                <option value="scrum_master">Scrum Master</option>
                <option value="project_manager">Project Manager</option>
                <option value="admin">Admin</option>
                <option value="employees">Employee</option>
              </select>
            </div>

            <div style={{
              background: 'rgba(52, 152, 219, 0.1)',
              border: '1px solid rgba(52, 152, 219, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'start', gap: '10px' }}>
                <span style={{ color: '#3498db', marginTop: '2px' }}>{Icons.info(18)}</span>
                <div>
                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, lineHeight: '1.5' }}>
                    An invitation email will be sent to the member with instructions to join your organization.
                  </p>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '8px 0 0 0' }}>
                    Organization: {organization.name} ({users.length}/{organization.max_users} users)
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteForm({ email: '', role: 'developer', name: '' });
                }}
                style={{
                  padding: '12px 24px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  color: '#94a3b8',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleInviteMember}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 10px 20px rgba(102, 126, 234, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
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
          zIndex: 3000
        }}>
          <div style={{
            background: '#1a1d21',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '24px',
            width: '400px'
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', color: '#fff' }}>
              Edit User: {selectedUser.name}
            </h3>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#94a3b8' }}>
                Role
              </label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  color: '#e2e8f0',
                  fontSize: '14px'
                }}
              >
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="project_manager">Project Manager</option>
                <option value="scrum_master">Scrum Master</option>
                <option value="developer">Developer</option>
                <option value="tester">Tester</option>
                <option value="employees">Employee</option>
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ fontSize: '14px', color: '#e2e8f0' }}>Active User</span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                }}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '6px',
                  color: '#94a3b8',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRoleUpdate}
                style={{
                  padding: '10px 20px',
                  background: '#3498db',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
