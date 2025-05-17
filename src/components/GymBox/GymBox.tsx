import { DeleteOutlined } from "@ant-design/icons";
import { Carousel, Popconfirm } from "antd";
import React from "react";
import { useNavigate } from "react-router-dom";
import "./GymBox.less";

interface GymBoxProps {
  gymId: string;
  gymName: string;
  city: string;
  description: string;
  images: string[];
  onDelete: () => void;
  hasUnread?: boolean;
}

const GymBox: React.FC<GymBoxProps> = ({
  gymId,
  gymName,
  city,
  description,
  images,
  onDelete,
  hasUnread,
}) => {
  const navigate = useNavigate();

  const handleNavigate = () => {
    navigate(`/gyms/${gymId}`);
  };
  return (
    <div className="gym-box">

      <div className="gym-image-wrapper">
        <Carousel
          autoplay
          speed={500}
          arrows={images.length > 1}
          dots={images.length > 1}
        >
          {images.slice(0, 5).map((img, i) => (
            <div key={i}>
              <img src={img} alt={`gym-${i}`} className="gym-image" />
            </div>
          ))}
        </Carousel>
      </div>

      <div className="gym-info">
        <div className="gym-title-row">
          <h3 className="gym-title" onClick={handleNavigate}>{gymName}</h3>
          <Popconfirm
            title="Are you sure you want to delete this gym?"
            okText="Yes"
            cancelText="No"
            onConfirm={onDelete}
          >
            <DeleteOutlined className="gym-box-icon-inline" />
          </Popconfirm>
        </div>

        <p className="gym-city">{city}</p>
        <p className="gym-description">
          {description.length > 120
            ? description.slice(0, 117) + "..."
            : description}
        </p>

        {hasUnread && (
          <div
          style={{
            backgroundColor: '#fff3f3',
            color: '#a8071a',
            padding: '4px 8px',
            borderRadius: '6px',
            fontWeight: 500,
            fontSize: '11px',
            marginTop: '8px',
            display: 'inline-block',
            border: '1px solid #ffa39e',
          }}
          >
            You have unread chats, please check it
          </div>
        )}
      </div>
    </div>
  );
};

export default GymBox;
