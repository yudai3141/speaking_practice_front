import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const ReviewSession = ({ expressionsToReview }) => {
  const navigate = useNavigate();
  
  const startReviewSession = () => {
    // 復習セッション用のシステムプロンプトを構築
    const targetExpressions = expressionsToReview.map(expr => expr.expression).join(', ');
    const systemPrompt = `
You are a helpful conversation partner. Your goal is to create natural opportunities for the user to practice these specific English expressions: ${targetExpressions}

Guidelines:
1. Guide the conversation in a way that naturally elicits these expressions
2. If the user doesn't use the expressions, try to create more obvious opportunities
3. Keep track of which expressions the user successfully uses
4. Be natural and friendly, don't explicitly tell the user to use specific expressions

The conversation should feel natural while providing opportunities to use these expressions.
    `.trim();

    // TalkPageに遷移し、復習モードのパラメータを渡す
    navigate('/talk', { 
      state: { 
        isReviewMode: true,
        systemPrompt,
        expressionsToReview
      } 
    });
  };

  return (
    <Paper sx={{ p: 3, mb: 3, bgcolor: '#f5f5f5' }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        復習セッション
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 2 }}>
        以下の表現を練習します：
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        {expressionsToReview.map((expr) => (
          <Paper 
            key={expr.id} 
            sx={{ p: 2, mb: 1, bgcolor: 'white' }}
          >
            <Typography variant="h6">{expr.expression}</Typography>
            <Typography variant="body2" color="textSecondary">
              {expr.meaning}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              例: {expr.example}
            </Typography>
          </Paper>
        ))}
      </Box>

      <Button 
        variant="contained" 
        onClick={startReviewSession}
        fullWidth
      >
        復習セッションを開始
      </Button>
    </Paper>
  );
};

export default ReviewSession; 