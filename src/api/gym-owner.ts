import axiosInstance from "./axios-instances/axios-instance";
import { notification } from "antd";

const GYMS_ROUTE = "/gyms";

export const getGymsByOwner = async (ownerID: string) => {
  try {
    const response = await axiosInstance.get(`${GYMS_ROUTE}`, {
      params: {
        owner: ownerID,
      },
    });
    return response.data.gyms;
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

export const addGym = async (
  formData: FormData,
  ownerID: string
) => {
  try {
    const response = await axiosInstance.post(
      `${GYMS_ROUTE}`,
      formData,
      {
        params: {
          owner: ownerID,
        },
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      }
    );

    notification.success({
      message: "Gym Added Successfully",
      description: "The gym has been added to the platform.",
      placement: "top",
    });

    return response.data.gym;
  } catch (error: any) {
    let errorMessage = "Something went wrong. Please try again.";

    if (error.response?.data?.message === "Validation array is not empty") {
      errorMessage = "Please fill in all fields";
    } else if (error.response?.data?.message) {
      errorMessage = error.response?.data?.message;
    }

    notification.error({
      message: "Adding Gym Failed",
      description: errorMessage,
      placement: "top",
    });

    throw error;
  }
};

export const updateGymById = async (
  formData: FormData,
  gymId: string,
) => {
  try {
    const response = await axiosInstance.put(
      `${GYMS_ROUTE}/${gymId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      }
    );

    notification.success({
      message: "Gym edited successfully",
      description: "The gym has been edited.",
      placement: "top",
    });

    return response.data.gym;
  } catch (error: any) {
    let errorMessage = "Something went wrong. Please try again.";

    if (error.response?.data?.message === "Validation array is not empty") {
      errorMessage = "Please fill in all fields";
    } else if (error.response?.data?.message) {
      errorMessage = error.response?.data?.message;
    }

    notification.error({
      message: "Editing Gym Failed",
      description: errorMessage,
      placement: "top",
    });

    throw error;
  }
};

export const deleteGymById = async (gymId: string) => {
  try {
    await axiosInstance.delete(`${GYMS_ROUTE}/${gymId}`, { withCredentials: true });
    notification.success({
      message: "Gym Deleted",
      description: "The gym has been successfully removed.",
      placement: "top",
    });
  } catch (error: any) {
    notification.error({
      message: "Failed to Delete Gym",
      description:
        error.response?.data?.message ||
        "Something went wrong. Please try again.",
      placement: "top",
    });
    throw error;
  }
};

export const getPurchasedUsersForGym = async (gymId: string) => {
  try {
    const response = await axiosInstance.get(`${GYMS_ROUTE}/${gymId}/purchased-users`, { withCredentials: true });
    return response.data.users;
  } catch (error: any) {
    notification.error({
      message: "Fetching Gym Trainees Failed",
      description:
        error.response?.data?.message || "Something went wrong. Please try again.",
      placement: "top",
    });
    throw error;
  }
};