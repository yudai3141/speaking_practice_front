// frontend/src/pages/HomePage.jsx
import React, { useEffect, useState } from "react";
import { MaterialReactTable } from "material-react-table";
import { styled } from '@mui/material/styles';
import { 
  fetchExpressions, 
  getExpressionsForReview, 
  markExpressionMastered 
} from "../api/expressionsApi";
import { 
  Box, Typography, Paper, Button,
  useTheme
} from "@mui/material";
import { useNavigate } from 'react-router-dom';

/**
 * Firestoreに保存された有用表現(expressions)を一覧表示するページ
 *  - TalkPageで抽出/保存された表現もここに反映される
 */

// サイバーパンク風のスタイリング
const CyberContainer = styled(Box)`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  background: rgba(0, 0, 0, 0.9);
`;

const CyberTitle = styled(Typography)`
  margin-bottom: 2rem;
  font-family: 'Orbitron', sans-serif !important;
  color: #00ff00 !important;
  text-align: center;
  text-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
  font-size: 2.5rem !important;
  letter-spacing: 2px;
`;

const CyberNotification = styled(Paper)`
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  background: rgba(0, 40, 0, 0.95) !important;
  border: 1px solid #00ff00;
  box-shadow: 0 0 15px rgba(0, 255, 0, 0.2);
  color: #fff !important;
  border-radius: 4px;

  & h6 {
    color: #00ff00 !important;
    font-family: 'Orbitron', sans-serif !important;
    margin-bottom: 1rem;
    text-shadow: 0 0 5px rgba(0, 255, 0, 0.3);
  }

  & p {
    color: #fff !important;
    font-family: 'Share Tech Mono', monospace !important;
  }
`;

const CyberButton = styled(Button)`
  background: rgba(0, 40, 0, 0.95) !important;
  color: #00ff00 !important;
  border: 1px solid #00ff00 !important;
  font-family: 'Share Tech Mono', monospace !important;
  box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
  padding: 8px 24px !important;
  font-size: 1rem !important;
  letter-spacing: 1px;
  
  &:hover {
    background: rgba(0, 255, 0, 0.2) !important;
    box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
  }

  &:disabled {
    opacity: 0.5;
    border-color: rgba(0, 255, 0, 0.3) !important;
  }
`;

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
      Cell: ({ row }) => (
        <Box>
          {row.original.review_count || 0}回
        </Box>
      ),
    },
    {
      accessorKey: "last_reviewed",
      header: "最終確認",
      Cell: ({ row }) => (
        <Box>
          {row.original.last_reviewed ? 
            new Date(row.original.last_reviewed).toLocaleDateString() : 
            '未確認'}
        </Box>
      ),
    },
    {
      accessorKey: "mastered",
      header: "習得状況",
      Cell: ({ row }) => (
        <Box>
          {row.original.mastered ? 
            '✅ マスター済み' : 
            '🔄 学習中'}
        </Box>
      ),
    }
  ];

  // MaterialReactTableのスタイルカスタマイズ
  const tableCustomStyles = {
    muiTablePaperProps: {
      elevation: 0,
      sx: {
        background: 'rgba(0, 20, 0, 0.95)',
        border: '1px solid #00ff00',
        boxShadow: '0 0 10px rgba(0, 255, 0, 0.3)',
        borderRadius: '4px',
        '& .MuiTableRow-root': {
          borderBottom: '1px solid rgba(0, 255, 0, 0.2)',
          background: 'rgba(0, 255, 0, 0.05)',
          transition: 'background-color 0.2s ease',
        },
        '& .MuiTableCell-root': {
          color: '#00ff00',
          fontFamily: "'Share Tech Mono', monospace",
          borderBottom: '1px solid rgba(0, 255, 0, 0.2)',
          fontSize: '0.95rem',
          padding: '12px 16px',
        },
        '& .MuiTableHead-root': {
          background: 'rgba(0, 255, 0, 0.15)',
          '& .MuiTableCell-root': {
            fontWeight: 'bold',
            color: '#fff',
            textShadow: '0 0 5px rgba(0, 255, 0, 0.5)',
          },
          '& .MuiTableRow-root': {
            background: 'transparent',
          }
        },
        '& .MuiTableRow-root:hover': {
          background: 'rgba(0, 255, 0, 0.1)',
        },
        '& .MuiIconButton-root': {
          color: '#00ff00',
        },
        '& .MuiInputBase-root': {
          color: '#00ff00',
          background: 'rgba(0, 20, 0, 0.95)',
          '& input': {
            color: '#00ff00',
            '&::placeholder': {
              color: 'rgba(0, 255, 0, 0.5)',
              opacity: 1,
            },
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(0, 255, 0, 0.3)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(0, 255, 0, 0.5)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#00ff00',
          }
        },
        '& .MuiTablePagination-root': {
          color: '#00ff00',
          '& .MuiTablePagination-selectLabel': {
            color: '#00ff00',
          },
          '& .MuiTablePagination-displayedRows': {
            color: '#00ff00',
          },
          '& .MuiTablePagination-actions': {
            color: '#00ff00',
          }
        },
        '& .MuiSelect-select': {
          color: '#00ff00 !important',
        },
        '& .MuiSelect-icon': {
          color: '#00ff00',
        },
        '& .MuiToolbar-root': {
          color: '#00ff00',
          background: 'rgba(0, 20, 0, 0.95)',
        },
        '& .MuiTypography-root': {
          color: '#00ff00',
        },
      },
    },
  };

  const startReviewSession = () => {
    navigate('/review', { 
      state: { 
        expressionsToReview: expressionsForReview 
      } 
    });
  };

  return (
    <CyberContainer>
      <CyberTitle variant="h4">
        Useful Expressions Collection
      </CyberTitle>

      {expressionsForReview.length > 0 && (
        <CyberNotification>
          <Typography variant="h6">
            {expressionsForReview.length}個の表現の復習時期です！
          </Typography>
          <Box sx={{ mt: 2 }}>
            {expressionsForReview.map(expr => (
              <Box key={expr.id} sx={{ mb: 1 }}>
                <Typography>{expr.expression}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  {expr.meaning}
                </Typography>
              </Box>
            ))}
          </Box>
        </CyberNotification>
      )}

      {error && (
        <CyberNotification sx={{ bgcolor: 'rgba(255, 0, 0, 0.1)' }}>
          {error}
        </CyberNotification>
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
          sx: { 
            display: isLoading ? 'block' : 'none',
            '& .MuiLinearProgress-bar': {
              backgroundColor: '#00ff00',
            }
          }
        }}
        {...tableCustomStyles}
      />

      <Box sx={{ mt: 2 }}>
        <CyberButton
          onClick={startReviewSession}
          disabled={expressionsForReview.length === 0}
        >
          復習を開始
        </CyberButton>
      </Box>
    </CyberContainer>
  );
};

export default HomePage;
