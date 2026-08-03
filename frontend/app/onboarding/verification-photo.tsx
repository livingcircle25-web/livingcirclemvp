import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Screen } from "@/src/components/OnboardScreen";
import { api } from "@/src/api/client";
import { LiveCameraCapture } from "@/src/components/LiveCameraCapture";
import { C, R, S } from "@/src/theme/colors";

const HOW_IT_WORKS = [
  "You take a clear photo of yourself",
  "It's stored privately — never shown to anyone, ever",
  "When you match with someone, you'll both take a quick photo confirming it's really you",
  "Chat only unlocks once both sides confirm",
];

const CHECKLIST = [
  "Good lighting — your face is clearly visible",
  "Facing the camera, no sunglasses or filters",
  "Just you in the frame",
];

export default function VerificationPhotoStep() {
  const router = useRouter();
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onNext = async () => {
    if (!photo) return;
    setSaving(true);
    setError(null);
    try {
      await api.uploadVerificationPhoto(photo);
      router.push("/onboarding/details");
    } catch (e: any) {
      // The backend returns a specific, actionable reason (e.g. "no face
      // detected") as JSON `{"detail": "..."}` inside the error message.
      const msg = String(e?.message || "");
      const jsonStart = msg.indexOf("{");
      let detail: string | null = null;
      if (jsonStart >= 0) {
        try { detail = JSON.parse(msg.slice(jsonStart)).detail; } catch {}
      }
      setError(detail || "Couldn't save your photo. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      testID="onboard-verification-photo"
      title="Verify it's really you"
      subtitle="Step 2 of 5"
      step={2} total={5}
      onBack={() => router.back()}
      cta={saving ? "Saving…" : "Continue"}
      ctaDisabled={!photo || saving}
      onCta={onNext}
    >
      <View style={styles.explainCard}>
        <Text style={styles.explainTitle}>📸 Why we ask for this</Text>

        <View style={styles.row}>
          <Ionicons name="lock-closed" size={16} color={C.brand} />
          <Text style={styles.rowTitle}>Verification &amp; safety, not display</Text>
        </View>
        <Text style={styles.rowBody}>
          This photo is used only to confirm you&apos;re a real person when you match with someone —
          it is never shown on your profile or to anyone else.
        </Text>

        <Text style={styles.sectionLabel}>HOW IT WORKS</Text>
        {HOW_IT_WORKS.map((t, i) => (
          <View key={t} style={styles.stepRow}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
            <Text style={styles.stepText}>{t}</Text>
          </View>
        ))}

        <Text style={styles.sectionLabel}>YOUR PRIVACY</Text>
        <View style={styles.bullet}><Text style={styles.bulletDot}>✓</Text><Text style={styles.bulletText}>Never displayed on your profile</Text></View>
        <View style={styles.bullet}><Text style={styles.bulletDot}>✓</Text><Text style={styles.bulletText}>Never shown to other users</Text></View>
        <View style={styles.bullet}><Text style={styles.bulletDot}>✓</Text><Text style={styles.bulletText}>Stored securely, not exposed by any API</Text></View>
      </View>

      <Text style={styles.label}>Your photo</Text>

      {photo ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri: photo }} style={styles.preview} />
          <Pressable style={styles.retakeBtn} onPress={() => setPhoto(null)} testID="verification-photo-retake">
            <Ionicons name="camera-reverse-outline" size={16} color={C.brand} />
            <Text style={styles.retakeText}>Retake</Text>
          </Pressable>
        </View>
      ) : (
        <LiveCameraCapture
          onCapture={(uri) => { setPhoto(uri); setError(null); }}
          onError={setError}
        />
      )}

      <View style={styles.checklist}>
        {CHECKLIST.map((c) => (
          <View key={c} style={styles.checkRow}>
            <Ionicons name="checkmark-circle-outline" size={16} color={C.onSurfaceSecondary} />
            <Text style={styles.checkText}>{c}</Text>
          </View>
        ))}
      </View>

      {error && <Text style={styles.err}>{error}</Text>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  explainCard: {
    backgroundColor: C.brandTint,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    padding: S.lg,
    marginBottom: S.xl,
  },
  explainTitle: { fontSize: 16, fontWeight: "800", color: C.onSurface, marginBottom: S.md },
  row: { flexDirection: "row", alignItems: "center", gap: S.sm, marginBottom: 4 },
  rowTitle: { fontSize: 14, fontWeight: "700", color: C.onSurface },
  rowBody: { fontSize: 13, color: C.onSurfaceSecondary, lineHeight: 19, marginBottom: S.md },
  sectionLabel: { fontSize: 11, fontWeight: "800", color: C.brand, letterSpacing: 1, marginTop: S.md, marginBottom: S.sm },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: S.sm, marginBottom: S.sm },
  stepNum: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: C.brand,
    alignItems: "center", justifyContent: "center", marginTop: 1,
  },
  stepNumText: { color: C.onBrand, fontSize: 11, fontWeight: "800" },
  stepText: { flex: 1, fontSize: 13, color: C.onSurfaceSecondary, lineHeight: 19 },
  bullet: { flexDirection: "row", alignItems: "flex-start", gap: S.sm, marginBottom: 4 },
  bulletDot: { color: C.success, fontWeight: "900", fontSize: 13 },
  bulletText: { flex: 1, fontSize: 13, color: C.onSurfaceSecondary, lineHeight: 19 },
  label: { fontSize: 14, color: C.onSurfaceSecondary, marginBottom: S.sm, fontWeight: "600" },
  previewWrap: { alignItems: "center", gap: S.md },
  preview: { width: 160, height: 160, borderRadius: R.lg, borderWidth: 2, borderColor: C.brand },
  retakeBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  retakeText: { color: C.brand, fontSize: 14, fontWeight: "700" },
  checklist: { marginTop: S.lg, gap: 6 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: S.sm },
  checkText: { fontSize: 13, color: C.onSurfaceSecondary },
  err: { color: C.error, marginTop: S.md, fontSize: 14, textAlign: "center" },
});
