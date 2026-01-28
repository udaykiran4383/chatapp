import { FileText, Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { formatMessageTime } from "../lib/utils";
import { Check, CheckCheck, Smile, MoreVertical, Edit2, Trash2 } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const ChatContainer = () => {
  const [activeReactionId, setActiveReactionId] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState("");

  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedChat,
    subscribeToMessages,
    unsubscribeFromMessages,
    typingUsers,
    reactToMessage,
    deleteMessage,
    editMessage,
  } = useChatStore();
  const { authUser, socket } = useAuthStore();
  const messageEndRef = useRef(null);

  // Helper function to extract file key from S3 URL
  const extractFileKey = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.substring(1); // Remove leading slash
    } catch (error) {
      console.error("Error extracting file key:", error);
      return null;
    }
  };

  // Helper function to handle file download
  const handleDownload = async (fileUrl, fileName) => {
    try {
      toast.loading("Generating download link...", { id: "download" });

      // Extract file key from URL
      const fileKey = extractFileKey(fileUrl);
      if (!fileKey) {
        throw new Error("Invalid file URL");
      }

      // Get presigned download URL from backend (pass filename to force download name)
      const response = await axiosInstance.get(
        `/files/download/${encodeURIComponent(
          fileKey
        )}?fileName=${encodeURIComponent(fileName || "")}`
      );
      const { downloadUrl } = response.data;

      // Download file using presigned URL
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Download started", { id: "download" });
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Failed to download file", { id: "download" });
    }
  };

  useEffect(() => {
    if (!selectedChat) return;

    getMessages(selectedChat._id);
    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [
    selectedChat?._id,
    getMessages,
    subscribeToMessages,
    unsubscribeFromMessages,
  ]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }

    // Mark messages as seen when viewing them
    if (messages.length > 0 && selectedChat && socket) {
      const unseenMessages = messages.filter(
        (msg) => msg.senderId._id !== authUser._id && msg.status !== "seen"
      );

      unseenMessages.forEach((msg) => {
        socket.emit("messageSeen", {
          messageId: msg._id,
          chatId: selectedChat._id,
        });
      });
    }
  }, [messages, selectedChat, socket, authUser]);

  // Helper to render message status icon
  const renderMessageStatus = (message) => {
    if (!message.status) return null;

    switch (message.status) {
      case "sent":
        return <Check size={14} className="inline ml-1 opacity-50" />;
      case "delivered":
        return <CheckCheck size={14} className="inline ml-1 opacity-50" />;
      case "seen":
        return <CheckCheck size={14} className="inline ml-1 text-blue-500" />;
      default:
        return null;
    }
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isSentByMe = message.senderId._id === authUser._id;

          return (
            <div
              key={message._id}
              className={`chat ${isSentByMe ? "chat-end" : "chat-start"} group relative`}
              ref={messageEndRef}
            >
              <div className="chat-image avatar">
                <div className="size-10 rounded-full border">
                  <img
                    src={message.senderId.profilePic || "/avatar.png"}
                    alt="profile pic"
                  />
                </div>
              </div>
              <div className="chat-header mb-1">
                {selectedChat.type === "group" && !isSentByMe && (
                  <span className="text-sm font-medium mr-2">
                    {message.senderId.fullName}
                  </span>
                )}
                <time className="text-xs opacity-50 ml-1">
                  {formatMessageTime(message.createdAt)}
                </time>
                {isSentByMe && renderMessageStatus(message)}
              </div>
              <div className="chat-bubble flex flex-col">
                {message.image && (
                  <img
                    src={message.image}
                    alt="Attachment"
                    className="sm:max-w-[200px] rounded-md mb-2"
                  />
                )}
                {message.file && message.file.url && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-base-200 mb-2">
                    <FileText size={24} className="text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {message.file.name}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {(message.file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        handleDownload(message.file.url, message.file.name)
                      }
                      className="btn btn-circle btn-sm"
                      title="Download"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                )}
                {message.text && (
                  <p>
                    {message.text}
                    {message.isEdited && <span className="text-[10px] text-zinc-500 ml-1 italic">(edited)</span>}
                  </p>
                )}

                {/* Reactions Display */}
                {message.reactions && message.reactions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 -ml-1">
                    {Object.entries(
                      message.reactions.reduce((acc, r) => {
                        acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                        return acc;
                      }, {})
                    ).map(([emoji, count]) => (
                      <div key={emoji} className="badge badge-sm badge-ghost gap-1 cursor-pointer"
                        onClick={() => reactToMessage(message._id, emoji)}>
                        <span>{emoji}</span>
                        <span className="text-[10px]">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reaction Button */}
              <div className="chat-footer opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1">
                <button
                  className="btn btn-ghost btn-xs btn-circle"
                  onClick={() => setActiveReactionId(activeReactionId === message._id ? null : message._id)}
                >
                  <Smile size={14} />
                </button>

                {/* Edit/Delete for own messages */}
                {isSentByMe && (
                  <div className="dropdown dropdown-top dropdown-end">
                    <div tabIndex={0} role="button" className="btn btn-ghost btn-xs btn-circle">
                      <MoreVertical size={14} />
                    </div>
                    <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-24 border border-base-300">
                      <li>
                        <button onClick={() => {
                          setEditingMessageId(message._id);
                          setEditText(message.text || "");
                        }} className="text-xs">
                          <Edit2 size={12} /> Edit
                        </button>
                      </li>
                      <li>
                        <button onClick={() => deleteMessage(message._id)} className="text-xs text-error">
                          <Trash2 size={12} /> Delete
                        </button>
                      </li>
                    </ul>
                  </div>
                )}

                {/* Reaction Picker Popup */}
                {activeReactionId === message._id && (
                  <div className="absolute bottom-8 left-0 z-10 bg-base-100 p-1 rounded-full shadow-lg border border-base-300 flex gap-1 animate-in zoom-in duration-200">
                    {["👍", "❤️", "😂", "😮", "😢", "😡"].map(emoji => (
                      <button
                        key={emoji}
                        className="btn btn-ghost btn-xs btn-circle text-lg"
                        onClick={() => {
                          reactToMessage(message._id, emoji);
                          setActiveReactionId(null);
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Message Modal */}
      {editingMessageId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-base-100 p-6 rounded-lg w-full max-w-md">
            <h3 className="font-bold text-lg mb-4">Edit Message</h3>
            <textarea
              className="textarea textarea-bordered w-full"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
            />
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={() => setEditingMessageId(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => {
                editMessage(editingMessageId, editText);
                setEditingMessageId(null);
              }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 pb-2 text-sm text-zinc-500 italic animate-pulse">
          {typingUsers.length === 1 ? "Someone is typing..." : "Multiple people are typing..."}
        </div>
      )}

      <MessageInput />
    </div>
  );
};
export default ChatContainer;
