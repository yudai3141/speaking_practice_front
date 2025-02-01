// frontend/src/pages/HomePage.jsx
import { Box, Button, Paper, Typography } from "@mui/material"; // Material-UIコンポーネントを追加
import { MaterialReactTable } from "material-react-table"; // 名前付きエクスポートに変更
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchExpressions,
  getExpressionsForReview,
} from "../api/expressionsApi";

/**
 * Firestoreに保存された有用表現(expressions)を一覧表示するページ
 *  - TalkPageで抽出/保存された表現もここに反映される
 */
const HomePage = () => {
  const [expressions, setExpressions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null); // エラー状態を追加
  const [expressionsForReview, setExpressionsForReview] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
    loadReviewExpressions();
  }, []);

  async function loadData() {
    setIsLoading(true);
    setError(null); // エラー状態をリセット
    try {
      const data = await fetchExpressions();
      setExpressions(data);
      console.log("Fetched expressions:", data); // デバッグ用
    } catch (err) {
      setError(err.message || "Failed to load expressions");
      console.error("Failed to load expressions:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadReviewExpressions() {
    try {
      const reviewData = await getExpressionsForReview();
      setExpressionsForReview(reviewData);
    } catch (err) {
      console.error("Failed to load review expressions:", err);
    }
  }

  // カラムの定義を更新
  const columns = [
    {
      accessorKey: "expression",
      header: "Expression",
    },
    {
      accessorKey: "meaning",
      header: "Meaning",
    },
    {
      accessorKey: "example",
      header: "Example",
    },
    {
      accessorKey: "review_count",
      header: "学習回数",
      Cell: ({ row }) => <Box>{row.original.review_count || 0}回</Box>,
    },
    {
      accessorKey: "last_reviewed",
      header: "最終確認",
      Cell: ({ row }) => (
        <Box>
          {row.original.last_reviewed
            ? new Date(row.original.last_reviewed).toLocaleDateString()
            : "未確認"}
        </Box>
      ),
    },
    {
      accessorKey: "mastered",
      header: "習得状況",
      Cell: ({ row }) => (
        <Box>{row.original.mastered ? "✅ マスター済み" : "🔄 学習中"}</Box>
      ),
    },
  ];

  // テーブルのスタイリングをカスタマイズ
  const tableCustomStyles = {
    muiTablePaperProps: {
      elevation: 0,
      sx: {
        borderRadius: "8px",
        border: "1px solid #e0e0e0",
      },
    },
    muiTableProps: {
      sx: {
        tableLayout: "fixed",
      },
    },
  };

  // 復習通知コンポーネント
  const ReviewNotification = () => {
    if (expressionsForReview.length === 0) return null;

    return (
      <Paper
        sx={{
          p: 2,
          mb: 3,
          bgcolor: "info.light",
          color: "info.contrastText",
          borderRadius: "8px",
        }}
      >
        <Typography variant="h6">
          {expressionsForReview.length}個の表現の復習時期です！
        </Typography>
        <Box sx={{ mt: 2 }}>
          {expressionsForReview.map((expr) => (
            <Box key={expr.id} sx={{ mb: 1 }}>
              <Typography>{expr.expression}</Typography>
              <Typography variant="body2" color="textSecondary">
                {expr.meaning}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>
    );
  };

  const startReviewSession = () => {
    navigate("/review", {
      state: {
        expressionsToReview: expressionsForReview,
      },
    });
  };

  return (
    <Box sx={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <Typography
        variant="h4"
        sx={{ mb: 4, fontWeight: 600, color: "#1a237e", textAlign: "center" }}
      >
        Useful Expressions Collection
      </Typography>

      <ReviewNotification />

      {error && (
        <Paper
          sx={{
            p: 2,
            mb: 3,
            bgcolor: "#ffebee",
            color: "#c62828",
            borderRadius: "8px",
          }}
        >
          {error}
        </Paper>
      )}

      <MaterialReactTable
        columns={columns}
        data={expressions}
        state={{ isLoading }}
        enableColumnActions
        enableColumnFilters
        enablePagination
        enableSorting
        muiLinearProgressProps={{
          sx: { display: isLoading ? "block" : "none" },
        }}
        {...tableCustomStyles}
      />

      <Button
        variant="contained"
        onClick={startReviewSession}
        disabled={expressionsForReview.length === 0}
      >
        復習を開始
      </Button>
    </Box>
  );
};

export default HomePage;
