import { API_BASE_URL } from "./config";

export const evaluateReviewSession = async (messages, targetExpressions) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/review/evaluate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages,
        targetExpressions,
      }),
    });
    return await response.json();
  } catch (error) {
    console.error("Error evaluating review session:", error);
    throw error;
  }
};
