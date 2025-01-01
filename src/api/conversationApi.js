// frontend/src/api/conversationApi.js
export const finalizeConversation = async (payload) => {
  const response = await fetch("/api/conversation/finalize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to finalize conversation.");
  }

  return response.json();
};
