// frontend/src/pages/TalkPageWebRTC.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { finalizeConversation } from "../api/conversationApi"; // API呼び出し関数をインポート
import { saveSelectedExpressions } from "../api/expressionsApi";  // 追加
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  Typography,
  FormControlLabel,
  Box
} from '@mui/material';

/**
 * このコンポーネントで:
 * 1) ephemeral key をサーバ(/session)から取得
 * 2) WebRTC接続 (マイク音声→送信、AI音声→受信)
 * 3) DataChannel でリアルタイムの文字起こしなどを取得し、messagesに蓄積
 * 4) 会話終了時 handleFinalize() でサーバへログを送信し、さらにGPTからの抽出結果を保存
 */

const TalkPageWebRTC = () => {
  const pcRef = useRef(null);
  const dataChannelRef = useRef(null);
  const audioRef = useRef(null);
  const mediaStreamRef = useRef(null); // マイクのメディアストリームを保持

  // 処理済みのresponse_idを追跡するためのref
  const processedResponses = useRef(new Set());

  // state
  const [messages, setMessages] = useState([]);
  const [partialText, setPartialText] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false); // 接続中状態の追加
  const [extractedExpressions, setExtractedExpressions] = useState([]);
  const [selectedExpressions, setSelectedExpressions] = useState([]);
  const [showExpressionDialog, setShowExpressionDialog] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    // コンポーネントのアンマウント時に接続をクローズ
    return () => {
      stopConnection();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // WebRTC接続を開始する関数
  const startConnection = async () => {
    setIsConnecting(true);
    try {
      // 1) ephemeral keyをバックエンド(/session)から取得
      const resp = await fetch("/session");
      if (!resp.ok) {
        console.error("Failed to fetch /session:", resp.status, resp.statusText);
        alert("セッションの取得に失敗しました。");
        setIsConnecting(false);
        return;
      }
      const data = await resp.json();
      console.log("Session data:", data);
      const ephemeralKey = data?.client_secret?.value;
      if (!ephemeralKey) {
        console.error("No ephemeral key from server:", data);
        alert("サーバーから有効なセッションキーが返されませんでした。");
        setIsConnecting(false);
        return;
      }

      // 2) RTCPeerConnection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // -- Remote audio (AI音声) 用
      audioRef.current = document.createElement("audio");
      audioRef.current.autoplay = true;
      audioRef.current.controls = true; // ユーザーがオーディオをコントロールできるようにする
      pc.ontrack = (e) => {
        console.log("Got remote track:", e);
        audioRef.current.srcObject = e.streams[0];
      };
      // Audio要素をコンポーネント内に追加
      document.getElementById("audio-container").appendChild(audioRef.current);

      // -- Local mic track
      try {
        const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = ms; // メディアストリームを保存
        ms.getTracks().forEach((track) => pc.addTrack(track, ms));
      } catch (err) {
        console.error("Failed to get user media:", err);
        alert("マイクの取得に失敗しました。");
        setIsConnecting(false);
        return;
      }

      // -- Data channel 作成
      const dc = pc.createDataChannel("oai-events");
      dataChannelRef.current = dc;

      dc.onopen = () => {
        console.log("[WebRTC] DataChannel open");
        setIsConnected(true);
        setIsConnecting(false);

        // session.update の例（開始時に英語回答リクエストなど）
        const sessionUpdate = {
          type: "session.update",
          session: {
            instructions: "Please respond in English.",
            modalities: ["audio", "text"],
          },
        };
        dc.send(JSON.stringify(sessionUpdate));
      };

      dc.onmessage = (e) => {
        // Realtime APIからのイベントを受信
        let serverEvent;
        try {
          serverEvent = JSON.parse(e.data);
        } catch (err) {
          console.warn("Failed to parse server event:", e.data);
          return;
        }
        handleServerEvent(serverEvent);
      };

      // 3) SDP交換
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
        console.error("Failed to fetch SDP answer:", sdpResp.status, sdpResp.statusText);
        alert("SDPの取得に失敗しました。");
        setIsConnecting(false);
        return;
      }

      const answerSdp = await sdpResp.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      console.log("WebRTC connected to Realtime API!");
    } catch (err) {
      console.error("startConnection error:", err);
      alert("接続の初期化中にエラーが発生しました。");
      setIsConnecting(false);
    }
  };

  // WebRTC接続を終了する関数
  const stopConnection = () => {
    // RTCPeerConnectionを閉じる
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
      console.log("RTCPeerConnection closed.");
    }

    // DataChannelを閉じる
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
      console.log("DataChannel closed.");
    }

    // オーディオ要素を削除
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
      if (document.getElementById("audio-container").contains(audioRef.current)) {
        document.getElementById("audio-container").removeChild(audioRef.current);
      }
      audioRef.current = null;
      console.log("Audio element removed.");
    }

    // マイクのストリームを停止
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      console.log("Media stream tracks stopped.");
    }

    // 状態をリセット
    setIsConnected(false);
    setPartialText("");
    setMessages([]);
  };

  // handleServerEvent を useCallback でメモ化
  const handleServerEvent = useCallback(
    (evt) => {
      // Realtime API からの各種イベントをここでハンドリング
      console.log("[Realtime Event]", JSON.stringify(evt, null, 2));

      // 例: partial transcript (テキスト生成途中)
      if (evt.type === "response.audio_transcript.delta") {
        setPartialText((prev) => prev + evt.delta);
      }
      // 例: partial transcript が終了したら確定メッセージに追加
      else if (evt.type === "response.audio_transcript.done") {
        if (partialText.trim()) {
          setMessages((prev) => [...prev, { role: "assistant", text: partialText }]);
        }
        setPartialText("");
      }
      // response.done イベントの処理
      else if (evt.type === "response.done") {
        if (evt.response && Array.isArray(evt.response.output)) {
          const responseId = evt.response.id;
          // 既に処理済みのresponse_idでない場合のみ処理
          if (!processedResponses.current.has(responseId)) {
            processedResponses.current.add(responseId);

            // output 配列から transcript を抽出
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
        } else {
          console.warn("Unknown structure in response.done event:", evt);
        }
      }
      // conversation.item.created イベントの処理
      else if (evt.type === "conversation.item.created") {
        const item = evt.item;
        if (item && item.text) {
          setMessages((prev) => [...prev, { role: "assistant", text: item.text }]);
        }
      }
      // response.created イベントの処理
      else if (evt.type === "response.created") {
        const response = evt.response;
        if (response && response.message) {
          setMessages((prev) => [...prev, { role: "assistant", text: response.message }]);
        } else if (response && response.content) {
          setMessages((prev) => [...prev, { role: "assistant", text: response.content }]);
        } else {
          console.warn("Unknown structure in response.created event:", evt);
        }
      }
      // 他の必要なイベントタイプをここに追加
    },
    [partialText]
  );

  // 会話を終了し、会話ログをバックエンドへ送信 → GPTで有用表現抽出 → Firestoreへ保存
  const handleFinalize = async () => {
    if (!isConnected) {
      alert("接続が確立されていません。");
      return;
    }

    const userId = "demoUser";
    const payload = {
      user_id: userId,
      messages: messages,
    };

    try {
      // 会話を保存し、表現を抽出
      const res = await finalizeConversation(payload);
      console.log("Extracted expressions:", res.extracted_expressions);
      
      // 抽出された表現を状態に保存
      setExtractedExpressions(res.extracted_expressions);
      // デフォルトでは何も選択されていない状態にする
      setSelectedExpressions([]);
      setShowExpressionDialog(true);

    } catch (err) {
      console.error("Failed to finalize conversation:", err);
      alert("会話保存に失敗しました。");
    }

    // WebRTC接続を終了
    stopConnection();
  };

  // 選択された表現を保存する関数
  const handleSaveSelectedExpressions = async () => {
    try {
      // 選択された表現のみをフィルタリング
      const expressionsToSave = extractedExpressions
        .filter(expr => selectedExpressions.includes(expr.id))
        .map(({ id, ...expr }) => expr);  // 一時的なIDを削除
      
      console.log("Expressions to save:", expressionsToSave);

      // 選択された表現のみを保存
      const response = await saveSelectedExpressions(expressionsToSave);
      
      alert(`選択された表現（${expressionsToSave.length}個）を保存しました。`);
      setShowExpressionDialog(false);
      
    } catch (error) {
      console.error("Failed to save selected expressions:", error);
      alert("表現の保存に失敗しました。");
    }
  };

  // 全選択/全解除の処理
  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedExpressions(extractedExpressions.map(expr => expr.id));
    } else {
      setSelectedExpressions([]);
    }
  };

  // 表現選択ダイアログのコンポーネント
  const ExpressionSelectionDialog = () => (
    <Dialog 
      open={showExpressionDialog} 
      onClose={() => setShowExpressionDialog(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        抽出された表現を確認
        <Typography variant="subtitle1" color="textSecondary">
          保存したい表現を選択してください
        </Typography>
      </DialogTitle>
      <DialogContent>
        {/* 全選択チェックボックス */}
        <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={selectAll}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
            }
            label="全て選択/解除"
          />
        </Box>
        <List>
          {extractedExpressions.map((expr) => (
            <ListItem 
              key={expr.id} 
              divider
              style={{
                backgroundColor: selectedExpressions.includes(expr.id) 
                  ? '#e3f2fd' 
                  : 'transparent'
              }}
            >
              <ListItemText
                primary={
                  <Typography variant="subtitle1">
                    {expr.expression}
                  </Typography>
                }
                secondary={
                  <>
                    <Typography component="span" variant="body2">
                      意味: {expr.meaning}
                    </Typography>
                    <br />
                    <Typography component="span" variant="body2">
                      例文: {expr.example}
                    </Typography>
                  </>
                }
              />
              <ListItemSecondaryAction>
                <Checkbox
                  edge="end"
                  checked={selectedExpressions.includes(expr.id)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSelectedExpressions(prev => {
                      const newSelection = checked
                        ? [...prev, expr.id]
                        : prev.filter(id => id !== expr.id);
                      // 全選択状態の更新
                      setSelectAll(newSelection.length === extractedExpressions.length);
                      return newSelection;
                    });
                  }}
                />
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', px: 2 }}>
          <Typography color="textSecondary">
            {selectedExpressions.length} / {extractedExpressions.length} 個選択中
          </Typography>
          <Box>
            <Button onClick={() => setShowExpressionDialog(false)}>
              キャンセル
            </Button>
            <Button 
              onClick={handleSaveSelectedExpressions} 
              variant="contained" 
              color="primary"
              disabled={selectedExpressions.length === 0}
            >
              選択した表現を保存
            </Button>
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );

  return (
    <div style={{ padding: 20 }}>
      <h2>Talk Page (WebRTC + ephemeral key)</h2>
      {isConnected ? (
        <p style={{ color: "green" }}>Connected to Realtime API via WebRTC!</p>
      ) : isConnecting ? (
        <p style={{ color: "orange" }}>Connecting...</p>
      ) : (
        <p style={{ color: "red" }}>Disconnected</p>
      )}

      <div style={{ margin: "20px 0" }}>
        {/* 接続オン/オフボタン */}
        {!isConnected && !isConnecting ? (
          <button onClick={startConnection}>接続開始 (Connect)</button>
        ) : (
          <button onClick={stopConnection}>接続終了 (Disconnect)</button>
        )}
      </div>

      <div style={{ border: "1px solid #ccc", padding: 10, height: 200, overflow: "auto" }}>
        {/* 現在生成中のテキスト(assistant視点) */}
        {partialText && (
          <p style={{ color: "gray" }}>
            assistant(draft): {partialText}
          </p>
        )}
        {/* 確定したメッセージ */}
        {messages.map((m, idx) => (
          <p key={idx}>
            <strong>{m.role}:</strong> {m.text}
          </p>
        ))}
      </div>

      <div style={{ marginTop: "20px" }}>
        {/* Finalizeボタン */}
        <button onClick={handleFinalize} disabled={!isConnected}>
          会話ログ送信 (Finalize)
        </button>
      </div>

      {/* Audio要素のコンテナ */}
      <div id="audio-container" style={{ display: "none" }}></div>

      {/* 表現選択ダイアログを追加 */}
      <ExpressionSelectionDialog />
    </div>
  );
};

export default TalkPageWebRTC;