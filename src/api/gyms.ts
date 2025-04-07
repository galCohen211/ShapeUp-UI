import axiosInstance from "./axios-instances/axios-instance";
import { notification } from "antd";

const GYMS_ROUTE = "/gyms";
const REVIEWS_ROUTE = "/reviews";

interface Review {
  rating: number;
}

export const getGyms = async () => {
  try {
    const response = await axiosInstance.get(GYMS_ROUTE, {
      withCredentials: true,
    });

    const gyms = response.data.gyms;

    for (let gym of gyms) {
      try {
        const reviewResponse = await axiosInstance.get(
          `${REVIEWS_ROUTE}/gym/${gym._id}`,
          {
            withCredentials: true,
          }
        );

        const reviews: Review[] = reviewResponse.data.reviews || [];

        if (reviews.length > 0) {
          const avgRating =
            reviews.reduce(
              (sum: number, review: Review) => sum + review.rating,
              0
            ) / reviews.length;
          gym.rating = avgRating.toFixed(1);
          gym.reviewsCount = reviews.length;
          gym.reviews = reviews;
        } else {
          gym.rating = "No ratings yet";
          gym.reviewsCount = 0;
        }
      } catch (error) {
        console.error(`Failed to fetch reviews for gym ${gym._id}:`, error);
        gym.rating = "No ratings yet";
        gym.reviewsCount = 0;
      }
    }
    
    return gyms;
  } catch (error: any) {
    notification.error({
      message: "Fetching Gyms Failed",
      description:
        error.response?.data?.message ||
        "Something went wrong. Please try again.",
      placement: "top",
    });
    throw error;
  }
};

export const getGymById = async (gymId: string) => {
  try {
    const response = await axiosInstance.get(`${GYMS_ROUTE}/${gymId}`, {
      withCredentials: true,
    });
    return response.data.gym;
  } catch (error: any) {
    notification.error({
      message: "Fetching Gym Details Failed",
      description:
        error.response?.data?.message ||
        "Something went wrong. Please try again.",
      placement: "top",
    });
    throw error;
  }
};

export const getAllGymsForAdmin = async (showNotification = true) => {
  try {
    const response = await axiosInstance.get(
      `${GYMS_ROUTE}/getAllGymsForAdmin`,
      {
        withCredentials: true,
      }
    );
    return response?.data?.gyms;
  } catch (error: any) {
    if (showNotification) {
      notification.error({
        message: "Fetching Gyms Failed",
        description:
          error.response?.data?.message ||
          "Something went wrong. Please try again.",
        placement: "top",
      });
    }
    throw error;
  }
};

export const filterGyms = async (query: string, showNotification = true) => {
  try {
    const response = await axiosInstance.get(`${GYMS_ROUTE}/filter?search=${encodeURIComponent(query)}`, {
      withCredentials: true,
    });
    return response?.data?.gyms;
  } catch (error: any) {
    if (showNotification) {
      notification.error({
        message: "Filtering Gyms Failed",
        description:
          error.response?.data?.message ||
          "Something went wrong. Please try again.",
        placement: "top",
      });
    }
    throw error;
  }
};
