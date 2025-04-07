import React, { useEffect, useState } from "react";
import { getGyms } from "../../../api/gyms";
import { addFavoriteGym, getUserProfile, removeFavoriteGym } from "../../../api/users";
import {askChatAi} from "../../../api/chat-ai";
import GymCard from "../../../components/GymCard/GymCard";
import { Button, Pagination, Spin, Alert, Modal, List, Rate, Input } from "antd";
import "./GymsList.less";
import { useUserProfile } from "../../../context/useUserProfile";

const GymsList: React.FC = () => {
  const { userProfile } = useUserProfile();
  const [gyms, setGyms] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  const [chatAiResponse, setAiResponse] = useState<any>(null);
  const [filteredGyms, setFilteredGyms] = useState<any[]>([]);
  const [filterName, setFilterName] = useState<string>("");
  const [filterCity, setFilterCity] = useState<string>("");
  const [isChatLoading, setChatLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFavoritesModalVisible, setFavoritesModalVisible] = useState(false);

  const [isChatAIModalVisible, setChatAIModal] = useState(false);
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [isReviewsModalVisible, setReviewsModalVisible] = useState(false);
  const [selectedGymReviews, setSelectedGymReviews] = useState<any[]>([]);
  const [modalPage, setModalPage] = useState(1);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [isGymDetailsModalVisible, setGymDetailsModalVisible] = useState(false);
  const [selectedGym, setSelectedGym] = useState<any>(null);
  const gymsPerPage = 6;
  const reviewsPerPage = 5;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchedGyms = await getGyms();
        setGyms(fetchedGyms);
        setFilteredGyms(fetchedGyms);
        try {
          const userData = await getUserProfile(false);
          setUser(userData);
        } catch (err: any) {
          setUser(null);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load gyms.");
      } finally {
        setLoading(false);
        setAiResponse("Loading...")
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const handleCloseModal = () => setGymDetailsModalVisible(false);
    window.addEventListener("closeGymDetailsModal", handleCloseModal);
  
    return () => {
      window.removeEventListener("closeGymDetailsModal", handleCloseModal);
    };
  }, []);
  
  if (loading) return <Spin size="large" className="loading-spinner" />;
  if (error)
    return <Alert message="Error" description={error} type="error" showIcon />;

  const indexOfLastGym = currentPage * gymsPerPage;
  const indexOfFirstGym = indexOfLastGym - gymsPerPage;
  const currentGyms = filteredGyms.slice(indexOfFirstGym, indexOfLastGym);

  const openGymDetailsModal = (gym: any) => {
    console.log("Opening modal for gym:", gym);
    setSelectedGym(gym);
    setGymDetailsModalVisible(true);
  };  

  const toggleFavorite = async (gymId: string) => {
    if (!user) return;

    try {
      if (user.favoriteGyms?.includes(gymId)) {
        const updatedFavorites = user.favoriteGyms.filter((id: string) => id !== gymId);
        await removeFavoriteGym(user._id, gymId);
        setUser({ ...user, favoriteGyms: updatedFavorites });

        const totalPages = Math.ceil(updatedFavorites.length / 1);
        if (modalPage > totalPages) {
          setModalPage(Math.max(totalPages, 1));
        }
      } else {
        await addFavoriteGym(user._id, gymId);
        setUser({ ...user, favoriteGyms: [...user.favoriteGyms, gymId] });
      }
    } catch (err) {
      console.error("Failed to update favorites", err);
    }
  };

  const handleReviewAdded = async () => {
    try {
      const updatedGyms = await getGyms();
      setGyms(updatedGyms);
    } catch (err) {
      console.error("Failed to update gyms after review", err);
    }
  };

  const openFilterModal = () => {
    setFilterModalVisible(true);
  };

  const openFavoritesModal = () => {
    setFavoritesModalVisible(true);
    setModalPage(1);
  };

  const openChatAIModal = async () => {
    if (user?._id) {
      try {
        setChatLoading(true);
        const response = await askChatAi(user._id, user.birthdate, user.gender);
        setAiResponse(response);
      } catch (err) {
        console.error("Chat AI Error:", err);
        setAiResponse("Failed to fetch AI response");
      }
      finally {
        setChatLoading(false);
        setChatAIModal(true);
      }
    }
    else
      setChatAIModal(true);
  };

  const closeChatAIModal = () => {
    setChatAIModal(false);
  };

  const closeFavoritesModal = () => {
    setFavoritesModalVisible(false);
  };

  const handleModalPaginationChange = (page: number) => {
    setModalPage(page);
  };

  const openReviewsModal = (reviews: any[]) => {
    setSelectedGymReviews(reviews);
    setReviewsPage(1);
    setReviewsModalVisible(true);
  };

  const closeReviewsModal = () => {
    setReviewsModalVisible(false);
    setSelectedGymReviews([]);
  };

  const handleReviewsPaginationChange = (page: number) => {
    setReviewsPage(page);
  };

  const applyFilters = () => {
    let filtered = gyms;

    if (filterName.trim() !== "") {
      filtered = filtered.filter((gym) =>
        gym.name.toLowerCase().includes(filterName.toLowerCase())
      );
    }

    if (filterCity.trim() !== "") {
      filtered = filtered.filter((gym) =>
        gym.city.toLowerCase().includes(filterCity.toLowerCase())
      );
    }

    setFilteredGyms(filtered);
    setCurrentPage(1);
    setFilterModalVisible(false);
  };

  const favoriteGyms = user?.favoriteGyms || [];
  const indexOfLastFavorite = modalPage * 1;
  const indexOfFirstFavorite = indexOfLastFavorite - 1;
  const currentFavoriteGyms = gyms
    .filter((gym) => favoriteGyms.includes(gym._id))
    .slice(indexOfFirstFavorite, indexOfLastFavorite);
  const indexOfLastReview = reviewsPage * reviewsPerPage;
  const indexOfFirstReview = indexOfLastReview - reviewsPerPage;
  const currentReviews = selectedGymReviews.slice(indexOfFirstReview, indexOfLastReview);

  return (
    <div className="gyms-container">
      <div className="main-content">
        <div className="header">
          <div className="profile">
            <span>Hello, {userProfile ? userProfile?.firstName : "Guest"}!</span>
          </div>
          <div className="actions">

          <Button onClick={openChatAIModal} disabled={isChatLoading}>
            {isChatLoading ? <Spin /> : "Suggest Workout Plan"}
          </Button>

            <Button onClick={openFilterModal}>Filter</Button>

            <Button onClick={openFavoritesModal}>Favorites</Button>
          </div>
        </div>

        <div className="gyms-list">
          {currentGyms.map((gym) => (
            <GymCard
              key={gym._id}
              gymId={gym._id}
              gymName={gym.name}
              city={gym.city}
              prices={gym.prices || []}
              rating={gym.reviewsCount > 0 ? gym.rating : "No reviews yet"}
              reviewsCount={gym.reviewsCount || 0}
              images={gym.pictures || ["/default-gym.jpg"]}
              isFavorite={user ? user?.favoriteGyms?.includes(gym._id) : false}
              currentUser={user}
              onToggleFavorite={() => toggleFavorite(gym._id)}
              onReviewAdded={handleReviewAdded}
              onReviewsClick={() => openReviewsModal(gym.reviews)}
              onClick={() => openGymDetailsModal(gym)}
              ownerId={gym.owner}
            />
          ))}
        </div>

        <div className="pagination-container">
          <Pagination
            current={currentPage}
            total={filteredGyms.length}
            pageSize={gymsPerPage}
            onChange={(page) => setCurrentPage(page)}
            className="pagination"
          />
        </div>
      </div>

      {/* Filter Modal */}
      <Modal
        title="Filter Gyms"
        open={isFilterModalVisible}
        onCancel={() => setFilterModalVisible(false)}
        footer={null}
      >
        <div>
          <Input
            placeholder="Enter gym name"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            style={{ marginBottom: "10px" }}
          />
          <Input
            placeholder="Enter city"
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            style={{ marginBottom: "10px" }}
          />
          <Button type="primary" block onClick={applyFilters}>
            Apply Filters
          </Button>
        </div>
      </Modal>

      {/* Favorites Modal */}
      <Modal
        title="Your Favorite Gyms"
        open={isFavoritesModalVisible}
        onCancel={closeFavoritesModal}
        footer={null}
      >
        <div className="favorites-list">
          {currentFavoriteGyms.length ? (
            currentFavoriteGyms.map((gym) => (
              <GymCard
                key={gym._id}
                gymId={gym._id}
                gymName={gym.name}
                city={gym.city}
                rating={gym.reviewsCount > 0 ? gym.rating : "No reviews yet"}
                reviewsCount={gym.reviewsCount || 0}
                images={gym.pictures || ["/default-gym.jpg"]}
                isFavorite={true}
                currentUser={user}
                onToggleFavorite={() => toggleFavorite(gym._id)}
                onReviewAdded={handleReviewAdded}
                onReviewsClick={() => openReviewsModal(gym.reviews)}
              />
            ))
          ) : (
            <p>No favorite gyms added yet!</p>
          )}
        </div>

        <Pagination
          current={modalPage}
          total={favoriteGyms.length}
          pageSize={1}
          onChange={handleModalPaginationChange}
          className="modal-pagination"
        />
      </Modal>

      {/* Chat AI Modal */}
      <Modal
        title="Generate Your Workout Plan By AI"
        open={isChatAIModalVisible}
        onCancel={closeChatAIModal}
        footer={null}
      >
        <div className="ChatAI-popup">
          {isChatLoading ? (
            <Spin size="large" />
          ) : 
          chatAiResponse.length ? (
            <pre>{chatAiResponse}</pre>
          ) : (
            <p>Failed to retrieve workout plan from AI!</p>
          )}
      </div>
      </Modal>


      {/* Reviews Modal */}
      <Modal
        title="Reviews"
        open={isReviewsModalVisible}
        onCancel={closeReviewsModal}
        footer={null}
      >
        <List
          dataSource={currentReviews}
          renderItem={(review) => (
            <List.Item>
              <div>
                <strong>{review.user?.firstName || "Anonymous"}</strong>
                <Rate disabled defaultValue={review.rating} />
                <p>{review.content}</p>
              </div>
            </List.Item>
          )}
        />
        <Pagination
          current={reviewsPage}
          total={selectedGymReviews.length}
          pageSize={reviewsPerPage}
          onChange={handleReviewsPaginationChange}
          className="modal-pagination"
        />
      </Modal>
      <Modal
        open={isGymDetailsModalVisible}
        onCancel={() => setGymDetailsModalVisible(false)}
        footer={null}
        width={320}
        centered
        className="gym-details-modal"
      >
        {selectedGym && (
          <div>
            <h2 className="gym-title">{selectedGym.name}</h2>
            <img
              src={selectedGym.pictures?.[0] || "/default-gym.jpg"}
              alt="Gym"
              className="gym-image"
            />

            <div className="gym-info">
              <div>
                <p>Location: {selectedGym.city}</p>
                <p>Rating: {selectedGym.rating} ({selectedGym.reviewsCount} reviews)</p>
                <p>Pricing:</p>
                <p>1 day: {selectedGym?.prices?.[0] ?? "N/A"}$</p>
                <p>3 days: {selectedGym?.prices?.[1] ?? "N/A"}$</p>
                <p>5 days: {selectedGym?.prices?.[2] ?? "N/A"}$</p>
              </div>
              <div>
                <p>Description:</p>
                <p>{selectedGym?.description ?? "No description available"}</p>
              </div>
            </div>

            <div className="review-box">
              {selectedGym?.reviews?.length ? (
                (() => {
                  const userReview = selectedGym.reviews.find(
                    (r: any) => r.user?._id === userProfile?._id
                  );

                  return userReview ? (
                    <>
                      <Rate disabled defaultValue={userReview.rating} />
                      <p style={{ marginTop: 8 }}>{userReview.content}</p>
                    </>
                  ) : (
                    <p>You haven't reviewed this gym yet.</p>
                  );
                })()
              ) : (
                <p>No reviews yet</p>
              )}
            </div>



            <Button className="choose-btn">Choose a plan</Button>
          </div>
        )}
      </Modal>


    </div>
  );
};

export default GymsList;
