// frontend/src/api/expressionsApi.js
export async function fetchExpressions() {
  try {
    const res = await fetch("/api/expressions");
    if (!res.ok) {
      throw new Error(`Failed to fetch expressions: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error in fetchExpressions:", error);
    throw error; // エラーを再スローして呼び出し元でハンドリング
  }
}

export async function createExpression(data) {
  try {
    const res = await fetch("/api/expressions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error(`Failed to create expression: ${res.status} ${res.statusText}`);
    }
    const createdData = await res.json();
    return createdData;
  } catch (error) {
    console.error("Error in createExpression:", error);
    throw error;
  }
}

export const updateExpressionProgress = async (expressionId, progressData) => {
  try {
    const response = await fetch(`/api/expressions/${expressionId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(progressData)
    });
    return await response.json();
  } catch (error) {
    console.error('Error updating expression progress:', error);
    throw error;
  }
};

export const getExpressionsForReview = async () => {
  try {
    const response = await fetch('/api/expressions/review');
    return await response.json();
  } catch (error) {
    console.error('Error fetching expressions for review:', error);
    throw error;
  }
};

export const markExpressionMastered = async (expressionId) => {
  try {
    const response = await fetch(`/api/expressions/${expressionId}/master`, {
      method: 'POST',
    });
    return await response.json();
  } catch (error) {
    console.error('Error marking expression as mastered:', error);
    throw error;
  }
};
