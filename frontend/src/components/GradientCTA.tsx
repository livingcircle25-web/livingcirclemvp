import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { C } from "@/src/theme/colors";

const isWeb = Platform.OS === "web";
const webOnly = (style: object) => (isWeb ? (style as any) : {});
const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

/** Primary gradient call-to-action button with hover lift (web) — the app-wide
 *  premium button. Use for the single most important action on a screen. */
export function GradientCTA({
  label,
  onPress,
  icon,
  loading,
  disabled,
  full = true,
  testID,
  size = "lg",
}: {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  full?: boolean;
  testID?: string;
  size?: "md" | "lg";
}) {
  const [hovered, setHovered] = useState(false);
  const dimmed = disabled || loading;
  return (
    <Pressable
      testID={testID}
      onPress={dimmed ? undefined : onPress}
      // @ts-ignore — web-only hover events
      onMouseEnter={() => setHovered(true)}
      // @ts-ignore
      onMouseLeave={() => setHovered(false)}
      style={[
        { borderRadius: 14, width: full ? "100%" : undefined },
        webOnly({
          transition: `transform 0.25s ${EASE_OUT}, box-shadow 0.25s ease, opacity 0.2s ease`,
          cursor: dimmed ? "default" : "pointer",
          boxShadow: "0 4px 14px rgba(255,94,125,0.30)",
        }),
        hovered && !dimmed &&
          webOnly({ transform: "translateY(-2px)", boxShadow: "0 12px 28px rgba(255,94,125,0.40)" }),
        dimmed && { opacity: 0.55 },
      ]}
    >
      <LinearGradient
        colors={hovered && !dimmed ? ["#9F67F5", "#34D5C4"] : [C.gradStart, C.gradEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.inner, size === "md" && styles.innerMd]}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <View style={styles.row}>
            <Text style={[styles.text, size === "md" && styles.textMd]}>{label}</Text>
            {icon && <Ionicons name={icon} size={size === "md" ? 15 : 17} color="#FFFFFF" />}
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inner: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    paddingHorizontal: 26,
    borderRadius: 14,
    minHeight: 52,
  },
  innerMd: { paddingVertical: 11, paddingHorizontal: 20, minHeight: 42, borderRadius: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  text: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  textMd: { fontSize: 14.5 },
});
