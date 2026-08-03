/**
 * Live-camera-only capture — deliberately has NO upload/library option anywhere.
 *
 * Web: opens the laptop/desktop webcam directly via getUserMedia (a real live
 * feed) and captures a frame from it. expo-image-picker's web implementation
 * falls back to a plain <input type="file"> under the hood — on desktop
 * browsers the `capture` attribute is ignored, so that path silently becomes
 * a file picker instead of the camera. This component avoids that entirely.
 *
 * Native (iOS/Android): expo-image-picker's launchCameraAsync already opens
 * the real device camera UI (not the photo library) — no separate "choose
 * from library" option is offered here.
 */
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { C, R, S } from "@/src/theme/colors";

type Props = {
  onCapture: (dataUri: string) => void;
  onError?: (message: string) => void;
  size?: number;
};

export function LiveCameraCapture(props: Props) {
  if (Platform.OS === "web") return <WebLiveCamera {...props} />;
  return <NativeCameraButton {...props} />;
}

// ── Native: real OS camera, no library fallback ────────────────────────────

function NativeCameraButton({ onCapture, onError }: Props) {
  const [busy, setBusy] = useState(false);

  const takePhoto = async () => {
    setBusy(true);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        onError?.("Camera permission is needed to verify.");
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
      if (!res.canceled && res.assets?.[0]?.base64) {
        const mime = res.assets[0].mimeType || "image/jpeg";
        onCapture(`data:${mime};base64,${res.assets[0].base64}`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable style={styles.captureBtn} onPress={takePhoto} disabled={busy} testID="live-camera-capture">
      <Ionicons name="camera" size={22} color={C.onBrand} />
      <Text style={styles.captureBtnText}>{busy ? "Opening camera…" : "Open Camera"}</Text>
    </Pressable>
  );
}

// ── Web: real getUserMedia webcam feed, no <input type=file> anywhere ──────

function WebLiveCamera({ onCapture, onError, size = 280 }: Props) {
  // Typed `any` rather than HTMLVideoElement/MediaStream — this project's
  // tsconfig intentionally omits the DOM lib (React Native's own globals
  // would otherwise conflict), matching the @ts-ignore pattern already used
  // for the <iframe> map embeds elsewhere in this codebase.
  const videoRef = useRef<any>(null);
  const streamRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [starting, setStarting] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // @ts-ignore — browser-only global
      if (!navigator?.mediaDevices?.getUserMedia) {
        setFailed(true);
        setStarting(false);
        onError?.("This browser doesn't support camera access. Try a modern browser like Chrome, Edge, or Firefox.");
        return;
      }
      try {
        // @ts-ignore
        const stream: any = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t: any) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
      } catch (e: any) {
        setFailed(true);
        onError?.(
          e?.name === "NotAllowedError"
            ? "Camera permission denied. Please allow camera access in your browser to verify."
            : "Couldn't access your camera. Make sure it's connected and not in use by another app."
        );
      } finally {
        setStarting(false);
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t: any) => t.stop());
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    // @ts-ignore — browser-only global
    const canvas = document.createElement("canvas");
    const side = Math.min(video.videoWidth, video.videoHeight) || size;
    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const sx = (video.videoWidth - side) / 2;
    const sy = (video.videoHeight - side) / 2;
    ctx.translate(side, 0);
    ctx.scale(-1, 1); // mirror so the capture matches what the user sees in preview
    ctx.drawImage(video, sx, sy, side, side, 0, 0, side, side);
    onCapture(canvas.toDataURL("image/jpeg", 0.85));
  };

  return (
    <View style={styles.webWrap}>
      <View style={[styles.videoWrap, { height: size }]}>
        {/* @ts-ignore — DOM element on web only */}
        <video
          ref={videoRef}
          playsInline
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
        />
        {starting && (
          <View style={styles.videoOverlay}>
            <Text style={styles.overlayText}>Starting camera…</Text>
          </View>
        )}
        {failed && (
          <View style={styles.videoOverlay}>
            <Ionicons name="videocam-off-outline" size={32} color="#fff" />
            <Text style={styles.overlayText}>Camera unavailable</Text>
          </View>
        )}
      </View>
      <Pressable style={styles.captureBtn} onPress={capture} disabled={!ready} testID="live-camera-capture">
        <Ionicons name="camera" size={22} color={C.onBrand} />
        <Text style={styles.captureBtnText}>Take Photo</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  webWrap: { gap: S.md, alignItems: "center" },
  videoWrap: {
    width: "100%", borderRadius: R.lg, overflow: "hidden",
    backgroundColor: "#000", borderWidth: 2, borderColor: C.brand,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)", gap: 8,
  },
  overlayText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  captureBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: C.brand, paddingVertical: 16, borderRadius: R.pill, width: "100%",
  },
  captureBtnText: { color: C.onBrand, fontWeight: "800", fontSize: 15 },
});
