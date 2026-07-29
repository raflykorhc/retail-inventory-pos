import axiosClient from "../lib/axiosClient";

export const authService = {
  login: async (data: any) => {
    const response = await axiosClient.post("/auth/login", data);
    return response.data;
  },
  me: async () => {
    const response = await axiosClient.get("/auth/me");
    return response.data;
  },
};
