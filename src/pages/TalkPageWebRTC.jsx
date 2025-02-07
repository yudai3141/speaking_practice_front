// frontend/src/pages/TalkPageWebRTC.jsx
import React, { useEffect, useRef, useState, useCallback, Suspense } from "react";
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
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

/**
 * このコンポーネントで:
 * 1) ephemeral key をサーバ(/session)から取得
 * 2) WebRTC接続 (マイク音声→送信、AI音声→受信)
 * 3) DataChannel でリアルタイムの文字起こしなどを取得し、messagesに蓄積
 * 4) 会話終了時 handleFinalize() でサーバへログを送信し、さらにGPTからの抽出結果を保存
 */

// 3Dモデルコンポーネント
function TanukiModel({ isSpeaking }) {
  const group = useRef();
  const [model, setModel] = useState(null);
  const [head, setHead] = useState(null);

  // モデルのロード
  useEffect(() => {
    const loader = new GLTFLoader();
    loader.loadAsync('https://models.readyplayer.me/67a3117cd3d5013705a1c4ba.glb')
      .then((gltf) => {
        const loadedModel = gltf.scene;
        const headMesh = loadedModel.getObjectByName('Wolf3D_Head');
        
        // デバッグ: 利用可能なモーフターゲットを確認
        if (headMesh && headMesh.morphTargetDictionary) {
          console.log('Available morph targets:', Object.keys(headMesh.morphTargetDictionary));
          console.log('Morph target dictionary:', headMesh.morphTargetDictionary);
        } else {
          console.log('Head mesh or morph targets not found:', headMesh);
        }

        setModel(loadedModel);
        setHead(headMesh);
      })
      .catch((error) => {
        console.error('Error loading model:', error);
      });
  }, []);

  // 表情制御
  useEffect(() => {
    if (!head || !head.morphTargetDictionary) return;

    // Ready Player Meの正しいモーフターゲット名を使用
    const morphTargetDictionary = {
      mouthOpen: head.morphTargetDictionary['viseme_AA'],  // 口を開ける
      mouthSmile: head.morphTargetDictionary['mouthSmile'] // 笑顔
    };

    // 口の開閉アニメーション
    let frameId;
    const animateMouth = () => {
      if (isSpeaking) {
        const time = Date.now() * 0.01;
        const openAmount = 0.15 + Math.sin(time) * 0.1 + Math.sin(time * 1.5) * 0.05;
        
        // viseme_AAを使用して口を動かす
        if (typeof morphTargetDictionary.mouthOpen !== 'undefined') {
          head.morphTargetInfluences[morphTargetDictionary.mouthOpen] = openAmount;
        }
      } else {
        if (typeof morphTargetDictionary.mouthOpen !== 'undefined') {
          head.morphTargetInfluences[morphTargetDictionary.mouthOpen] = 0;
        }
      }
      frameId = requestAnimationFrame(animateMouth);
    };

    animateMouth();
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [head, isSpeaking]);

  return (
    <group ref={group}>
      {model && (
        <primitive 
          object={model} 
          scale={1.5}
          position={[0, 0.5, 0]}
          rotation={[0, -Math.PI / 8, 0]}
        />
      )}
    </group>
  );
}

function SimpleAvatar({ isSpeaking }) {
  const [blinkState, setBlinkState] = useState(1);
  const timeRef = useRef(0);
  const waveRefs = useRef([]);
  const circuitRefs = useRef([]);
  const isAnimatingRef = useRef(false);  // アニメーション状態を追跡
  const animationEndTimeRef = useRef(0);  // アニメーション終了時間を追跡

  // 瞬きアニメーション
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlinkState(prev => prev === 1 ? 0 : 1);
    }, 3000);
    return () => clearInterval(blinkInterval);
  }, []);

  // isSpeakingの変更を監視
  useEffect(() => {
    if (isSpeaking) {
      isAnimatingRef.current = true;
    } else {
      // 話し終わってから1秒後にアニメーションを停止
      animationEndTimeRef.current = timeRef.current + 1;
    }
  }, [isSpeaking]);

  // 継続的なアニメーションの更新
  useFrame((state, delta) => {
    timeRef.current += delta;

    // アニメーション終了判定
    if (!isSpeaking && timeRef.current > animationEndTimeRef.current) {
      isAnimatingRef.current = false;
    }

    // 波形アニメーション
    waveRefs.current.forEach((mesh, index) => {
      if (!mesh) return;

      if (isAnimatingRef.current) {
        // より複雑な波形パターン
        const baseFreq = timeRef.current * 8;
        const height = 0.1 + 
          Math.sin(baseFreq + index * 0.5) * 0.15 +
          Math.sin(baseFreq * 1.5 + index) * 0.1 +
          Math.sin(baseFreq * 0.5 - index * 0.2) * 0.05;
        
        mesh.scale.y = Math.max(0.05, height);
      } else {
        mesh.scale.y = 0.05;  // 最小値
      }
    });

    // 回路アニメーション
    circuitRefs.current.forEach((mesh, index) => {
      if (!mesh || !mesh.material) return;

      if (isAnimatingRef.current) {
        const opacity = 0.3 + 
          Math.sin(timeRef.current * 2 + index) * 0.2 +
          Math.sin(timeRef.current + index * 0.5) * 0.1;
        mesh.material.opacity = opacity;
      } else {
        mesh.material.opacity = 0.1;
      }
    });
  });

  return (
    <group>
      {/* 背景のグロー効果 */}
      <mesh position={[0, 0, -0.2]}>
        <circleGeometry args={[1.4, 32]} />
        <meshBasicMaterial color="#00ff00" opacity={0.1} transparent={true} />
      </mesh>

      {/* メインの顔 */}
      <mesh position={[0, 0, -0.1]}>
        <circleGeometry args={[1.2, 32]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>

      {/* 口（波形ビジュアライザー） */}
      <group position={[0, -0.2, 0]}>
        {Array.from({ length: 10 }).map((_, i) => (
          <mesh 
            key={`wave-${i}`}
            position={[-0.45 + i * 0.1, 0, 0.1]}
            ref={el => waveRefs.current[i] = el}
          >
            <boxGeometry args={[0.08, 1, 0.01]} />
            <meshBasicMaterial 
              color="#00ff00"
              opacity={isSpeaking ? 1 : 0.5}
              transparent={true}
            />
          </mesh>
        ))}
      </group>

      {/* デジタル回路のような模様 */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh 
          key={`circuit-${i}`}
          position={[
            Math.cos(i * Math.PI / 4) * 0.8,
            Math.sin(i * Math.PI / 4) * 0.8,
            -0.05
          ]}
          ref={el => circuitRefs.current[i] = el}
        >
          <boxGeometry args={[0.1, 0.1, 0.01]} />
          <meshBasicMaterial 
            color="#00ff00" 
            opacity={0.1}
            transparent={true}
          />
        </mesh>
      ))}

      {/* 左目 */}
      <group position={[-0.3, 0.2, 0]}>
        {/* 目の外枠 */}
        <mesh position={[0, 0, 0.05]}>
          <ringGeometry args={[0.15, 0.18, 32]} />
          <meshBasicMaterial color="#00ff00" />
        </mesh>
        {/* 目の中身 */}
        <mesh position={[0, 0, 0.1]}>
          <circleGeometry args={[0.15 * blinkState, 32]} />
          <meshBasicMaterial color="#00ff00" />
        </mesh>
      </group>

      {/* 右目 */}
      <group position={[0.3, 0.2, 0]}>
        <mesh position={[0, 0, 0.05]}>
          <ringGeometry args={[0.15, 0.18, 32]} />
          <meshBasicMaterial color="#00ff00" />
        </mesh>
        <mesh position={[0, 0, 0.1]}>
          <circleGeometry args={[0.15 * blinkState, 32]} />
          <meshBasicMaterial color="#00ff00" />
        </mesh>
      </group>

      {/* 装飾的な要素（ホログラム風） */}
      {isSpeaking && Array.from({ length: 3 }).map((_, i) => (
        <mesh 
          key={`holo-${i}`}
          position={[0, 0, -0.15 - i * 0.05]}
          rotation={[0, 0, timeRef.current + i * Math.PI / 3]}
        >
          <ringGeometry args={[1.2 + i * 0.1, 1.21 + i * 0.1, 32]} />
          <meshBasicMaterial 
            color="#00ff00" 
            opacity={0.1 - i * 0.02} 
            transparent={true}
          />
        </mesh>
      ))}
    </group>
  );
}

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
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);

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
      // 音声関連のイベントのみログ出力
      if (evt.type.includes('audio')) {
        console.log('[Audio Event]:', evt.type, '- isSpeaking:', isAISpeaking);
      }

      // ユーザーの発話開始を検知
      if (evt.type === "input_audio_buffer.speech_started") {
        console.log('[Audio] User started speaking');
        // ユーザーが話し始めたら、AIの発話を停止
        setIsAISpeaking(false);
        
        // 音声出力を一時停止
        if (audioRef.current) {
          audioRef.current.pause();
        }
      }
      // ユーザーの発話終了を検知
      else if (evt.type === "input_audio_buffer.speech_stopped") {
        console.log('[Audio] User stopped speaking');
        // 音声出力を再開
        if (audioRef.current) {
          audioRef.current.play().catch(e => {
            console.warn('Failed to resume audio:', e);
          });
        }
      }

      // AIの音声開始イベントの判定
      if (evt.type === "output_audio_buffer.audio_started") {
        // ユーザーが話していない場合のみAIの発話を開始
        if (!isUserSpeaking) {
          console.log('[Audio] Starting AI speech');
          setIsAISpeaking(true);
          // 新しい音声が始まるときは必ず再生を開始
          if (audioRef.current) {
            audioRef.current.play().catch(e => {
              console.warn('Failed to start audio:', e);
            });
          }
        }
      }
      // AIの音声終了イベントの判定
      else if (evt.type === "output_audio_buffer.audio_stopped") {
        console.log('[Audio] Ending AI speech');
        setIsAISpeaking(false);
      }

      // 以下は音声状態に影響を与えないイベント
      if (evt.type === "response.audio_transcript.delta") {
        setPartialText((prev) => prev + evt.delta);
      }
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
    [isAISpeaking, isUserSpeaking]
  );

  // ユーザーの発話状態を監視
  useEffect(() => {
    if (!mediaStreamRef.current) return;

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(mediaStreamRef.current);
    source.connect(analyser);

    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkVolume = () => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      
      // 音量閾値を超えた場合をユーザーの発話として検知
      const isSpeeking = average > 30;  // この閾値は調整が必要
      if (isSpeeking !== isUserSpeaking) {
        setIsUserSpeaking(isSpeeking);
      }

      requestAnimationFrame(checkVolume);
    };

    checkVolume();

    return () => {
      audioContext.close();
    };
  }, [mediaStreamRef.current, isUserSpeaking]);

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
      {/* 3Dモデル表示エリア */}
      <div style={{ 
        width: '100%', 
        height: '600px',
        marginBottom: '20px',
        border: '1px solid #00ff00',
        borderRadius: '8px',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #000000 0%, #0a0a0a 100%)',
        boxShadow: '0 0 20px rgba(0, 255, 0, 0.2)'
      }}>
        <Canvas
          camera={{ 
            position: [0, 0, 3],
            fov: 50,
            near: 0.1,
            far: 1000
          }}
        >
          <color attach="background" args={['#000000']} />
          <fog attach="fog" args={['#000000', 3, 7]} />
          <ambientLight intensity={1} />
          <Suspense fallback={null}>
            <SimpleAvatar isSpeaking={isAISpeaking} />
          </Suspense>
        </Canvas>
      </div>

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