import React, { useState } from "react";
import "./Sidebar.less";
import logo from "../../assets/Logo/shape-up.png";
import {
  HomeOutlined,
  EditOutlined,
  LogoutOutlined,
  DotChartOutlined,
} from "@ant-design/icons";
import { useUserProfile } from "../../context/useUserProfile";
import { useNavigate } from "react-router-dom";
import UpdateProfileModal from "../UpdateProfileModal/UpdateProfileModal";

const Sidebar: React.FC<{ user?: any }> = () => {
  const { userProfile, logout } = useUserProfile();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleEdit = () => {
    setIsModalOpen(true);
  };

  const handleLogout = async () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="col-auto align-items-center justify-content-center sidebar">
      <div>
        <img src={logo} className="logo" alt="ShapeUp Logo" />
      </div>

      <div className="menu">
        {userProfile?.role === "gym_owner" ||
          (userProfile?.role === "user" && (
            <div className="menu-item" onClick={() => navigate("/dashboard")}>
              <DotChartOutlined style={{ marginRight: "auto" }} />
              <span className="item-title">Dashboard</span>
            </div>
          ))}

        {userProfile?.role === "gym_owner" ||
          (userProfile?.role === "user" && (
            <div className="menu-item" onClick={() => navigate("/gyms")}>
              <HomeOutlined style={{ marginRight: "auto" }} />
              <span className="item-title">Gyms</span>
            </div>
          ))}
      </div>

      <div className="aside-bottom-container">
        <div className="divider"></div>
        <div className="user-info">
          <img
            src={userProfile?.avatarUrl}
            alt="avatar"
            className="user-avatar"
          />
          <span className="user-name">
            {userProfile?.firstName} {userProfile?.lastName}
          </span>
          <div className="user-actions-container">
            <button className="icon-button" onClick={handleEdit}>
              <EditOutlined className="edit-icon" />
            </button>
            <button className="icon-button" onClick={handleLogout}>
              <LogoutOutlined className="logout-icon" />
            </button>
          </div>
        </div>
      </div>

      <UpdateProfileModal open={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </aside>
  );
};

export default Sidebar;
