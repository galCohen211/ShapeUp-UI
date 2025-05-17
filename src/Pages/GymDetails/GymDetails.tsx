import {
  ClockCircleOutlined,
  DollarOutlined,
  EditOutlined,
  MessageOutlined,
  OpenAIOutlined,
  UnorderedListOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import {
  AutoComplete,
  Button,
  Input,
  List,
  Modal,
  notification,
  Pagination,
  Spin,
} from "antd";
import axios from "axios";
import {
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Bar,
  BarChart,
} from "recharts";
import dayjs from "dayjs";
import React, { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getPurchasedUsersForGym, updateGymById } from "../../api/gym-owner";
import "./GymDetails.less";

import { useParams } from "react-router-dom";
import { askPricingSuggestion } from "../../api/chat-ai";
import { getGymById } from "../../api/gyms";

const CHAT_SERVER_URL = "http://localhost:3002";
const PATH = "/users-chat";

const socket: Socket = io(CHAT_SERVER_URL, {
  path: PATH,
  transports: ["websocket", "polling"],
});

const defaultHours = {
  sundayToThursday: { from: "", to: "" },
  friday: { from: "", to: "" },
  saturday: { from: "", to: "" },
};

type DailyHours = {
  from: string;
  to: string;
};

type OpeningHours = {
  sundayToThursday: DailyHours;
  friday: DailyHours;
  saturday: DailyHours;
};

interface GymData {
  name: string;
  city: string;
  description: string;
  prices: number[];
  owner: string;
  pictures: string[];
  _id: string;
  openingHours: OpeningHours;
}

const Dashboard: React.FC = () => {
  const { gymId } = useParams<{ gymId: string }>();
  const [isEditGymModalVisible, setIsEditGymModalVisible] = useState(false);
  const [gymData, setGymData] = useState<GymData | null>(null);
  const [editedGymData, setEditedGymData] = useState<GymData | null>(null);
  const [gymDataLoading, setGymDataLoading] = useState<boolean>(true);
  const [gymImages, setGymImages] = useState<any[]>([]);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [allCities, setAllCities] = useState<string[]>([]);
  const [isHoursModalVisible, setIsHoursModalVisible] = useState(false);
  const [hours, setHours] = useState(defaultHours);
  const [isPriceModalVisible, setIsPriceModalVisible] = useState(false);
  const [isSuggestModalVisible, setSuggestModalVisible] = useState(false);
  const [suggestedPricing, setSuggestedPricing] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});


  const [purchasedUsers, setPurchasedUsers] = useState<any[]>([]);
  const [isTraineesModalVisible, setTraineesModalVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(5);
  const paginatedUsers = purchasedUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const [isChatModalVisible, setChatModalVisible] = useState(false);
  const [chatUsers, setChatUsers] = useState<
    { userId: string; firstName: string; lastName: string }[]
  >([]);
  const [selectedUser, setSelectedUser] = useState<{
    userId: string;
    firstName: string;
    lastName: string;
  } | null>(null);
  const [messages, setMessages] = useState<
    { sender: string; text: string; timestamp: number }[]
  >([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [purchaseData, setPurchaseData] = useState<{ date: string; count: number; revenue: number }[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await axios.get(
          `http://localhost:3000/purchase/getGymPurchases/${gymId}`, {
          withCredentials: true,
        }
        );

        const purchases = data.filteredPurchases;

        const today = dayjs();
        const past7Days = Array.from({ length: 7 }).map((_, i) =>
          today.subtract(6 - i, "day").format("YYYY-MM-DD")
        );

        // Initialize counters
        const summary: Record<string, { count: number; revenue: number }> = past7Days.reduce(
          (acc, date) => {
            acc[date] = { count: 0, revenue: 0 };
            return acc;
          },
          {} as Record<string, { count: number; revenue: number }>
        );

        purchases.forEach((purchase: any) => {
          const date = dayjs(purchase.purchaseDate).format("YYYY-MM-DD");
          if (summary[date]) {
            summary[date].count++;
            summary[date].revenue += purchase.price;
          }
        });

        const formattedData = past7Days.map((date) => ({
          date,
          count: summary[date].count,
          revenue: summary[date].revenue,
        }));

        setPurchaseData(formattedData);
      } catch (err) {
        console.error("Error fetching data", err);
      }
    };

    fetchData();
  }, [gymId]);

  useEffect(() => {
    if (!gymId) {
      notification.error({ message: "Invalid Gym ID" });
      return;
    }

    const fetchGym = async () => {
      setGymDataLoading(true);
      const gymData = await getGymById(gymId);
      setGymData(gymData);
      setGymImages(gymData.pictures || []);
      setHours(gymData.openingHours || defaultHours);
      setGymDataLoading(false);
    };

    fetchGym();
  }, [gymId]);

  useEffect(() => {
    fetchAllCities();
  }, []);

  useEffect(() => {
    const handleIncomingMessage = (message: any) => {
      if (!message) return;

      const isMessageRelevant =
        message.sender === selectedUser?.userId || message.sender === gymData?.owner;

      if (isMessageRelevant && selectedUser) {
        // Show message in chat
        message.timestamp = message.timestamp || Date.now();
        setMessages((prevMessages) => {
          const exists = prevMessages.some(
            (msg) => msg.timestamp === message.timestamp
          );
          return exists ? prevMessages : [...prevMessages, message];
        });

        setTimeout(() => {
          const chatContainer = document.querySelector(".chat-messages-container");
          if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
          }
        }, 100);
      } else {
        // Increment unread for other users
        const senderId = message.sender;
        setUnreadCounts((prev) => ({
          ...prev,
          [senderId]: (prev[senderId] || 0) + 1,
        }));
      }
    };

    socket.on("message", handleIncomingMessage);
    socket.on("update_messages", handleIncomingMessage);

    return () => {
      socket.off("message", handleIncomingMessage);
      socket.off("update_messages", handleIncomingMessage);
    };
  }, [selectedUser, gymData?.owner]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);

      if (gymImages.length + filesArray.length > 5) {
        notification.warning({
          message: "Image Upload Limit",
          description: "You can upload up to 5 images only.",
          placement: "top",
          duration: 3,
        });
        return;
      }
      setGymImages((prevImages) => [...prevImages, ...filesArray]);
    }
  };

  const fetchAllCities = async () => {
    try {
      const response = await fetch(
        "https://data.gov.il/api/3/action/datastore_search?resource_id=d4901968-dad3-4845-a9b0-a57d027f11ab&limit=3200"
      );
      const json = await response.json();

      const cities = json.result.records
        .map((r: any) => r["שם_ישוב_לועזי"])
        .filter((name: string | undefined) => !!name && name.trim() !== "")
        .map((name: string) =>
          name
            .trim()
            .replace(/-/g, " ")
            .replace(/\s+/g, " ")
            .split(" ")
            .map(
              (word) =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            )
            .join(" ")
        );

      const uniqueCities: string[] = Array.from(new Set(cities));
      setAllCities(uniqueCities);
    } catch (err) {
      console.error("Failed to load cities:", err);
    }
  };

  const handleCitySearch = (input: string) => {
    if (!input || input.length < 1) {
      setCityOptions([]);
      return;
    }

    const filtered = allCities.filter((city) =>
      city.toLowerCase().includes(input.toLowerCase())
    );

    setCityOptions(filtered.slice(0, 20));
  };

  const handleRemoveImage = (imageIndexToDelete: number) => {
    setGymImages(
      gymImages.filter((_, currentIndex) => currentIndex !== imageIndexToDelete)
    );
  };

  const openSuggestModal = async () => {
    setSuggestedPricing(null);
    setSuggestModalVisible(true);
    if (!gymData) return;
    if (!gymData.owner) {
      notification.error({
        message: "Owner Not Found",
        description: "This gym does not have an owner.",
        placement: "top",
      });
      return;
    }

    try {
      const suggestion = await askPricingSuggestion(
        gymData?.owner,
        gymData?.prices
      );
      setSuggestedPricing(suggestion);
    } catch (err) {
      setSuggestedPricing("Could not fetch suggestion.");
    }
  };

  const handleOpenPriceModal = () => {
    setEditedGymData(gymData);
    setIsPriceModalVisible(true);
  };

  const handleClosePriceModal = () => {
    setIsPriceModalVisible(false);
    setEditedGymData(null);
  };

  const handleOpenHoursModal = () => {
    setEditedGymData(gymData);
    setIsHoursModalVisible(true);
    setHours(gymData?.openingHours || defaultHours);
  };

  const handleCloseHoursModal = () => {
    setIsHoursModalVisible(false);
    setEditedGymData(null);
    setHours(gymData?.openingHours || defaultHours);
  };

  const onUpdateOpeningHours = (updatedHours: OpeningHours) => {
    try {
      if (!gymId) {
        notification.error({ message: "Invalid Gym ID" });
        return;
      }
      if (!updatedHours) {
        notification.error({ message: "Invalid Opening Hours" });
        return;
      }

      const formData = new FormData();
      formData.append("openingHours", JSON.stringify(updatedHours));
      submitGymUpdate(formData, gymId);
      handleCloseHoursModal();
    } catch (err) {
      notification.error({ message: "Failed to update prices" });
    }
  };

  const handleCloseEditGymModal = () => {
    setIsEditGymModalVisible(false);
  };

  const handleEditedGymDataChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (editedGymData === null) return;
    setEditedGymData({ ...editedGymData, [e.target.name]: e.target.value });
  };

  const handleUpdateGym = async () => {
    if (!editedGymData) return;

    const formData = new FormData();

    formData.append("name", editedGymData.name);
    formData.append("city", editedGymData.city);
    formData.append("description", editedGymData.description);

    if (gymImages.length === 0) {
      notification.warning({
        message: "Image Upload Minimum",
        description: "At least one picture is required",
        placement: "top",
        duration: 3,
      });
      handleCloseEditGymModal();
      return;
    }

    gymImages.forEach((image) => {
      formData.append("pictures[]", image);
    });

    try {
      if (!gymId) throw new Error("No gym selected for update");
      await submitGymUpdate(formData, gymId);
      handleCloseEditGymModal();
    } catch (error) {
      console.error("Error updating gym:", error);
    }
  };

  const handleEditClick = () => {
    if (!gymData) return;
    setEditedGymData(JSON.parse(JSON.stringify(gymData)));
    setGymImages(gymData.pictures || []);
    setIsEditGymModalVisible(true);
  };

  const fetchChatUsers = () => {
    socket.emit("get_gym_chats", gymData?.owner, gymData?.name, (chatData: any) => {
      if (chatData) {
        const uniqueUsers = Array.from(
          new Map(chatData.map((user: any) => [user.userId, user])).values()
        );

        setChatUsers(uniqueUsers.map((user: any) => ({
          userId: user.userId,
          firstName: user.firstName,
          lastName: user.lastName,
        })));

        // Fetch unread count for each user
        uniqueUsers.forEach((user: any) => {
          socket.emit(
            "get_unread_count",
            gymData?.owner,
            gymData?._id,
            gymData?.name,
            (count: number) => {
              setUnreadCounts(prev => ({ ...prev, [user.userId]: count }));
            }
          );
        });

      } else {
        notification.error({ message: "Failed to load chat users." });
      }
    });
  };

  const selectUser = (user: {
    userId: string;
    firstName: string;
    lastName: string;
  }) => {
    setSelectedUser(user);
    fetchChatHistory(user.userId);

    socket.emit("mark_as_read", gymData?.owner, user.userId, gymData?.name);

    setUnreadCounts((prev) => {
      const updated = { ...prev };
      delete updated[user.userId];
      return updated;
    });
  };

  const fetchChatHistory = (userId: string) => {
    socket.emit(
      "get_users_chat",
      gymData?.owner,
      userId,
      gymData?.name,
      (chatHistory: any) => {
        if (!chatHistory || !chatHistory.messages) {
          setMessages([]);
          return;
        }

        setMessages(
          chatHistory.messages.map((msg: any) => ({
            sender: msg.sender.toString(),
            text: msg.text,
            timestamp: msg.timestamp || Date.now(),
          }))
        );
        setTimeout(() => {
          requestAnimationFrame(() => {
            const container = document.querySelector(".chat-messages-container");
            if (container) {
              container.scrollTop = container.scrollHeight;
            }
          });
        }, 50);

      }
    );
  };

  const openChatModal = () => {
    setChatModalVisible(true);
    setSelectedUser(null);
    setMessages([]);
    fetchChatUsers();

    socket.emit("add_user", gymData?.owner);

    setTimeout(() => {
      requestAnimationFrame(() => {
        const container = document.querySelector(".chat-messages-container");
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      });
    }, 50);
  };


  const sendMessage = () => {
    if (!newMessage.trim() || !selectedUser || !gymData?.owner) return;

    const outgoingMessage = {
      sender: gymData.owner,
      text: newMessage,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, outgoingMessage]);

    socket.emit(
      "communicate",
      gymData.owner,
      selectedUser.userId,
      gymData.name,
      newMessage
    );

    setNewMessage("");

    setTimeout(() => {
      const chatContainer = document.querySelector(".chat-messages-container");
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  };

  const fetchPurchasedUsers = async () => {
    if (!gymId) {
      notification.error({
        message: "Invalid Gym ID",
        description: "Please select a valid gym.",
        placement: "top",
      });
      return;
    }

    try {
      const users = await getPurchasedUsersForGym(gymId);
      setPurchasedUsers(users);
      setTraineesModalVisible(true);
    } catch (err) {
      // notification already handled inside getPurchasedUsersForGym
    }
  };

  const submitGymUpdate = async (formData: FormData, gymId: string) => {
    try {
      const updatedGym = await updateGymById(formData, gymId);

      if (!updatedGym) {
        notification.error({
          message: "Update Failed",
          description: "Failed to update gym data.",
          placement: "top",
        });
        return;
      }

      setGymData(updatedGym);
      setEditedGymData(null);
      setGymImages(updatedGym.pictures || []);
      setHours(updatedGym.openingHours || defaultHours);
    } catch (error) {
      console.error("Gym update error:", error);
      notification.error({
        message: "Update Error",
        description: "An unexpected error occurred while updating the gym.",
        placement: "top",
      });
    }
  };

  if (!gymId) return "No Gym ID provided";
  if (gymDataLoading) return <Spin />;
  if (!gymData) return "Error loading gym data";

  return (
    <div className="container-fluid">
      <div className="gym-details-page">
        <h1>{gymData.name}</h1>
        <h6 style={{ marginTop: "10px", color: "#6c7080" }}>{gymData.city}</h6>
        <p style={{ marginTop: "20px", marginBottom: "50px", color: "#6c7080" }}>{gymData.description}</p>

        <div className="gym-image-grid">
          {gymData.pictures.slice(0, 5).map((img: string, i: number) => (
            <img
              key={i}
              src={img}
              alt={`gym-${i}`}
              onClick={() => setSelectedImage(img)}
              className="clickable-image"
            />
          ))}
        </div>

        {selectedImage && (
          <div className="image-modal" onClick={() => setSelectedImage(null)}>
            <img src={selectedImage} alt="Expanded gym" />
          </div>
        )}

        {/* Action buttons */}
        <div className="gym-actions">
          <Button icon={<EditOutlined />} onClick={handleEditClick}>
            Edit Gym
          </Button>

          <Button icon={<OpenAIOutlined />} onClick={openSuggestModal}>
            Suggest Pricing Using AI
          </Button>

          <Button icon={<MessageOutlined />} onClick={openChatModal}>
            Chat with Users
          </Button>

          <Button icon={<DollarOutlined />} onClick={handleOpenPriceModal}>
            Update Price
          </Button>

          <Button icon={<ClockCircleOutlined />} onClick={handleOpenHoursModal}>
            Update Opening Hours
          </Button>

          <Button
            icon={<UnorderedListOutlined />}
            onClick={fetchPurchasedUsers}
          >
            View Trainees
          </Button>
        </div>

        <div className="chart-container">
          <h3 className="chart-title">Purchases in the Last 7 Days</h3>
          <ResponsiveContainer>
            <BarChart data={purchaseData}>
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fill: "#6b7280", fontSize: 12 }} />
              <Tooltip
                contentStyle={{ borderRadius: 10, fontSize: 13 }}
                formatter={(value) => [`${value}`, "Purchases"]}
              />
              <Bar
                dataKey="count"
                fill="#3b82f6"
                radius={[6, 6, 0, 0]}
                barSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3 className="chart-title">Revenue in the Last 7 Days</h3>
          <ResponsiveContainer>
            <BarChart data={purchaseData}>
              <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 12 }} />
              <YAxis
                tickFormatter={(v) => `${v}$`}
                tick={{ fill: "#6b7280", fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{ borderRadius: 10, fontSize: 13 }}
                formatter={(value) => [`${value}$`, "Revenue"]}
              />
              <Bar
                dataKey="revenue"
                fill="#10b981"
                radius={[6, 6, 0, 0]}
                barSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Price Suggestion Modal */}
        <Modal
          title="AI-Powered Pricing Suggestion"
          open={isSuggestModalVisible}
          onCancel={() => setSuggestModalVisible(false)}
          footer={null}
        >
          <div
            style={{
              padding: "10px 5px",
              fontFamily: "'Segoe UI', sans-serif",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "12px",
              }}
            >
              {/* <img
              src={ChatAILogo}
              alt="ChatGPT"
              style={{ width: "20px", height: "20px" }}
            /> */}
              <span style={{ fontWeight: 600, fontSize: "15px" }}>Chat AI</span>
            </div>

            {suggestedPricing ? (
              <div
                style={{ lineHeight: "1.6", color: "#333", fontSize: "15px" }}
              >
                <p style={{ marginBottom: "12px" }}>
                  {suggestedPricing.split("\n").slice(0, 1)}
                </p>

                <ul style={{ paddingLeft: "20px", marginBottom: "12px" }}>
                  {suggestedPricing.match(/•.*?\$[\d.]+/g)?.map((line, i) => (
                    <li key={i}>{line.replace(/^•\s*/, "")}</li>
                  ))}
                </ul>

                <p>{suggestedPricing.split("\n").slice(-1)}</p>
              </div>
            ) : (
              <div style={{ textAlign: "center" }}>
                <Spin />
                <p>Fetching suggestion...</p>
              </div>
            )}
          </div>
        </Modal>

        {/* Edit Gym Modal */}
        <Modal
          title="Edit Gym"
          open={isEditGymModalVisible}
          onCancel={handleCloseEditGymModal}
          footer={null}
          width={850}
        >
          <div style={{ display: "flex", gap: "20px" }}>
            {/* Left Side - Gym Inputs */}
            <div style={{ flex: "0 0 300px" }}>
              <Input
                name="name"
                placeholder="Name"
                value={editedGymData?.name}
                onChange={handleEditedGymDataChange}
                className="modal-input"
              />
              <AutoComplete
                options={cityOptions.map((city) => ({
                  label: city,
                  value: city,
                }))}
                value={editedGymData?.city}
                onSearch={handleCitySearch}
                onSelect={(value) =>
                  setEditedGymData((prev) => {
                    if (!prev) return prev;
                    return { ...prev, city: value };
                  })
                }
                onChange={(value) =>
                  setEditedGymData((prev) => {
                    if (!prev) return prev;
                    return { ...prev, city: value };
                  })
                }
                placeholder="City"
                className="modal-input"
                allowClear
                filterOption={false}
                style={{ width: "100%" }}
              />
              <Input.TextArea
                name="description"
                placeholder="Description"
                value={editedGymData?.description}
                onChange={handleEditedGymDataChange}
                className="modal-input"
                autoSize={{ minRows: 3, maxRows: 6 }}
              />
            </div>

            {/* Right Side - Image Upload */}
            <div className="modal-image-upload" style={{ flex: 1 }}>
              <p>Upload Gym Images (Max: 5)</p>

              <label className="custom-file-upload">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={gymImages.length >= 5}
                  style={{ display: "none" }}
                />
                <UploadOutlined style={{ fontSize: 24, cursor: "pointer" }} />
              </label>

              <div className="image-preview-container">
                {gymImages.map((image, index) => (
                  <div key={index} className="image-preview">
                    {/* Check if the image is a File object or a URL */}
                    <img
                      src={
                        typeof image === "string"
                          ? image
                          : URL.createObjectURL(image)
                      }
                      alt={`Gym Image ${index}`}
                    />
                    <button
                      onClick={() => handleRemoveImage(index)}
                      className="remove-image-btn"
                    >
                      ✖
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            className="modal-actions"
            style={{ marginTop: "20px", textAlign: "right" }}
          >
            <Button
              type="primary"
              onClick={handleUpdateGym}
              className="save-btn"
            >
              Save Changes
            </Button>
          </div>
        </Modal>

        {/* Chat Modal */}
        <Modal
          title={
            selectedUser
              ? `Chat with ${selectedUser.firstName} ${selectedUser.lastName}`
              : "Chat with Users"
          }
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
                <List.Item
                  onClick={() => selectUser(user)}
                  style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <span>{user.firstName} {user.lastName}</span>

                  {unreadCounts[user.userId] > 0 && (
                    <span
                      style={{
                        backgroundColor: "#f5222d",
                        color: "#fff",
                        borderRadius: "50%",
                        minWidth: "20px",
                        height: "20px",
                        padding: "0 6px",
                        fontSize: "12px",
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {unreadCounts[user.userId]}
                    </span>
                  )}
                </List.Item>
              )}
              locale={{ emptyText: "No Active Chats" }}
            />
          ) : (
            <>
              <Button
                type="default"
                onClick={() => setSelectedUser(null)}
                className="back-button"
              >
                Back to User List
              </Button>

              {/* Chat Messages Section */}
              <div className="chat-messages-container">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`chat-message ${msg.sender === gymData.owner
                      ? "user-message"
                      : "owner-message"
                      }`}
                  >
                    <div style={{ marginBottom: 4 }}>{msg.text}</div>
                    <div style={{ fontSize: 10, color: "#888", textAlign: "right" }}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
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
                <Button type="primary" onClick={sendMessage} block>
                  Send
                </Button>
              </div>
            </>
          )}
        </Modal>

        {/* Update Prices Modal */}
        <Modal
          open={isPriceModalVisible}
          onCancel={handleClosePriceModal}
          footer={null}
          width={600}
          closable
        >
          <div style={{ padding: "20px 30px" }}>
            <h3
              style={{
                fontSize: "18px",
                fontWeight: 500,
                color: "#6c7080",
                marginBottom: "30px",
              }}
            >
              Update prices
            </h3>

            {["1 day", "3 day", "5 day"].map((label, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "25px",
                }}
              >
                <label
                  style={{ width: "120px", fontWeight: 500, color: "#6c7080" }}
                >
                  {label} plan
                </label>
                <Input
                  type="number"
                  placeholder="Price"
                  value={editedGymData?.prices?.[i] ?? ""}
                  onChange={(e) => {
                    const updatedPrices = [...(editedGymData?.prices || [])];
                    updatedPrices[i] = parseFloat(e.target.value);
                    if (!editedGymData) return;

                    setEditedGymData({
                      ...editedGymData,
                      prices: updatedPrices,
                    });
                  }}
                  style={{
                    flex: 1,
                    borderRadius: "12px",
                    padding: "12px 16px",
                    boxShadow: "0 4px 8px rgba(0,0,0,0.06)",
                    border: "1px solid #eee",
                    fontSize: "16px",
                  }}
                />
              </div>
            ))}

            <div style={{ textAlign: "center", marginTop: "40px" }}>
              <Button
                onClick={async () => {
                  const prices = editedGymData?.prices.map(Number);

                  if (!prices || prices.length !== 3) {
                    notification.error({
                      message: "Invalid Prices",
                      description: "Please enter all three prices.",
                      placement: "top",
                    });
                    return;
                  }

                  if (!editedGymData?._id) {
                    notification.error({
                      message: "Invalid Gym ID",
                      description: "Please select a valid gym.",
                      placement: "top",
                    });
                    return;
                  }

                  if (
                    prices.some((p) => {
                      const num = Number(p);
                      return isNaN(num) || num <= 0;
                    })
                  ) {
                    notification.error({
                      message: "Invalid Prices",
                      description:
                        "All prices must be valid numbers greater than 0.",
                      placement: "top",
                    });
                    return;
                  }

                  try {
                    const formData = new FormData();
                    formData.append("prices", JSON.stringify(prices));
                    await submitGymUpdate(formData, gymId);
                    handleClosePriceModal();
                  } catch (err) {
                    notification.error({ message: "Failed to update prices" });
                  }
                }}
                style={{
                  background: "#1d1f23",
                  color: "#fff",
                  border: "none",
                  borderRadius: "12px",
                  padding: "12px 50px",
                  fontWeight: 600,
                  fontSize: "18px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </Modal>

        {/* Update Opening Hours Modal */}
        <Modal
          title="Update Opening Hours"
          open={isHoursModalVisible}
          onCancel={handleCloseHoursModal}
          onOk={() => {
            const isValidTime = (time: string) =>
              /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
            const isStartBeforeEnd = (start: string, end: string) => {
              const [sh, sm] = start.split(":").map(Number);
              const [eh, em] = end.split(":").map(Number);
              return sh < eh || (sh === eh && sm < em);
            };

            type DayKey = keyof OpeningHours;

            for (const day of [
              "sundayToThursday",
              "friday",
              "saturday",
            ] as DayKey[]) {
              const { from, to } = hours[day];

              if (!isValidTime(from) || !isValidTime(to)) {
                notification.error({
                  message: "Invalid Time Format",
                  description: `Opening hours for ${day} must be in HH:MM format.`,
                  placement: "top",
                });
                return;
              }

              if (!isStartBeforeEnd(from, to)) {
                notification.error({
                  message: "Invalid Time Range",
                  description: `Opening time must be earlier than closing time for ${day}.`,
                  placement: "top",
                });
                return;
              }
            }
            onUpdateOpeningHours(hours);
            setIsHoursModalVisible(false);
          }}
        >
          {hours &&
            (
              [
                "sundayToThursday",
                "friday",
                "saturday",
              ] as (keyof OpeningHours)[]
            ).map((day) => (
              <div key={day} style={{ marginBottom: "12px" }}>
                <strong style={{ textTransform: "capitalize" }}>{day}</strong>
                <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                  <Input
                    placeholder="From"
                    value={hours[day].from}
                    onChange={(e) =>
                      setHours((prev) => ({
                        ...prev,
                        [day]: { ...prev[day], from: e.target.value },
                      }))
                    }
                  />
                  <Input
                    placeholder="To"
                    value={hours[day].to}
                    onChange={(e) =>
                      setHours((prev) => ({
                        ...prev,
                        [day]: { ...prev[day], to: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>
            ))}
        </Modal>

        {/* Trainees List Modal */}
        <Modal
          title={gymData.name + " Trainees"}
          open={isTraineesModalVisible}
          onCancel={() => setTraineesModalVisible(false)}
          footer={null}
          width={900}
        >
          <div
            style={{
              marginBottom: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Input.Search placeholder="Search" style={{ width: 300 }} />
          </div>

          <div className="trainees-table">
            {paginatedUsers.length === 0 ? (
              <div
                style={{
                  padding: "24px",
                  textAlign: "center",
                  color: "#888",
                  fontStyle: "italic",
                }}
              >
                No trainees found.
              </div>
            ) : (
              <>
                <div className="table-header">
                  <span>Avatar</span>
                  <span>First name</span>
                  <span>Last name</span>
                  <span>Email</span>
                  <span>Code</span>
                  <span>Valid until</span>
                </div>

                {paginatedUsers.map((user, index) => (
                  <div key={index} className="table-row">
                    <img src={user.avatarUrl} alt="avatar" className="avatar" />
                    <span>{user.firstName}</span>
                    <span>{user.lastName}</span>
                    <span>{user.email}</span>
                    <span>{user.code}</span>
                    <span>
                      {new Date(user.validUntil).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>

          {paginatedUsers.length > 0 && (
            <div style={{ marginTop: 16, textAlign: "center" }}>
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={purchasedUsers.length}
                onChange={(page) => setCurrentPage(page)}
                showSizeChanger={false}
              />
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default Dashboard;
