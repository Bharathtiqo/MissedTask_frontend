// components/CommentSection.tsx
import React, { useState } from 'react';

interface Comment {
  id: string;
  content: string;
  author_id: string;
  issue_id: string;
  created_at: string;
  updated_at: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  organization_id: string;
  is_active: boolean;
  created_at: string;
  last_seen?: string;
  is_online?: boolean;
}

interface CommentSectionProps {
  comments: Comment[];
  users: User[];
  onAddComment: (content: string) => Promise<void>;
  currentUserId: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({ 
  comments, 
  users, 
  onAddComment, 
  currentUserId 
}) => {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getUserById = (userId: string) => {
    return users.find(u => u.id === userId);
  };

  const handleSubmit = async () => {
    if (!newComment.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onAddComment(newComment.trim());
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
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
          const isCurrentUser = comment.author_id === currentUserId;
          
          return (
            <div key={comment.id} style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '16px',
              padding: '12px',
              background: isCurrentUser ? '#f0f8ff' : '#f8f9fa',
              borderRadius: '8px',
              borderLeft: isCurrentUser ? '3px solid #0052cc' : '3px solid transparent'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: isCurrentUser 
                  ? 'linear-gradient(135deg, #0052cc, #2563eb)' 
                  : 'linear-gradient(135deg, #6554c0, #9575cd)',
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
                    {isCurrentUser && ' (You)'}
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
        
        {comments.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: '#6b778c',
            fontSize: '13px',
            padding: '20px',
            fontStyle: 'italic'
          }}>
            No comments yet. Be the first to comment!
          </div>
        )}
      </div>
      
      <div>
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-end'
        }}>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Add a comment..."
            rows={3}
            disabled={isSubmitting}
            style={{
              flex: 1,
              padding: '12px',
              border: '1px solid #dfe1e6',
              borderRadius: '6px',
              fontSize: '14px',
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit',
              background: isSubmitting ? '#f8f9fa' : 'white'
            }}
          />
          <button
            onClick={handleSubmit}
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
              whiteSpace: 'nowrap',
              transition: 'background 0.2s'
            }}
          >
            {isSubmitting ? 'Posting...' : 'Comment'}
          </button>
        </div>
        <div style={{
          fontSize: '11px',
          color: '#8993a4',
          marginTop: '6px'
        }}>
          Press Enter to post, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
};

export default CommentSection;