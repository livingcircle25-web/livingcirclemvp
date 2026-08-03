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
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { api } from "@/src/api/client";
import { C } from "@/src/theme/colors";
import { GradientCTA } from "@/src/components/GradientCTA";
import { AppLogo } from "@/src/components/AppLogo";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

export default function EmailScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    const e = email.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) {
      setErr("Enter a valid email address");
      return;
    }
    if (!agreed) {
      setErr("Please agree to the Terms of Service and Privacy Policy to continue.");
      return;
    }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await api.sendCode(e);
      router.push({
        pathname: "/auth/otp",
        params: { email: e, devCode: res.dev_code ?? "" },
      });
    } catch (ex: any) {
      const msg = String(ex?.message || "");
      if (msg.startsWith("429")) setErr("Please wait a minute before requesting another code.");
      else if (msg.includes("cannot log in")) setErr("This email cannot be used for sign-in.");
      else setErr("Couldn't send the code. Try again.");
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
          style={styles.body}
        >
          <View style={styles.centerWrap}>
            <View style={[styles.brandRow, enter(0)]}>
              <AppLogo size={44} />
              <Text style={styles.brand} testID="brand-name">Living Circle</Text>
            </View>
            <Text style={[styles.tag, enter(80)]}>Find your people, find your place.</Text>

            <View style={[styles.card, enter(180)]}>
              <Text style={styles.h1}>Enter your email</Text>
              <Text style={styles.sub}>We&apos;ll send you a 6-digit sign-in code.</Text>
              <TextInput
                testID="email-input"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={C.onSurfaceTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={[styles.input, focused && styles.inputFocused]}
              />
              {err && <Text testID="email-error" style={styles.err}>{err}</Text>}

              {/* Terms & Privacy consent checkbox */}
              <Pressable
                testID="terms-agree-checkbox"
                onPress={() => setAgreed((v) => !v)}
                style={styles.checkRow}
              >
                <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                  {agreed && <Ionicons name="checkmark" size={14} color={C.onBrand} />}
                </View>
                <Text style={styles.checkLabel}>
                  I agree to the{" "}
                  <Text
                    style={styles.checkLink}
                    onPress={() => router.push("/legal/terms")}
                  >
                    Terms of Service
                  </Text>
                  {" "}and{" "}
                  <Text
                    style={styles.checkLink}
                    onPress={() => router.push("/legal/privacy")}
                  >
                    Privacy Policy
                  </Text>
                </Text>
              </Pressable>

              <View style={{ marginTop: 22 }}>
                <GradientCTA
                  testID="email-continue-button"
                  label={loading ? "Sending…" : "Continue"}
                  onPress={submit}
                  loading={loading}
                  disabled={!agreed}
                  icon="arrow-forward"
                />
              </View>
            </View>

            <View style={[styles.trustRow, enter(300)]}>
              <Ionicons name="lock-closed" size={13} color={C.onSurfaceTertiary} />
              <Text style={styles.trustText}>Your email is only used for sign-in. No spam, ever.</Text>
            </View>
          </View>

          <Text style={styles.legalFooter}>© 2026 Living Circle · India</Text>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1 },
  centerWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    width: "100%",
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  mark: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: { fontSize: 26, fontWeight: "800", color: C.onSurface, letterSpacing: -0.5 },
  tag: { fontSize: 15, color: C.onSurfaceSecondary, marginBottom: 28 },
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
  h1: { fontSize: 22, fontWeight: "800", color: C.onSurface, letterSpacing: -0.3 },
  sub: { fontSize: 14, color: C.onSurfaceSecondary, marginTop: 6, marginBottom: 20 },
  input: {
    backgroundColor: C.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16.5,
    color: C.onSurface,
    borderWidth: 1.5,
    borderColor: C.border,
    ...webOnly({ transition: "border-color 0.2s ease, background-color 0.2s ease", outlineStyle: "none" }),
  },
  inputFocused: { borderColor: C.brand, backgroundColor: C.bg },
  err: { color: C.error, marginTop: 12, fontSize: 14 },
  checkRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    marginTop: 18,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 7,
    borderWidth: 1.5, borderColor: C.brand,
    backgroundColor: C.bg,
    alignItems: "center", justifyContent: "center",
    marginTop: 1,
    ...webOnly({ transition: "background-color 0.15s ease" }),
  },
  checkboxChecked: { backgroundColor: C.brand, borderColor: C.brand },
  checkLabel: { flex: 1, fontSize: 14, color: C.onSurfaceSecondary, lineHeight: 20 },
  checkLink: { color: C.brand, fontWeight: "700", textDecorationLine: "underline" },
  trustRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 20 },
  trustText: { fontSize: 12.5, color: C.onSurfaceTertiary },
  legalFooter: {
    textAlign: "center",
    fontSize: 11,
    color: C.onSurfaceTertiary,
    marginBottom: 16,
  },
});
