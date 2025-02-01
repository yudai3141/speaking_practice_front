import { API_BASE_URL } from "./config";

// frontend/src/api/conversationApi.js
export const finalizeConversation = async (payload) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/conversation/finalize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get("content-type");
    if (!response.ok) {
      const errorData = contentType?.includes("application/json")
        ? await response.json()
        : await response.text();
      throw new Error(
        typeof errorData === "string"
          ? errorData
          : errorData.error || "Failed to finalize conversation"
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error in finalizeConversation:", error);
    throw error;
  }
};
