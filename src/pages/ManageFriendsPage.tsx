import React, { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  UserX,
  UserCheck,
  XCircle,
  CheckCircle,
  Users,
  AlertTriangle,
  Search,
  UserPlus,
} from "lucide-react";
import { Profile } from "@/lib/types"; // Assuming Profile type is defined in types.ts
import { Link } from "react-router-dom";

interface Friendship {
  user_id: string;
  friend_user_id: string;
  status: "pending" | "accepted";
  created_at: string;
  other_user: Pick<Profile, "id" | "username" | "avatar_url">; // Profile of the other user
}

interface SearchResult extends Pick<Profile, "id" | "username" | "avatar_url"> {
  friendshipStatus: "none" | "pending_sent" | "pending_received" | "friends";
}

export default function ManageFriendsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const currentUserId = user?.id;

  // 1. Data Fetching
  const {
    data: friendships,
    isLoading: isLoadingFriendships,
    error: friendshipsError,
  } = useQuery<Friendship[], Error>({
    queryKey: ["friendships", currentUserId],
    queryFn: async () => {
      if (!currentUserId) throw new Error("User not authenticated");

      const { data: rawFriendships, error } = await supabase
        .from("friendship")
        .select("*")
        .or(`user_id.eq.${currentUserId},friend_user_id.eq.${currentUserId}`);

      if (error) throw error;

      const processedFriendships = await Promise.all(
        rawFriendships.map(async (friendship) => {
          const otherUserId =
            friendship.user_id === currentUserId
              ? friendship.friend_user_id
              : friendship.user_id;
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .eq("id", otherUserId)
            .single();

          if (profileError) {
            console.warn(
              `Could not fetch profile for user ${otherUserId}:`,
              profileError.message,
            );
            // Return a default/fallback profile structure or skip this friendship
            return {
              ...friendship,
              other_user: {
                id: otherUserId,
                username: "Unknown User",
                avatar_url: "",
              },
            };
          }
          return { ...friendship, other_user: profileData };
        }),
      );
      return processedFriendships.filter((f) => f.other_user) as Friendship[]; // Filter out any potentially skipped ones
    },
    enabled: !!currentUserId,
  });

  // 2. Filter Data Locally
  const currentFriends = useMemo(
    () => friendships?.filter((f) => f.status === "accepted") || [],
    [friendships],
  );
  const sentRequests = useMemo(
    () =>
      friendships?.filter(
        (f) => f.status === "pending" && f.user_id === currentUserId,
      ) || [],
    [friendships, currentUserId],
  );
  const receivedRequests = useMemo(
    () =>
      friendships?.filter(
        (f) => f.status === "pending" && f.friend_user_id === currentUserId,
      ) || [],
    [friendships, currentUserId],
  );

  // 3. Action Handlers (Mutations)

  // Remove Friend or Cancel Sent Request (same logic: delete row)
  const {
    mutate: removeOrCancelFriendship,
    isPending: isRemovingOrCancelling,
  } = useMutation({
    mutationFn: async ({
      user1Id,
      user2Id,
    }: {
      user1Id: string;
      user2Id: string;
    }) => {
      // For sent requests, user1Id = currentUser, user2Id = otherUser
      // For removing friends, order doesn't strictly matter for the OR condition
      const { error } = await supabase
        .from("friendship")
        .delete()
        .or(
          `and(user_id.eq.${user1Id},friend_user_id.eq.${user2Id}),and(user_id.eq.${user2Id},friend_user_id.eq.${user1Id})`,
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["friendships", currentUserId],
      });
      toast({ title: "Success", description: "Friendship updated." });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  // Accept Friend Request
  const { mutate: acceptRequest, isPending: isAccepting } = useMutation({
    mutationFn: async ({
      requesterId,
      receiverId,
    }: {
      requesterId: string;
      receiverId: string;
    }) => {
      const { error } = await supabase
        .from("friendship")
        .update({ status: "accepted" })
        .eq("user_id", requesterId)
        .eq("friend_user_id", receiverId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["friendships", currentUserId],
      });
      toast({ title: "Friend Added", description: "You are now friends!" });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  // Send Friend Request (for new friends)
  const { mutate: sendFriendRequest, isPending: isSendingRequest } =
    useMutation({
      mutationFn: async ({ friendId }: { friendId: string }) => {
        if (!currentUserId) throw new Error("User not authenticated");

        const { error } = await supabase.from("friendship").insert({
          user_id: currentUserId,
          friend_user_id: friendId,
          status: "pending",
        });
        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["friendships", currentUserId],
        });
        toast({
          title: "Friend Request Sent",
          description: "Your friend request has been sent!",
        });
        // Refresh search results to update the button states
        if (searchQuery.trim()) {
          handleSearch();
        }
      },
      onError: (error: Error) => {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
      },
    });

  // Search for users
  const handleSearch = async () => {
    if (!searchQuery.trim() || !currentUserId) return;

    setIsSearching(true);
    try {
      // Search for users by username (case-insensitive)
      const { data: users, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .ilike("username", `%${searchQuery.trim()}%`)
        .neq("id", currentUserId) // Exclude current user
        .limit(20);

      if (error) throw error;

      // Get current friendship statuses for these users
      const userIds = users?.map((u) => u.id) || [];
      const { data: existingFriendships, error: friendshipError } =
        await supabase
          .from("friendship")
          .select("user_id, friend_user_id, status")
          .or(
            `and(user_id.eq.${currentUserId},friend_user_id.in.(${userIds.join(",")})),and(user_id.in.(${userIds.join(",")}),friend_user_id.eq.${currentUserId})`,
          );

      if (friendshipError) throw friendshipError;

      // Map users with their friendship status
      const results: SearchResult[] =
        users?.map((user) => {
          const friendship = existingFriendships?.find(
            (f) =>
              (f.user_id === currentUserId && f.friend_user_id === user.id) ||
              (f.user_id === user.id && f.friend_user_id === currentUserId),
          );

          let friendshipStatus: SearchResult["friendshipStatus"] = "none";
          if (friendship) {
            if (friendship.status === "accepted") {
              friendshipStatus = "friends";
            } else if (friendship.status === "pending") {
              if (friendship.user_id === currentUserId) {
                friendshipStatus = "pending_sent";
              } else {
                friendshipStatus = "pending_received";
              }
            }
          }

          return {
            ...user,
            friendshipStatus,
          };
        }) || [];

      setSearchResults(results);
    } catch (error) {
      console.error("Error searching users:", error);
      toast({
        variant: "destructive",
        title: "Search Error",
        description: "Failed to search for users",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Handle sending friend request from search results
  const handleSendFriendRequest = (friendId: string) => {
    sendFriendRequest({ friendId });
  };

  const handleRemoveFriend = (otherUserId: string) => {
    if (!currentUserId) return;
    removeOrCancelFriendship({ user1Id: currentUserId, user2Id: otherUserId });
  };

  const handleCancelRequest = (otherUserId: string) => {
    if (!currentUserId) return;
    // Current user is user_id, otherUser is friend_user_id
    removeOrCancelFriendship({ user1Id: currentUserId, user2Id: otherUserId });
  };

  const handleAcceptRequest = (requesterId: string) => {
    if (!currentUserId) return;
    acceptRequest({ requesterId, receiverId: currentUserId });
  };

  const handleDeclineRequest = (requesterId: string) => {
    if (!currentUserId) return;
    // Requester is user_id, current user (receiver) is friend_user_id
    removeOrCancelFriendship({ user1Id: requesterId, user2Id: currentUserId });
  };

  const renderFriendList = (
    list: Friendship[],
    type: "friends" | "sent" | "received",
  ) => {
    if (isLoadingFriendships) {
      return (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    if (list.length === 0) {
      let message = "No users found in this category.";
      if (type === "friends") message = "You haven't added any friends yet.";
      if (type === "sent") message = "You haven't sent any friend requests.";
      if (type === "received") message = "No pending friend requests.";
      return (
        <p className="text-muted-foreground text-center py-10">{message}</p>
      );
    }

    return (
      <ul className="space-y-4">
        {list.map((friendship) => (
          <li
            key={friendship.user_id + friendship.friend_user_id}
            className="flex items-center justify-between p-3 bg-card rounded-lg shadow"
          >
            <Link
              to={`/profile/${friendship.other_user.username}`}
              className="flex items-center space-x-3 group"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={friendship.other_user.avatar_url || undefined}
                  alt={friendship.other_user.username}
                />
                <AvatarFallback>
                  {friendship.other_user.username?.charAt(0).toUpperCase() ||
                    "U"}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium group-hover:text-primary transition-colors">
                {friendship.other_user.username}
              </span>
            </Link>
            <div className="flex space-x-2">
              {type === "friends" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveFriend(friendship.other_user.id)}
                  disabled={isRemovingOrCancelling}
                >
                  <UserX className="mr-2 h-4 w-4" /> Remove
                  {isRemovingOrCancelling && (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  )}
                </Button>
              )}
              {type === "sent" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCancelRequest(friendship.other_user.id)}
                  disabled={isRemovingOrCancelling}
                >
                  <XCircle className="mr-2 h-4 w-4" /> Cancel
                  {isRemovingOrCancelling && (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  )}
                </Button>
              )}
              {type === "received" && (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleAcceptRequest(friendship.user_id)}
                    disabled={isAccepting}
                  >
                    <UserCheck className="mr-2 h-4 w-4" /> Accept
                    {isAccepting && (
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeclineRequest(friendship.user_id)}
                    disabled={isRemovingOrCancelling}
                  >
                    <XCircle className="mr-2 h-4 w-4" /> Decline
                    {isRemovingOrCancelling && (
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    )}
                  </Button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  };

  const renderSearchResults = () => {
    if (isSearching) {
      return (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!searchQuery.trim()) {
      return (
        <p className="text-muted-foreground text-center py-10">
          Enter a username to search for friends
        </p>
      );
    }

    if (searchResults.length === 0) {
      return (
        <p className="text-muted-foreground text-center py-10">
          Hit enter to search for "{searchQuery}"
        </p>
      );
    }

    return (
      <ul className="space-y-4">
        {searchResults.map((user) => (
          <li
            key={user.id}
            className="flex items-center justify-between p-3 bg-card rounded-lg shadow"
          >
            <Link
              to={`/profile/${user.username}`}
              className="flex items-center space-x-3 group"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={user.avatar_url || undefined}
                  alt={user.username}
                />
                <AvatarFallback>
                  {user.username?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium group-hover:text-primary transition-colors">
                {user.username}
              </span>
            </Link>
            <div className="flex space-x-2">
              {user.friendshipStatus === "none" && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleSendFriendRequest(user.id)}
                  disabled={isSendingRequest}
                >
                  <UserPlus className="mr-2 h-4 w-4" /> Add Friend
                  {isSendingRequest && (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  )}
                </Button>
              )}
              {user.friendshipStatus === "pending_sent" && (
                <Button variant="outline" size="sm" disabled>
                  <CheckCircle className="mr-2 h-4 w-4" /> Request Sent
                </Button>
              )}
              {user.friendshipStatus === "pending_received" && (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleAcceptRequest(user.id)}
                    disabled={isAccepting}
                  >
                    <UserCheck className="mr-2 h-4 w-4" /> Accept
                    {isAccepting && (
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeclineRequest(user.id)}
                    disabled={isRemovingOrCancelling}
                  >
                    <XCircle className="mr-2 h-4 w-4" /> Decline
                    {isRemovingOrCancelling && (
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    )}
                  </Button>
                </>
              )}
              {user.friendshipStatus === "friends" && (
                <Button variant="outline" size="sm" disabled>
                  <CheckCircle className="mr-2 h-4 w-4" /> Friends
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  };

  if (friendshipsError) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h1 className="text-xl font-semibold text-destructive">
          Error Loading Friendships
        </h1>
        <p className="text-muted-foreground mb-4">{friendshipsError.message}</p>
        <Button
          onClick={() =>
            queryClient.refetchQueries({
              queryKey: ["friendships", currentUserId],
            })
          }
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 py-6 md:px-4 md:py-12">
      <CardHeader className="px-2 md:px-4">
        <CardTitle className="text-2xl md:text-3xl font-bold text-center mb-6 md:mb-10">
          Manage Friends
        </CardTitle>
      </CardHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="friends">
            <Users className="mr-2 h-4 w-4 inline-block md:hidden" />
            <span className="hidden md:inline-block">Friends</span> (
            {currentFriends.length})
          </TabsTrigger>
          <TabsTrigger value="sent">
            <UserCheck className="mr-2 h-4 w-4 inline-block md:hidden" />
            <span className="hidden md:inline-block">Sent Requests</span> (
            {sentRequests.length})
          </TabsTrigger>
          <TabsTrigger value="received">
            <UserX className="mr-2 h-4 w-4 inline-block md:hidden" />
            <span className="hidden md:inline-block">Received Requests</span> (
            {receivedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="add">
            <UserPlus className="mr-2 h-4 w-4 inline-block md:hidden" />
            <span className="hidden md:inline-block">Add Friends</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="friends">
          <Card>
            <CardHeader>
              <CardTitle>Current Friends</CardTitle>
            </CardHeader>
            <CardContent>
              {renderFriendList(currentFriends, "friends")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sent">
          <Card>
            <CardHeader>
              <CardTitle>Sent Requests</CardTitle>
            </CardHeader>
            <CardContent>{renderFriendList(sentRequests, "sent")}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="received">
          <Card>
            <CardHeader>
              <CardTitle>Received Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {renderFriendList(receivedRequests, "received")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle>Add Friends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="Search by username..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSearch();
                        }
                      }}
                      className="pl-10"
                    />
                  </div>
                  <Button
                    onClick={handleSearch}
                    disabled={isSearching || !searchQuery.trim()}
                  >
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    Search
                  </Button>
                </div>
                {renderSearchResults()}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
