import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { api, setToken } from "@/src/api/client";
import { C } from "@/src/theme/colors";
import { GradientCTA } from "@/src/components/GradientCTA";

const isWeb = Platform.OS === "web";
const webOnly = (style: object) => (isWeb ? (style as any) : {});

const KF_FADE_UP = {
  from: { opacity: 0, transform: [{ translateY: 24 }] },
  to: { opacity: 1, transform: [{ translateY: 0 }] },
};
const enter = (delayMs: number) =>
  webOnly({
    animationKeyframes: KF_FADE_UP,
    animationDuration: "700ms",
    animationDelay: `${delayMs}ms`,
    animationTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
    animationFillMode: "both",
  });

export default function OtpScreen() {
  const router = useRouter();
  const { email, devCode } = useLocalSearchParams<{ email: string; devCode?: string }>();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (code.length !== 6) {
      setErr("Enter the 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const res = await api.verifyCode(String(email), code);
      await setToken(res.token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(res.onboarded ? "/(tabs)/discover" : "/onboarding/profile");
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErr("Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#FFFFFF", "#F3F0FF"]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 0.6 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.topBar}>
            <Pressable onPress={() => router.back()} testID="otp-back" style={styles.backBtn}>
              <Ionicons name="chevron-back" size={20} color={C.onSurface} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          </View>

          <View style={styles.centerWrap}>
            <View style={[styles.card, enter(0)]}>
              <View style={styles.iconWrap}>
                <Ionicons name="mail-open-outline" size={26} color={C.brand} />
              </View>
              <Text style={styles.h1}>Check your inbox</Text>
              <Text style={styles.sub}>
                We sent a 6-digit code to{"\n"}
                <Text style={styles.email}>{email}</Text>
              </Text>
              <TextInput
                testID="otp-input"
                value={code}
                onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••••"
                placeholderTextColor={C.onSurfaceTertiary}
                keyboardType="number-pad"
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={[styles.input, focused && styles.inputFocused]}
                maxLength={6}
              />
              {devCode ? (
                <View style={styles.devBox} testID="dev-code-banner">
                  <Text style={styles.devTitle}>Dev mode</Text>
                  <Text style={styles.devText}>
                    SMTP isn&apos;t configured. Your code is{" "}
                    <Text style={styles.devCode}>{devCode}</Text>
                  </Text>
                </View>
              ) : null}
              {err && <Text style={styles.err} testID="otp-error">{err}</Text>}

              <View style={{ marginTop: 22 }}>
                <GradientCTA
                  testID="otp-verify-button"
                  label={loading ? "Verifying…" : "Verify"}
                  onPress={submit}
                  loading={loading}
                  icon="checkmark"
                />
              </View>
            </View>

            <View style={[styles.hintRow, enter(140)]}>
              <Ionicons name="time-outline" size={13} color={C.onSurfaceTertiary} />
              <Text style={styles.hintText}>Codes expire in 10 minutes. Check spam if you don&apos;t see it.</Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: { paddingHorizontal: 20, paddingTop: 16 },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingRight: 10,
  },
  backText: { color: C.onSurface, fontSize: 15, fontWeight: "600" },
  centerWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    width: "100%",
  },
  card: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: C.bg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 26,
    ...webOnly({ boxShadow: "0 16px 44px rgba(0,0,0,0.08)" }),
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: C.brandTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  h1: { fontSize: 24, fontWeight: "800", color: C.onSurface, letterSpacing: -0.4 },
  sub: { fontSize: 14, color: C.onSurfaceSecondary, marginTop: 8, marginBottom: 22, lineHeight: 21 },
  email: { fontWeight: "700", color: C.onSurface },
  input: {
    backgroundColor: C.surfaceSecondary,
    borderRadius: 14,
    fontSize: 30,
    letterSpacing: 12,
    textAlign: "center",
    paddingVertical: 16,
    color: C.onSurface,
    borderWidth: 1.5,
    borderColor: C.border,
    fontWeight: "700",
    ...webOnly({ transition: "border-color 0.2s ease, background-color 0.2s ease", outlineStyle: "none" }),
  },
  inputFocused: { borderColor: C.brand, backgroundColor: C.bg },
  devBox: {
    marginTop: 16,
    padding: 16,
    backgroundColor: C.brandTint,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,212,180,0.3)",
  },
  devTitle: { fontSize: 12, fontWeight: "800", color: C.onBrandTint, letterSpacing: 1, marginBottom: 4 },
  devText: { fontSize: 14, color: C.onBrandTint },
  devCode: { fontWeight: "900", letterSpacing: 4, fontSize: 18 },
  err: { color: C.error, marginTop: 12, fontSize: 14 },
  hintRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 20 },
  hintText: { fontSize: 12.5, color: C.onSurfaceTertiary },
});
