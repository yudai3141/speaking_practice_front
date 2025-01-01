// frontend/src/pages/TalkPageWebRTC.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { finalizeConversation } from "../api/conversationApi"; // API呼び出し関数をインポート

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

      const baseUrl = "https://api.openai.com/v1/realtime"; // 確認が必要
      const model = "gpt-4o-realtime-preview-2024-12-17"; // ユーザー指示通り
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
      messages: messages, // 例: [{ role: "assistant", text: "..." }, ...]
    };
    console.log("Finalizing conversation with payload:", payload); // デバッグ用
    try {
      const res = await finalizeConversation(payload);
      console.log("Conversation saved:", res);
      alert(
        `会話ログを保存しました。\n` +
          `抽出された表現数: ${res.extracted_count}\n` +
          `会話DocID: ${res.doc_id}`
      );

      // WebRTC接続を終了する処理を追加
      stopConnection();
    } catch (err) {
      console.error("Failed to finalize conversation:", err);
      alert("会話保存に失敗しました。");
    }
  };

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
    </div>
  );
};

export default TalkPageWebRTC;
