
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { Comment, useDreamComments } from "@/hooks/use-dream-comments";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Send, Trash2 } from "lucide-react";

interface CommentsSectionProps {
  dreamId: string;
}

export function CommentsSection({ dreamId }: CommentsSectionProps) {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addComment();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Comments ({comments.length})</h3>
      </div>

      {user && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <Textarea
            placeholder="Add a comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="min-h-24 resize-none"
          />
          <div className="flex justify-end">
            <Button 
              type="submit" 
              size="sm" 
              disabled={!commentText.trim() || isAddingComment}
            >
              <Send className="mr-2 h-4 w-4" />
              Post Comment
            </Button>
          </div>
        </form>
      )}

      {isLoading && comments.length === 0 ? (
        <Card className="p-4 text-center text-muted-foreground">
          Loading comments...
        </Card>
      ) : comments.length === 0 ? (
        <Card className="p-4 text-center text-muted-foreground">
          No comments yet. Be the first to comment!
        </Card>
      ) : (
        <div className="space-y-4">
          {comments.map((comment: Comment) => (
            <CommentItem 
              key={comment.id} 
              comment={comment} 
              onDelete={deleteComment}
              currentUserId={user?.id}
            />
          ))}
        </div>
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
    <div className="flex gap-3 p-3 rounded-lg border">
      <Avatar className="h-8 w-8">
        {comment.profiles.avatar_url && (
          <AvatarImage src={comment.profiles.avatar_url} alt={comment.profiles.username} />
        )}
        <AvatarFallback>{avatarFallback}</AvatarFallback>
      </Avatar>
      
      <div className="flex-1 space-y-1">
        <div className="flex items-start justify-between">
          <div>
            <span className="font-medium">{comment.profiles.username}</span>
            <span className="ml-2 text-xs text-muted-foreground">{timeAgo}</span>
          </div>
          
          {isOwnComment && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(comment.id)}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete comment</span>
            </Button>
          )}
        </div>
        
        <p className="text-sm text-foreground whitespace-pre-wrap">{comment.content}</p>
      </div>
    </div>
  );
}
