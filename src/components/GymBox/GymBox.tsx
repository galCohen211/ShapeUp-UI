import React, { useState, useEffect } from "react";
import { Button, Popconfirm, Modal, Input, List, notification, Spin } from "antd";
import { EditOutlined, DeleteOutlined, MessageOutlined } from '@ant-design/icons';
import { io, Socket } from "socket.io-client";
import { askPricingSuggestion } from "../../api/chat-ai";
import './GymBox.less';

interface GymBoxProps {
  gymName: string;
  city: string;
  ownerId: string;
  prices: number[];
  onEdit: () => void;
  onDelete: () => void;
}

const CHAT_SERVER_URL = "http://localhost:3002";
const PATH = "/users-chat";

const socket: Socket = io(CHAT_SERVER_URL, {
  path: PATH,
  transports: ["websocket", "polling"],
});

const GymBox: React.FC<GymBoxProps> = ({
  gymName: initialGymName,
  city,
  ownerId,
  prices,
  onEdit,
  onDelete,
}) => {
  const [gymName, setGymName] = useState(initialGymName);
  const [isChatModalVisible, setChatModalVisible] = useState(false);
  const [chatUsers, setChatUsers] = useState<{ userId: string; firstName: string; lastName: string }[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ userId: string; firstName: string; lastName: string } | null>(null);
  const [messages, setMessages] = useState<{ sender: string; text: string; timestamp: number }[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [prevGymName, setPrevGymName] = useState(initialGymName);
  const [isSuggestModalVisible, setSuggestModalVisible] = useState(false);
  const [suggestedPricing, setSuggestedPricing] = useState<string | null>(null);


  useEffect(() => {
    if (initialGymName !== prevGymName) {
      setGymName(initialGymName);
      setForceUpdate(prev => prev + 1);
    }
  }, [initialGymName]);

  useEffect(() => {
    const handleIncomingMessage = (message: any) => {
      if (!selectedUser || !message) return;
      if (
        message.sender !== selectedUser.userId &&
        message.sender !== ownerId
      ) {
        return;
      }

      message.timestamp = message.timestamp || Date.now();

      setMessages((prevMessages) => {
        const exists = prevMessages.some((msg) => msg.timestamp === message.timestamp);
        return exists ? prevMessages : [...prevMessages, message];
      });
      setTimeout(() => {
        const chatContainer = document.querySelector(".chat-messages-container");
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 100);
    };

    socket.on("message", handleIncomingMessage);
    socket.on("update_messages", handleIncomingMessage);

    return () => {
      socket.off("message", handleIncomingMessage);
      socket.off("update_messages", handleIncomingMessage);
    };
  }, [selectedUser]);


  const fetchChatUsers = () => {
    socket.emit("get_gym_chats", ownerId, gymName, (chatData: any) => {
      if (chatData) {
        const uniqueUsers = Array.from(
          new Map(chatData.map((user: any) => [user.userId, user])).values()
        );
        setChatUsers(uniqueUsers.map((user: any) => ({
          userId: user.userId,
          firstName: user.firstName,
          lastName: user.lastName
        })));
      } else {
        notification.error({ message: "Failed to load chat users." });
      }
    });
  };

  const fetchChatHistory = (userId: string) => {
    setIsLoading(true);

    socket.emit("get_users_chat", ownerId, userId, gymName, (chatHistory: any) => {
      setIsLoading(false);

      if (!chatHistory || !chatHistory.messages) {
        setMessages([]);
        return;
      }

      setMessages(chatHistory.messages.map((msg: any) => ({
        sender: msg.sender.toString(),
        text: msg.text,
        timestamp: msg.timestamp || Date.now()
      })));
    });
  };

  const openChatModal = () => {
    setChatModalVisible(true);
    setSelectedUser(null);
    setMessages([]);
    fetchChatUsers();

    socket.emit("add_user", ownerId);
  };

  const selectUser = (user: { userId: string; firstName: string; lastName: string }) => {
    setSelectedUser(user);
    setIsLoading(true);
    fetchChatHistory(user.userId);
  };
  
  const openSuggestModal = async () => {
    setSuggestedPricing(null);
    setSuggestModalVisible(true);
    try {
      const suggestion = await askPricingSuggestion(ownerId, prices);
      console.log("###############");
      console.log(suggestion);
      console.log("###############");
      setSuggestedPricing(suggestion);
    } catch (err) {
      setSuggestedPricing("Could not fetch suggestion.");
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedUser) return;

    socket.emit("communicate", ownerId, selectedUser.userId, gymName, newMessage);
    setNewMessage("");
  };

  return (
    <div className="gym-box">
      <div className="gym-box-header">
        <h4>{gymName}</h4>
        <div className="gym-box-icons">
          <EditOutlined onClick={onEdit} className="gym-box-icon" />

          <Popconfirm
            title="Are you sure you want to delete this gym?"
            onConfirm={onDelete}
            okText="Yes"
            cancelText="No"
          >
            <DeleteOutlined className="gym-box-icon" />
          </Popconfirm>
        </div>
      </div>
      <p>{city}</p>
      <Button type="primary" className="gym-box-button" icon={<MessageOutlined />} onClick={openChatModal}>
        Chat with Users
      </Button>
      <Button onClick={openSuggestModal} style={{ marginTop: 8 }} block>
        Suggest Pricing Using AI
      </Button>
      <Modal
        title={selectedUser ? `Chat with ${selectedUser.firstName} ${selectedUser.lastName}` : "Chat with Users"}
        open={isChatModalVisible}
        onCancel={() => setChatModalVisible(false)}
        footer={null}
        className="chat-modal"
      >
        {!selectedUser ? (
          <List
            bordered
            dataSource={chatUsers}
            renderItem={(user) => (
              <List.Item onClick={() => selectUser(user)} style={{ cursor: "pointer" }}>
                {user.firstName} {user.lastName}
              </List.Item>
            )}
            locale={{ emptyText: "No Active Chats" }}
          />
        ) : (
          <>
            <Button type="default" onClick={() => setSelectedUser(null)} className="back-button">
              Back to User List
            </Button>

            {/* Chat Messages Section */}
            <div className="chat-messages-container">
              {messages.map((msg, index) => (
                <div key={index} className={`chat-message ${msg.sender === ownerId ? "user-message" : "owner-message"}`}>
                  {msg.text}
                </div>
              ))}
            </div>

            {/* Chat Input Section */}
            <div className="chat-input-container">
              <Input.TextArea
                rows={2}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
              />
              <Button type="primary" onClick={sendMessage} block>Send</Button>
            </div>
          </>
        )}
      </Modal>
      <Modal
        title="AI-Powered Pricing Suggestion"
        open={isSuggestModalVisible}
        onCancel={() => setSuggestModalVisible(false)}
        footer={null}
      >
        {suggestedPricing ? (
          <p>{suggestedPricing}</p>
        ) : (
          <div style={{ textAlign: "center" }}>
            <Spin />
            <p>Fetching suggestion...</p>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default GymBox;
