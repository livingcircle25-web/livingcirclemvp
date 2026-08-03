import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/src/api/client";
import { LiveCameraCapture } from "@/src/components/LiveCameraCapture";
import { C, R, S } from "@/src/theme/colors";

type Stage = "loading" | "intro" | "capture" | "submitting" | "pending" | "rejected" | "done" | "error";

const STEPS = [
  "Look straight at the camera",
  "Make sure your face is clearly lit",
  "Take the photo now, in the moment",
];

export default function PoolingVerifyScreen() {
  const router = useRouter();
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const [stage, setStage] = useState<Stage>("loading");
  const [listingId, setListingId] = useState<string | null>(null);
  const [address, setAddress] = useState("this place");
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [similarity, setSimilarity] = useState<number | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const reqs = await api.poolingMyRequests();
      const r = reqs.find((x: any) => x.id === requestId);
      if (!r) { setError("Request not found."); setStage("error"); return; }
      setListingId(r.listing_id);
      setAddress(r.listing?.address || r.listing?.area || "this place");
      if (r.status !== "accepted") { setError("This request hasn't been accepted yet."); setStage("error"); return; }
      if (r.verified) setStage("done");
      else setStage("intro");
    } catch {
      setError("Couldn't load request status.");
      setStage("error");
    }
  }, [requestId]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const confirmAndSubmit = useCallback(async () => {
    if (!photo) return;
    setStage("submitting");
    setError(null);
    try {
      const res = await api.poolingSubmitVerification(String(requestId), photo);
      setResultMessage(res.message);
      setSimilarity(res.similarity);
      if (res.status === "approved") setStage("done");
      else if (res.status === "pending") setStage("pending");
      else setStage("rejected");
    } catch {
      setError("Verification failed to submit. Please try again.");
      setStage("capture");
    }
  }, [requestId, photo]);

  if (stage === "loading") {
    return (
      <SafeAreaView style={[styles.safe, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={C.brand} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} testID="pooling-verify-back">
          <Ionicons name="chevron-back" size={22} color={C.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Verify to join</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {stage === "intro" && (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.heroEmoji}>✅</Text>
              <Text style={styles.heroTitle}>Request accepted!</Text>
              <Text style={styles.heroSub}>
                Before you join the group chat for {address}, confirm it&apos;s really you.
              </Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>WHAT YOU&apos;LL DO</Text>
              {STEPS.map((s, i) => (
                <View key={s} style={styles.stepRow}>
                  <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
                  <Text style={styles.stepText}>{s}</Text>
                </View>
              ))}
              <Text style={styles.cardNote}>
                We compare this photo with your private onboarding verification photo using
                on-device face matching (DeepFace) — proving you&apos;re really you.
              </Text>
            </View>
            <Pressable style={styles.primaryBtn} onPress={() => setStage("capture")} testID="pooling-verify-start">
              <Ionicons name="camera-outline" size={18} color={C.onBrand} />
              <Text style={styles.primaryBtnText}>Start Verification</Text>
            </Pressable>
          </>
        )}

        {stage === "capture" && (
          <>
            {!photo ? (
              <LiveCameraCapture onCapture={setPhoto} onError={setError} />
            ) : (
              <View style={styles.previewCard}>
                <Image source={{ uri: photo }} style={styles.previewImg} resizeMode="cover" />
                <Pressable style={styles.changePill} onPress={() => setPhoto(null)} testID="pooling-verify-retake">
                  <Ionicons name="refresh-outline" size={14} color={C.brand} />
                  <Text style={styles.changePillText}>Retake</Text>
                </Pressable>
              </View>
            )}
            {photo && (
              <Pressable style={styles.primaryBtn} onPress={confirmAndSubmit} testID="pooling-verify-confirm">
                <Ionicons name="checkmark-circle-outline" size={20} color={C.onBrand} />
                <Text style={styles.primaryBtnText}>Yes, this is really me</Text>
              </Pressable>
            )}
          </>
        )}

        {stage === "submitting" && (
          <View style={styles.heroCard}>
            <ActivityIndicator color={C.brand} />
            <Text style={styles.heroSub}>Submitting…</Text>
          </View>
        )}

        {stage === "pending" && (
          <View style={styles.heroCard}>
            <Text style={styles.heroEmoji}>⏳</Text>
            <Text style={styles.heroTitle}>Verification pending</Text>
            <Text style={styles.heroSub}>{resultMessage}</Text>
            {similarity != null && <Text style={styles.similarityText}>Match confidence: {similarity}%</Text>}
          </View>
        )}

        {stage === "rejected" && (
          <View style={styles.heroCard}>
            <Text style={styles.heroEmoji}>❌</Text>
            <Text style={styles.heroTitle}>Verification failed</Text>
            <Text style={styles.heroSub}>{resultMessage}</Text>
            {similarity != null && <Text style={styles.similarityText}>Match confidence: {similarity}%</Text>}
            <Pressable style={styles.primaryBtn} onPress={() => { setPhoto(null); setStage("capture"); }} testID="pooling-verify-try-again">
              <Ionicons name="camera-outline" size={18} color={C.onBrand} />
              <Text style={styles.primaryBtnText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {stage === "done" && (
          <View style={styles.heroCard}>
            <Text style={styles.heroEmoji}>✅</Text>
            <Text style={styles.heroTitle}>You&apos;re verified!</Text>
            <Text style={styles.heroSub}>The group chat for {address} is unlocked.</Text>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => router.replace({ pathname: "/pooling/group/[listingId]", params: { listingId: String(listingId) } })}
              testID="pooling-verify-open-group"
            >
              <Ionicons name="chatbubbles-outline" size={18} color={C.onBrand} />
              <Text style={styles.primaryBtnText}>Open Group Chat</Text>
            </Pressable>
          </View>
        )}

        {stage === "error" && (
          <View style={styles.heroCard}>
            <Text style={styles.heroEmoji}>⚠️</Text>
            <Text style={styles.heroSub}>{error}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: S.lg, paddingVertical: 14,
    backgroundColor: C.surfaceSecondary, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: C.surfaceGlass,
    borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "800", color: C.onSurface },
  scroll: { padding: S.xl, gap: 16, paddingBottom: S.xxxl },

  heroCard: {
    backgroundColor: C.surfaceSecondary, borderRadius: R.lg, borderWidth: 1, borderColor: C.border,
    padding: 24, alignItems: "center", gap: 10,
  },
  heroEmoji: { fontSize: 40 },
  heroTitle: { fontSize: 20, fontWeight: "900", color: C.onSurface },
  heroSub: { fontSize: 14, color: C.onSurfaceSecondary, textAlign: "center", lineHeight: 20 },

  card: { backgroundColor: C.brandTint, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, padding: 18, gap: 8 },
  cardTitle: { fontSize: 12, fontWeight: "800", color: C.brand, letterSpacing: 1, marginBottom: 4 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: S.sm },
  stepNum: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.brand, alignItems: "center", justifyContent: "center", marginTop: 1 },
  stepNumText: { color: C.onBrand, fontSize: 11, fontWeight: "800" },
  stepText: { flex: 1, fontSize: 13, color: C.onSurfaceSecondary, lineHeight: 19 },
  cardNote: { fontSize: 12, color: C.onSurfaceTertiary, lineHeight: 18, marginTop: 8, fontStyle: "italic" },

  previewCard: { borderRadius: R.lg, overflow: "hidden", borderWidth: 2, borderColor: C.brand },
  previewImg: { width: "100%", height: 260 },
  changePill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.surfaceSecondary, justifyContent: "center", paddingVertical: 10 },
  changePillText: { color: C.brand, fontSize: 13, fontWeight: "700" },

  primaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: C.brand, paddingVertical: 16, borderRadius: R.pill,
  },
  primaryBtnText: { color: C.onBrand, fontWeight: "800", fontSize: 15 },
  similarityText: { fontSize: 12, color: C.onSurfaceTertiary, fontWeight: "600" },
});
