import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Paper, Button, CircularProgress } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { evaluateReviewSession, updateExpressionProgress } from '../api/expressionsApi';

const ReviewPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { expressionsToReview } = location.state || { expressionsToReview: [] };
  
  const pcRef = useRef(null);
  const dataChannelRef = useRef(null);
  const audioRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const processedResponses = useRef(new Set());

  const [messages, setMessages] = useState([]);
  const [partialText, setPartialText] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!expressionsToReview.length) {
      navigate('/');
      return;
    }

    return () => {
      stopConnection();
    };
  }, []);

  const startConnection = async () => {
    setIsConnecting(true);
    try {
      const resp = await fetch("/session/review", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expressionsToReview)
      });

      if (!resp.ok) {
        throw new Error("Failed to create session");
      }

      const data = await resp.json();
      const ephemeralKey = data?.client_secret?.value;

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      audioRef.current = document.createElement("audio");
      audioRef.current.autoplay = true;
      audioRef.current.controls = true;
      pc.ontrack = (e) => {
        audioRef.current.srcObject = e.streams[0];
      };
      document.getElementById("audio-container").appendChild(audioRef.current);

      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = ms;
      ms.getTracks().forEach((track) => pc.addTrack(track, ms));

      const dc = pc.createDataChannel("oai-events");
      dataChannelRef.current = dc;

      dc.onopen = () => {
        setIsConnected(true);
        setIsConnecting(false);
      };

      dc.onmessage = (e) => {
        let serverEvent;
        try {
          serverEvent = JSON.parse(e.data);
        } catch (err) {
          console.warn("Failed to parse server event:", e.data);
          return;
        }
        handleServerEvent(serverEvent);
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = "https://api.openai.com/v1/realtime";
      const model = "gpt-4o-mini-realtime-preview-2024-12-17";
      const sdpResp = await fetch(`${baseUrl}?model=${model}`, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp",
        },
      });

      if (!sdpResp.ok) {
        throw new Error("Failed to fetch SDP answer");
      }

      const answerSdp = await sdpResp.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

    } catch (err) {
      console.error("startConnection error:", err);
      setError("接続の初期化中にエラーが発生しました。");
      setIsConnecting(false);
    }
  };

  const stopConnection = () => {
    if (isRecording) {
      stopRecording();
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
      if (document.getElementById("audio-container").contains(audioRef.current)) {
        document.getElementById("audio-container").removeChild(audioRef.current);
      }
      audioRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    setIsConnected(false);
    setPartialText("");
  };

  const handleServerEvent = (evt) => {
    console.log("[Realtime Event]", JSON.stringify(evt, null, 2));

    if (evt.type === "response.audio_transcript.delta") {
      setPartialText((prev) => prev + evt.delta);
    }
    else if (evt.type === "response.audio_transcript.done") {
      if (partialText.trim()) {
        setMessages((prev) => [...prev, { role: "assistant", text: partialText }]);
      }
      setPartialText("");
    }
    else if (evt.type === "response.done") {
      if (evt.response && Array.isArray(evt.response.output)) {
        const responseId = evt.response.id;
        if (!processedResponses.current.has(responseId)) {
          processedResponses.current.add(responseId);
          const assistantMessages = evt.response.output
            .map((item) =>
              item.content
                .filter((part) => part.type === "audio" && part.transcript)
                .map((part) => part.transcript)
                .join("")
            )
            .join("\n");

          if (assistantMessages.trim()) {
            setMessages((prev) => [...prev, { role: "assistant", text: assistantMessages }]);
          }
        }
      }
    }
  };

  const handleEndSession = async () => {
    stopConnection();
    
    try {
        // 会話内容を評価
        const evaluation = await evaluateReviewSession(messages, expressionsToReview);
        
        // 成功した表現の進捗を更新
        for (const [exprId, result] of Object.entries(evaluation)) {
            if (result.success) {
                try {
                    await updateExpressionProgress(exprId);
                    console.log(`Updated progress for expression ${exprId}`);
                } catch (error) {
                    console.error(`Failed to update progress for expression ${exprId}:`, error);
                }
            }
        }
        
        // フィードバックの表示
        setFeedback(
            <Box sx={{ mt: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>復習セッション結果</Typography>
                {Object.entries(evaluation).map(([exprId, result]) => (
                    <Paper key={exprId} sx={{ p: 2, mb: 1, bgcolor: result.success ? '#e8f5e9' : '#ffebee' }}>
                        <Typography>
                            {expressionsToReview.find(e => e.id === exprId)?.expression}:
                            {result.success ? ' ✅ 成功' : ' ❌ 要復習'}
                        </Typography>
                        {result.usage_context && (
                            <Typography variant="body2" sx={{ mt: 1 }}>
                                使用例: {result.usage_context}
                            </Typography>
                        )}
                        {result.feedback && (
                            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                                フィードバック: {result.feedback}
                            </Typography>
                        )}
                    </Paper>
                ))}
            </Box>
        );
        setIsSessionComplete(true);
    } catch (error) {
        setError('Failed to evaluate session: ' + error.message);
    }
  };

  const startRecording = async () => {
    try {
      if (!mediaStreamRef.current) {
        console.error("No media stream available");
        return;
      }

      const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = true;
        setIsRecording(true);
      }
    } catch (err) {
      console.error("Failed to start recording:", err);
      setError("録音の開始に失敗しました。");
    }
  };

  const stopRecording = () => {
    if (mediaStreamRef.current) {
      const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = false;
        setIsRecording(false);
      }
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>復習セッション</Typography>
      
      <Paper sx={{ p: 2, mb: 3, bgcolor: '#e3f2fd' }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          練習する表現:
        </Typography>
        {expressionsToReview.map(expr => (
          <Box key={expr.id} sx={{ mb: 1 }}>
            <Typography variant="subtitle1">{expr.expression}</Typography>
            <Typography variant="body2" color="textSecondary">
              {expr.meaning}
            </Typography>
          </Box>
        ))}
      </Paper>

      <Paper sx={{ p: 2, mb: 3, maxHeight: 400, overflow: 'auto' }}>
        {messages.map((msg, index) => (
          <Box 
            key={index}
            sx={{ 
              mb: 2,
              textAlign: msg.role === 'user' ? 'right' : 'left',
              color: msg.role === 'user' ? 'primary.main' : 'text.primary'
            }}
          >
            <Typography>{msg.text}</Typography>
          </Box>
        ))}
        {partialText && (
          <Box sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
            {partialText}
          </Box>
        )}
      </Paper>

      {!isSessionComplete ? (
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          {!isConnected && !isConnecting ? (
            <Button
              variant="contained"
              onClick={startConnection}
              disabled={isConnecting}
            >
              セッション開始
            </Button>
          ) : (
            <>
              <Button
                variant="contained"
                color={isRecording ? "secondary" : "primary"}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!isConnected}
              >
                {isRecording ? '録音停止' : '録音開始'}
              </Button>
              <Button
                variant="outlined"
                onClick={handleEndSession}
                disabled={!isConnected}
              >
                セッション終了
              </Button>
            </>
          )}
        </Box>
      ) : (
        <Button
          variant="contained"
          onClick={() => navigate('/')}
          sx={{ mt: 2 }}
        >
          ホームに戻る
        </Button>
      )}

      {feedback}

      {isConnecting && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <CircularProgress />
        </Box>
      )}
      <div id="audio-container" style={{ display: "none" }}></div>
    </Box>
  );
};

export default ReviewPage; 