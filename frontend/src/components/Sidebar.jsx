import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, MessageCircle, UsersRound, Plus } from "lucide-react";
import CreateGroupModal from "./CreateGroupModal";

const Sidebar = () => {
  const {
    getChats,
    getUsers,
    chats,
    selectedChat,
    setSelectedChat,
    isChatsLoading,
    unreadCounts,
  } = useChatStore();

  const { onlineUsers, authUser } = useAuthStore();
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  useEffect(() => {
    getChats();
    getUsers(); // Load users for group creation
  }, [getChats, getUsers]);

  // Helper to get chat display info
  const getChatDisplayInfo = (chat) => {
    if (chat.type === "group") {
      return {
        name: chat.name,
        picture: chat.groupPicture || "/avatar.png",
        isOnline: false,
        memberCount: chat.participants.length,
      };
    } else {
      // DM chat - find the other user
      const otherUser = chat.participants.find(
        (p) => p.userId._id !== authUser._id
      )?.userId;

      return {
        name: otherUser?.fullName || "Unknown User",
        picture: otherUser?.profilePic || "/avatar.png",
        isOnline: otherUser ? onlineUsers.includes(otherUser._id) : false,
        userId: otherUser?._id,
      };
    }
  };

  const [searchQuery, setSearchQuery] = useState("");

  const filteredChats = chats.filter((chat) => {
    if (!searchQuery) return true;
    const info = getChatDisplayInfo(chat);
    return info.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const { users } = useChatStore();
  const filteredUsers = users.filter((user) => {
    if (!searchQuery) return false;
    // Exclude self and users we already have a DM with
    if (user._id === authUser._id) return false;
    const hasDM = chats.find(c => c.type === "dm" && c.participants.some(p => p.userId._id === user._id));
    if (hasDM) return false; // Already shown in filteredChats

    return (
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  if (isChatsLoading) return <SidebarSkeleton />;

  return (
    <>
      <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
        <div className="border-b border-base-300 w-full p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="size-6" />
              <span className="font-medium hidden lg:block">Chats</span>
            </div>
            <button
              onClick={() => setIsCreateGroupOpen(true)}
              className="btn btn-sm btn-circle btn-ghost"
              title="Create Group"
            >
              <Plus className="size-5" />
            </button>
          </div>

          {/* Search Input */}
          <div className="hidden lg:block">
            <label className="input input-bordered flex items-center gap-2 input-sm">
              <input
                type="text"
                className="grow"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 opacity-70"><path fillRule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clipRule="evenodd" /></svg>
            </label>
          </div>
        </div>

        <div className="overflow-y-auto w-full py-3">
          {filteredChats.map((chat) => {
            const displayInfo = getChatDisplayInfo(chat);
            const unreadCount = unreadCounts[chat._id] || 0;

            return (
              <button
                key={chat._id}
                onClick={() => setSelectedChat(chat)}
                className={`
                  w-full p-3 flex items-center gap-3
                  hover:bg-base-300 transition-colors relative
                  ${selectedChat?._id === chat._id
                    ? "bg-base-300 ring-1 ring-base-300"
                    : ""
                  }
                `}
              >
                <div className="relative mx-auto lg:mx-0">
                  <img
                    src={displayInfo.picture}
                    alt={displayInfo.name}
                    className="size-12 object-cover rounded-full"
                  />
                  {chat.type === "group" && (
                    <span
                      className="absolute bottom-0 right-0 size-5 bg-primary 
                      rounded-full ring-2 ring-zinc-900 flex items-center justify-center"
                    >
                      <Users className="size-3 text-primary-content" />
                    </span>
                  )}
                  {chat.type === "dm" && displayInfo.isOnline && (
                    <span
                      className="absolute bottom-0 right-0 size-3 bg-green-500 
                      rounded-full ring-2 ring-zinc-900"
                    />
                  )}
                </div>

                {/* Chat info - only visible on larger screens */}
                <div className="hidden lg:block text-left min-w-0 flex-1">
                  <div className="font-medium truncate">{displayInfo.name}</div>
                  <div className="text-sm text-zinc-400 truncate">
                    {chat.type === "group"
                      ? `${displayInfo.memberCount} members`
                      : displayInfo.isOnline
                        ? "Online"
                        : "Offline"}
                  </div>
                </div>

                {/* Unread count badge */}
                {unreadCount > 0 && (
                  <div className="absolute top-2 right-2 lg:relative lg:top-0 lg:right-0">
                    <span className="bg-primary text-primary-content text-xs font-bold px-2 py-1 rounded-full min-w-5 flex items-center justify-center">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  </div>
                )}
              </button>
            );
          })}

          {/* New User Search Results */}
          {filteredUsers.length > 0 && (
            <>
              <div className="px-5 py-2 text-xs font-bold text-zinc-500 uppercase">New Users</div>
              {filteredUsers.map(user => (
                <button
                  key={user._id}
                  onClick={() => {
                    useChatStore.getState().getOrCreateDMChat(user._id);
                    setSearchQuery(""); // Clear search
                  }}
                  className="w-full p-3 flex items-center gap-3 hover:bg-base-300 transition-colors"
                >
                  <div className="relative mx-auto lg:mx-0">
                    <img
                      src={user.profilePic || "/avatar.png"}
                      alt={user.fullName}
                      className="size-12 object-cover rounded-full"
                    />
                    {onlineUsers.includes(user._id) && (
                      <span className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-zinc-900" />
                    )}
                  </div>
                  <div className="hidden lg:block text-left min-w-0 flex-1">
                    <div className="font-medium truncate">{user.fullName}</div>
                    <div className="text-sm text-zinc-400 truncate">Click to start chat</div>
                  </div>
                </button>
              ))}
            </>
          )}

          {filteredChats.length === 0 && filteredUsers.length === 0 && (
            <div className="text-center text-zinc-500 py-4">
              {searchQuery ? "No matches found" : "No chats yet"}
            </div>
          )}
        </div>
      </aside>

      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
      />
    </>
  );
};
export default Sidebar;
