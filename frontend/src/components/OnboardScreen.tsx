import { Platform, Pressable, StyleSheet, Text, View, ScrollView } from "react-native";
import { ReactNode } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { PressableScale } from "@/src/components/PressableScale";
import { GradientCTA } from "@/src/components/GradientCTA";
import { C, R, S } from "@/src/theme/colors";

const isWeb = Platform.OS === "web";
const webOnly = (style: object) => (isWeb ? (style as any) : {});

export function Screen({
  children,
  title,
  subtitle,
  step,
  total,
  onBack,
  cta,
  onCta,
  ctaDisabled,
  testID,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  step?: number;
  total?: number;
  onBack?: () => void;
  cta: string;
  onCta: () => void;
  ctaDisabled?: boolean;
  testID?: string;
}) {
  const pct = step && total ? (step / total) * 100 : 0;
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]} testID={testID}>
      {step !== undefined && total !== undefined && (
        <View style={styles.progressRow}>
          <View style={styles.progressWrap}>
            <LinearGradient
              colors={[C.gradStart, C.gradEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBar, { width: `${pct}%` }]}
            />
          </View>
          <Text style={styles.progressText}>{step}/{total}</Text>
        </View>
      )}
      <View style={styles.header}>
        {onBack && (
          <Pressable onPress={onBack} testID="screen-back" style={styles.backBtn}>
            <Ionicons name="chevron-back" size={18} color={C.onSurface} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        )}
        <Text style={styles.h1}>{title}</Text>
        {subtitle && <Text style={styles.sub}>{subtitle}</Text>}
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: S.xl, paddingBottom: S.xxxl }}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
      <View style={styles.ctaWrap}>
        <GradientCTA
          testID="screen-cta"
          label={cta}
          disabled={ctaDisabled}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onCta();
          }}
        />
      </View>
    </SafeAreaView>
  );
}

export function Chip({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <PressableScale
      testID={testID}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={[styles.chip, active ? styles.chipActive : null]}
    >
      <Text style={[styles.chipText, active ? styles.chipTextActive : null]} numberOfLines={1}>{label}</Text>
    </PressableScale>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <View style={styles.chipRow}>{children}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.surface },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.md,
    marginHorizontal: S.xl,
    marginTop: S.sm,
  },
  progressWrap: {
    flex: 1,
    height: 6,
    backgroundColor: C.surfaceTertiary,
    borderRadius: R.pill,
    overflow: "hidden",
  },
  progressBar: {
    height: 6,
    borderRadius: R.pill,
    ...webOnly({ transition: "width 0.4s cubic-bezier(0.16, 1, 0.3, 1)" }),
  },
  progressText: { fontSize: 12.5, fontWeight: "700", color: C.onSurfaceTertiary },
  header: { paddingHorizontal: S.xl, paddingTop: S.lg },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingRight: 10,
  },
  backText: { color: C.onSurface, fontSize: 15, fontWeight: "600" },
  h1: { fontSize: 26, fontWeight: "800", color: C.onSurface, marginTop: S.md, letterSpacing: -0.4 },
  sub: { fontSize: 14, color: C.onSurfaceSecondary, marginTop: S.sm, lineHeight: 20 },
  ctaWrap: { paddingHorizontal: S.xl, paddingBottom: S.lg },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: S.sm },
  chip: {
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
    borderRadius: R.pill,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.surface,
    ...webOnly({ transition: "border-color 0.15s ease, background-color 0.15s ease" }),
  },
  chipActive: {
    backgroundColor: C.brandTint,
    borderColor: C.brand,
  },
  chipText: { color: C.onSurfaceSecondary, fontSize: 14, fontWeight: "600" },
  chipTextActive: { color: C.onBrandTint, fontWeight: "700" },
});
