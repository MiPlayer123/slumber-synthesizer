
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { Comment, useDreamComments } from "@/hooks/use-dream-comments";
import { formatDistanceToNow } from "date-fns";
import { Send, Trash2 } from "lucide-react";

interface CommentsSectionProps {
  dreamId: string;
  initialCommentsToShow?: number;
}

export function CommentsSection({ dreamId, initialCommentsToShow = 2 }: CommentsSectionProps) {
  const { user } = useAuth();
  const {
    comments,
    commentText,
    setCommentText,
    addComment,
    deleteComment,
    isLoading,
    isAddingComment
  } = useDreamComments(dreamId);
  
  const [showAllComments, setShowAllComments] = useState(false);
  
  const commentsToDisplay = showAllComments 
    ? comments 
    : comments.slice(0, initialCommentsToShow);
  
  const hasMoreComments = comments.length > initialCommentsToShow;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addComment();
  };

  return (
    <div className="space-y-3">
      {/* Comments display */}
      {isLoading && comments.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">No comments yet</p>
      ) : (
        <div className="space-y-3">
          {commentsToDisplay.map((comment: Comment) => (
            <CommentItem 
              key={comment.id} 
              comment={comment} 
              onDelete={deleteComment}
              currentUserId={user?.id}
            />
          ))}
          
          {hasMoreComments && !showAllComments && (
            <Button 
              variant="link" 
              size="sm" 
              className="p-0 h-auto text-muted-foreground" 
              onClick={() => setShowAllComments(true)}
            >
              View all {comments.length} comments
            </Button>
          )}
        </div>
      )}

      {/* Comment input */}
      {user && (
        <form onSubmit={handleSubmit} className="flex items-start gap-2 mt-4 pt-3 border-t">
          <Avatar className="h-8 w-8 mt-1">
            {user.user_metadata?.avatar_url && (
              <AvatarImage src={user.user_metadata.avatar_url} alt={user.user_metadata.name || user.email || ""} />
            )}
            <AvatarFallback>{(user.email || "U").charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 flex gap-2">
            <Textarea
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="min-h-0 h-8 py-1.5 resize-none"
            />
            <Button 
              type="submit" 
              size="icon"
              className="h-8 w-8"
              disabled={!commentText.trim() || isAddingComment}
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">Post Comment</span>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

interface CommentItemProps {
  comment: Comment;
  onDelete: (id: string) => void;
  currentUserId?: string;
}

function CommentItem({ comment, onDelete, currentUserId }: CommentItemProps) {
  const isOwnComment = currentUserId === comment.user_id;
  const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true });
  
  // Get the first letter of the username for avatar fallback
  const avatarFallback = comment.profiles.username.charAt(0).toUpperCase();

  return (
    <div className="flex gap-2">
      <Avatar className="h-6 w-6 mt-0.5">
        {comment.profiles.avatar_url && (
          <AvatarImage src={comment.profiles.avatar_url} alt={comment.profiles.username} />
        )}
        <AvatarFallback>{avatarFallback}</AvatarFallback>
      </Avatar>
      
      <div className="flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-medium text-sm">{comment.profiles.username}</span>
          <p className="text-sm flex-1 text-foreground">{comment.content}</p>
        </div>
        
        <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
          <span>{timeAgo}</span>
          
          {isOwnComment && (
            <button 
              className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
              onClick={() => onDelete(comment.id)}
            >
              <Trash2 className="h-3 w-3" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
