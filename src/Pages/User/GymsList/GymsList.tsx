import React, { useEffect, useState } from "react";
import { getGyms } from "../../../api/gyms";
import { addFavoriteGym, getUserProfile, removeFavoriteGym } from "../../../api/users";
import GymCard from "../../../components/GymCard/GymCard";
import { Button, Pagination, Spin, Alert, Modal, List, Rate } from "antd";
import "./GymsList.less";

const GymsList: React.FC = () => {
  const [gyms, setGyms] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFavoritesModalVisible, setFavoritesModalVisible] = useState(false);
  const [isReviewsModalVisible, setReviewsModalVisible] = useState(false);
  const [selectedGymReviews, setSelectedGymReviews] = useState<any[]>([]);
  const [modalPage, setModalPage] = useState(1);
  const [reviewsPage, setReviewsPage] = useState(1);
  const gymsPerPage = 6;
  const reviewsPerPage = 5;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchedGyms = await getGyms();
        setGyms(fetchedGyms);

        try {
          const userData = await getUserProfile();
          setUser(userData);
        } catch {
          setUser(null);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load gyms.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <Spin size="large" className="loading-spinner" />;
  if (error)
    return <Alert message="Error" description={error} type="error" showIcon />;

  const indexOfLastGym = currentPage * gymsPerPage;
  const indexOfFirstGym = indexOfLastGym - gymsPerPage;
  const currentGyms = gyms.slice(indexOfFirstGym, indexOfLastGym);

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

  const openFavoritesModal = () => {
    setFavoritesModalVisible(true);
    setModalPage(1);
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
            <span>Hello, {user ? user.firstName : "Guest"}!</span>
          </div>
          <div className="actions">
            <Button>Filter</Button>
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
              rating={gym.reviewsCount > 0 ? gym.rating : "No reviews yet"}
              reviewsCount={gym.reviewsCount || 0}
              images={gym.pictures || ["/default-gym.jpg"]}
              isFavorite={user ? user?.favoriteGyms?.includes(gym._id) : false}
              onToggleFavorite={() => toggleFavorite(gym._id)}
              onReviewAdded={handleReviewAdded}
              onReviewsClick={() => openReviewsModal(gym.reviews)}
            />
          ))}
        </div>

        <div className="pagination-container">
          <Pagination
            current={currentPage}
            total={gyms.length}
            pageSize={gymsPerPage}
            onChange={(page) => setCurrentPage(page)}
            className="pagination"
          />
        </div>
      </div>

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
    </div>
  );
};

export default GymsList;
