import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Chat from "../models/chat.model.js";

import cloudinary from "../lib/cloudinary.js";
import { io, getReceiverSocketId } from "../lib/socket.js";
import redisClient from "../lib/redisClient.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({
      _id: { $ne: loggedInUserId },
    }).select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: chatId } = req.params;
    const myId = req.user._id;

    // Verify user is participant in this chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    const isParticipant = chat.participants.some(
      (p) => p.userId.toString() === myId.toString()
    );

    if (!isParticipant) {
      return res
        .status(403)
        .json({ error: "Not authorized to view this chat" });
    }

    const messages = await Message.find({ chatId })
      .populate("senderId", "fullName profilePic")
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, file } = req.body;
    const { id: chatId } = req.params;
    const senderId = req.user._id;

    // Verify chat exists and user is participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    const isParticipant = chat.participants.some(
      (p) => p.userId.toString() === senderId.toString()
    );

    if (!isParticipant) {
      return res
        .status(403)
        .json({ error: "Not authorized to send messages to this chat" });
    }

    let imageUrl;
    let fileData;

    // Handle image upload (legacy Cloudinary support)
    if (image) {
      // Upload base64 image to cloudinary
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    // Handle file attachment (S3 or Cloudinary)
    if (file && file.url) {
      fileData = {
        url: file.url,
        name: file.name,
        size: file.size,
        type: file.type,
        storage: file.storage || "s3",
      };
    }

    // Determine recipients (all participants except sender)
    const recipients = chat.participants
      .map((p) => p.userId.toString())
      .filter((id) => id !== senderId.toString());

    // Initialize delivery status for each recipient
    const deliveryStatus = recipients.map((recipientId) => ({
      userId: recipientId,
      status: "sent",
    }));

    const newMessage = new Message({
      chatId,
      senderId,
      text,
      image: imageUrl,
      file: fileData,
      status: "sent",
      deliveryStatus,
    });

    await newMessage.save();

    // Publish message event to Redis Stream for analytics pipeline
    try {
      await redisClient.addToStream("chat:messages", {
        messageId: newMessage._id.toString(),
        chatId: chatId.toString(),
        senderId: senderId.toString(),
        timestamp: new Date().toISOString(),
        hasImage: imageUrl ? "true" : "false",
        hasFile: fileData ? "true" : "false",
        fileType: fileData?.type || "none",
      });
    } catch (streamError) {
      console.error("Failed to publish to Redis Stream:", streamError);
      // Don't fail the request if stream publish fails
    }

    // Update chat's lastMessage
    chat.lastMessage = newMessage._id;
    chat.updatedAt = new Date();
    await chat.save();

    // Populate sender info before emitting
    await newMessage.populate("senderId", "fullName profilePic");

    // Emit to recipients and collect online recipient IDs
    const onlineRecipientIds = [];

    for (const recipientId of recipients) {
      const recipientSocketId = await getReceiverSocketId(recipientId);

      if (recipientSocketId) {
        // Recipient is online - emit message
        io.to(recipientSocketId).emit("newMessage", newMessage);
        onlineRecipientIds.push(recipientId);
      }
      // If offline, status remains "sent" - will be delivered on reconnect
    }

    // Batch update delivery status for all online recipients (single DB operation)
    if (onlineRecipientIds.length > 0) {
      const deliveredAt = new Date();
      await Message.updateOne(
        { _id: newMessage._id },
        {
          $set: {
            status: "delivered",
            "deliveryStatus.$[elem].status": "delivered",
            "deliveryStatus.$[elem].deliveredAt": deliveredAt,
          },
        },
        {
          arrayFilters: [{ "elem.userId": { $in: onlineRecipientIds } }],
        }
      );

      // Update the in-memory object for response
      newMessage.status = "delivered";
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    if (!emoji) {
      return res.status(400).json({ error: "Emoji is required" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check if user already reacted with this emoji (toggle or replace?)
    // Let's implement toggle logic: if exists, remove it. If not, add it.
    // Or just "add unique".
    // Most apps allow multiple reactions but usually one per emoji type per user.
    // Let's assume one reaction per user per emoji?
    // Or simpler: remove ANY existing reaction from this user and add new one (like Facebook)?
    // Or Slack style: multiple reactions.
    // Let's go with: User can toggle specific emoji.

    const existingReactionIndex = message.reactions.findIndex(
      (r) => r.userId.toString() === userId.toString() && r.emoji === emoji
    );

    if (existingReactionIndex > -1) {
      // Remove reaction
      message.reactions.splice(existingReactionIndex, 1);
    } else {
      // Add reaction
      message.reactions.push({ userId, emoji });
    }

    await message.save();

    // Populate user details for reactions
    const updatedMessage = await Message.findById(messageId)
      .populate("senderId", "fullName profilePic")
      .populate("reactions.userId", "fullName profilePic");

    // Emit socket event
    const socketId = getReceiverSocketId(userId); // Not needed for broadcast
    // Broadcast to chat room
    io.to(`chat:${message.chatId}`).emit("messageReaction", updatedMessage);

    res.status(200).json(updatedMessage);
  } catch (error) {
    console.error("Error in addReaction: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Not authorized to delete this message" });
    }

    await Message.findByIdAndDelete(messageId);

    // Broadcast delete event
    io.to(`chat:${message.chatId}`).emit("messageDeleted", messageId);

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Error in deleteMessage: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Not authorized to edit this message" });
    }

    const updatedMessage = await Message.findByIdAndUpdate(
      messageId,
      { text, isEdited: true },
      { new: true }
    )
      .populate("senderId", "fullName profilePic")
      .populate("reactions.userId", "fullName profilePic");

    // Broadcast update event
    io.to(`chat:${message.chatId}`).emit("messageUpdated", updatedMessage);

    res.status(200).json(updatedMessage);
  } catch (error) {
    console.error("Error in editMessage: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
