import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { C, R, S } from "@/src/theme/colors";

const STATUS_META: Record<string, { emoji: string; color: string; label: string }> = {
  pending: { emoji: "⏳", color: C.warning, label: "Pending" },
  accepted: { emoji: "✅", color: C.success, label: "Accepted" },
  rejected: { emoji: "❌", color: C.error, label: "Rejected" },
};

export default function PoolingHub() {
  const router = useRouter();
  const [listings, setListings] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, r] = await Promise.all([api.poolingMyListings(), api.poolingMyRequests()]);
      setListings(l);
      setRequests(r);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: S.xl, paddingBottom: S.xxxl }} showsVerticalScrollIndicator={false}>
        <Text style={styles.h1}>🏘️ House Pooling</Text>
        <Text style={styles.sub}>Find a group to move in with, or list your place for roommates.</Text>

        <Pressable style={styles.primaryBtn} onPress={() => router.push("/pooling/list")} testID="pooling-list-btn">
          <Ionicons name="add-circle" size={22} color={C.onBrand} />
          <View style={{ flex: 1 }}>
            <Text style={styles.primaryBtnTitle}>List a House Pooling</Text>
            <Text style={styles.primaryBtnSub}>Post your place, find roommates</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={C.onBrand} />
        </Pressable>

        <Pressable style={styles.secondaryBtn} onPress={() => router.push("/pooling/join")} testID="pooling-join-btn">
          <Ionicons name="search" size={22} color={C.brand} />
          <View style={{ flex: 1 }}>
            <Text style={styles.secondaryBtnTitle}>Join a House Pooling</Text>
            <Text style={styles.secondaryBtnSub}>Browse places, send requests</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={C.brand} />
        </Pressable>

        {!loading && listings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Listings</Text>
              <Pressable onPress={() => router.push("/pooling/my-listings")} testID="pooling-view-all-listings">
                <Text style={styles.sectionLink}>View all</Text>
              </Pressable>
            </View>
            {listings.slice(0, 3).map((l) => (
              <Pressable
                key={l.id}
                style={styles.rowCard}
                onPress={() => router.push({ pathname: "/pooling/my-listings" })}
                testID={`pooling-my-listing-${l.id}`}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowCardTitle}>{l.area} · {l.bhk_type}</Text>
                  <Text style={styles.rowCardSub}>₹{l.rent.toLocaleString()} · Need {l.roommates_needed}, have {l.roommates_current}</Text>
                </View>
                <View style={[styles.statusPill, { borderColor: l.status === "open" ? C.success : C.onSurfaceTertiary }]}>
                  <Text style={[styles.statusPillText, { color: l.status === "open" ? C.success : C.onSurfaceTertiary }]}>
                    {l.status === "open" ? "🟢 Open" : l.status === "closed" ? "Closed" : l.status}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {!loading && requests.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Requests</Text>
              <Pressable onPress={() => router.push("/pooling/my-requests")} testID="pooling-view-all-requests">
                <Text style={styles.sectionLink}>View all</Text>
              </Pressable>
            </View>
            {requests.slice(0, 3).map((r) => {
              const meta = STATUS_META[r.status] || STATUS_META.pending;
              return (
                <Pressable
                  key={r.id}
                  style={styles.rowCard}
                  onPress={() => router.push("/pooling/my-requests")}
                  testID={`pooling-my-request-${r.id}`}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowCardTitle}>{r.listing?.area} · {r.listing?.bhk_type}</Text>
                    <Text style={styles.rowCardSub}>₹{r.listing?.rent?.toLocaleString()}</Text>
                  </View>
                  <View style={[styles.statusPill, { borderColor: meta.color }]}>
                    <Text style={[styles.statusPillText, { color: meta.color }]}>{meta.emoji} {meta.label}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  h1: { fontSize: 24, fontWeight: "800", color: C.onSurface, letterSpacing: -0.4, marginBottom: 4 },
  sub: { fontSize: 14, color: C.onSurfaceSecondary, marginBottom: S.xl, lineHeight: 20 },
  primaryBtn: {
    flexDirection: "row", alignItems: "center", gap: S.md,
    backgroundColor: C.brand, borderRadius: R.lg, padding: S.lg, marginBottom: S.md,
  },
  primaryBtnTitle: { color: C.onBrand, fontSize: 16, fontWeight: "800" },
  primaryBtnSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },
  secondaryBtn: {
    flexDirection: "row", alignItems: "center", gap: S.md,
    backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.brand,
    borderRadius: R.lg, padding: S.lg, marginBottom: S.xl,
  },
  secondaryBtnTitle: { color: C.brand, fontSize: 16, fontWeight: "800" },
  secondaryBtnSub: { color: C.onSurfaceSecondary, fontSize: 12, marginTop: 2 },
  section: { marginTop: S.lg },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: S.sm },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: C.onSurface },
  sectionLink: { fontSize: 13, color: C.brand, fontWeight: "700" },
  rowCard: {
    flexDirection: "row", alignItems: "center", gap: S.md,
    backgroundColor: C.surfaceSecondary, borderRadius: R.md, padding: S.md, marginBottom: S.sm,
    borderWidth: 1, borderColor: C.border,
  },
  rowCardTitle: { fontSize: 14, fontWeight: "700", color: C.onSurface },
  rowCardSub: { fontSize: 12, color: C.onSurfaceTertiary, marginTop: 2 },
  statusPill: { borderWidth: 1, borderRadius: R.pill, paddingHorizontal: S.md, paddingVertical: 4 },
  statusPillText: { fontSize: 11, fontWeight: "700" },
});
