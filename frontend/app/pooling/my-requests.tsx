import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { PressableScale } from "@/src/components/PressableScale";
import { C, CARD_SHADOW, R, S } from "@/src/theme/colors";

function summaryFor(r: any) {
  const l = r.listing || {};
  const parts = [l.area, l.bhk_type].filter(Boolean).join(" ");
  const rent = l.rent != null ? `₹${Number(l.rent).toLocaleString()}` : "";
  return [parts, rent].filter(Boolean).join(", ");
}

function RequestCard({
  r,
  onVerify,
  onViewListing,
  onOpenGroup,
}: {
  r: any;
  onVerify: () => void;
  onViewListing: () => void;
  onOpenGroup: () => void;
}) {
  const summary = summaryFor(r);
  const isAcceptedUnverified = r.status === "accepted" && !r.verified;
  const isVerified = r.status === "accepted" && r.verified;

  return (
    <View style={[styles.card, CARD_SHADOW]}>
      <Text style={styles.cardTitle}>{summary || "Listing"}</Text>

      {r.status === "pending" && (
        <>
          <Text style={[styles.statusLine, { color: C.warning }]}>Status: ⏳ Pending</Text>
          <Text style={styles.subText}>Owner reviewing…</Text>
        </>
      )}

      {isAcceptedUnverified && (
        <>
          <Text style={[styles.statusLine, { color: C.success }]}>Status: ✅ Accepted</Text>
          <View style={styles.btnRow}>
            <PressableScale
              testID={`pooling-request-verify-${r.id}`}
              style={[styles.actionBtn, styles.primaryBtn]}
              onPress={onVerify}
            >
              <Ionicons name="camera-outline" size={16} color={C.onBrand} />
              <Text style={styles.primaryBtnText}>Photo Verify</Text>
            </PressableScale>
            <PressableScale
              testID={`pooling-request-view-listing-${r.id}`}
              style={[styles.actionBtn, styles.secondaryBtn]}
              onPress={onViewListing}
            >
              <Ionicons name="home-outline" size={16} color={C.brand} />
              <Text style={styles.secondaryBtnText}>View Listing</Text>
            </PressableScale>
          </View>
        </>
      )}

      {isVerified && (
        <>
          <Text style={[styles.statusLine, { color: C.success }]}>✅ Verified — group chat unlocked</Text>
          <PressableScale
            testID={`pooling-request-open-group-${r.id}`}
            style={[styles.actionBtn, styles.primaryBtn, { alignSelf: "flex-start", marginTop: S.sm }]}
            onPress={onOpenGroup}
          >
            <Ionicons name="chatbubbles-outline" size={16} color={C.onBrand} />
            <Text style={styles.primaryBtnText}>Open Group Chat</Text>
          </PressableScale>
        </>
      )}

      {r.status === "rejected" && (
        <Text style={[styles.statusLine, { color: C.error }]}>Status: ❌ Rejected</Text>
      )}
    </View>
  );
}

export default function PoolingMyRequests() {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.poolingMyRequests();
      setRequests(res || []);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} testID="pooling-requests-back">
          <Ionicons name="chevron-back" size={22} color={C.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>My Requests</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <Text style={styles.loadingText}>Loading…</Text>
      ) : requests.length === 0 ? (
        <View style={styles.emptyWrap} testID="pooling-requests-empty">
          <Ionicons name="document-text-outline" size={64} color={C.borderStrong} />
          <Text style={styles.emptyTitle}>No requests yet</Text>
          <Text style={styles.emptySub}>Browse listings and send a join request to get started.</Text>
          <PressableScale
            testID="pooling-requests-browse"
            style={styles.browseBtn}
            onPress={() => router.push("/pooling/join")}
          >
            <Text style={styles.browseBtnText}>Browse Listings</Text>
          </PressableScale>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: S.lg, gap: S.md, paddingBottom: S.xxxl }}
          renderItem={({ item }) => (
            <RequestCard
              r={item}
              onVerify={() =>
                router.push({ pathname: "/pooling/verify/[requestId]", params: { requestId: item.id } })
              }
              onViewListing={() =>
                router.push({ pathname: "/pooling/[listingId]", params: { listingId: item.listing_id } })
              }
              onOpenGroup={() =>
                router.push({ pathname: "/pooling/group/[listingId]", params: { listingId: item.listing_id } })
              }
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: S.lg, paddingVertical: S.md,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: C.surfaceSecondary,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border,
  },
  headerTitle: { fontSize: 17, fontWeight: "800", color: C.onSurface },
  loadingText: { textAlign: "center", color: C.onSurfaceTertiary, marginTop: 40 },

  card: {
    backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg,
    borderWidth: 1, borderColor: C.border, gap: 4,
  },
  cardTitle: { fontSize: 15, fontWeight: "800", color: C.onSurface },
  statusLine: { fontSize: 13, fontWeight: "700", marginTop: 2 },
  subText: { fontSize: 12, color: C.onSurfaceTertiary },
  btnRow: { flexDirection: "row", gap: S.sm, marginTop: S.sm },
  actionBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: S.md, paddingVertical: S.sm, borderRadius: R.pill,
  },
  primaryBtn: { backgroundColor: C.brand },
  primaryBtnText: { color: C.onBrand, fontWeight: "700", fontSize: 13 },
  secondaryBtn: { backgroundColor: C.surfaceTertiary, borderWidth: 1, borderColor: C.borderCyan },
  secondaryBtnText: { color: C.brand, fontWeight: "700", fontSize: 13 },

  emptyWrap: { alignItems: "center", padding: S.xxl, marginTop: 40 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: C.onSurface, marginTop: S.lg },
  emptySub: { fontSize: 14, color: C.onSurfaceTertiary, marginTop: S.sm, textAlign: "center" },
  browseBtn: { marginTop: S.xl, backgroundColor: C.brand, paddingHorizontal: S.xl, paddingVertical: S.md, borderRadius: R.pill },
  browseBtnText: { color: C.onBrand, fontWeight: "700" },
});
