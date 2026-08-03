import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { Avatar } from "@/src/components/Avatar";
import { PressableScale } from "@/src/components/PressableScale";
import { C, CARD_SHADOW, R, S } from "@/src/theme/colors";

const { width: W } = Dimensions.get("window");

const LIFESTYLE_META: Record<string, { emoji: string; label: string }> = {
  food: { emoji: "🍽️", label: "Food" },
  smoking: { emoji: "🚭", label: "Smoking" },
  drinking: { emoji: "🍺", label: "Drinking" },
  sleep: { emoji: "🌙", label: "Sleep" },
  cleanliness: { emoji: "🧹", label: "Cleanliness" },
  guests: { emoji: "🤝", label: "Guests" },
  pets: { emoji: "🐾", label: "Pets" },
  religion: { emoji: "🙏", label: "Religion" },
  work_timing: { emoji: "⏰", label: "Work hours" },
  cooking: { emoji: "👨‍🍳", label: "Cooking" },
  noise: { emoji: "🎵", label: "Noise level" },
  relationship_status: { emoji: "💑", label: "Relationship" },
  overnight_guests: { emoji: "🛏️", label: "Overnight guests" },
  sharing_habits: { emoji: "🤲", label: "Sharing" },
};

function photoUri(p: string) {
  return p.startsWith("data:") ? p : `data:image/jpeg;base64,${p}`;
}

function initials(name?: string | null) {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export default function PoolingListingDetail() {
  const router = useRouter();
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [myRequestId, setMyRequestId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.poolingListingDetail(String(listingId));
      setListing(data);
    } catch {
      setError("Couldn't load this listing.");
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    load();
  }, [load]);

  // Resolve the request_id for an accepted-but-not-verified request so we
  // can route straight into verification. The detail endpoint only returns
  // the status, not the id, so we fall back to my-requests when needed.
  useEffect(() => {
    if (listing?.my_request_status === "accepted" && !myRequestId) {
      api.poolingMyRequests()
        .then((reqs) => {
          const r = (reqs || []).find((x: any) => x.listing_id === listingId);
          if (r) setMyRequestId(r.id);
        })
        .catch(() => {});
    }
  }, [listing?.my_request_status, listingId, myRequestId]);

  const sendRequest = async () => {
    setSending(true);
    try {
      await api.poolingSendRequest(String(listingId));
      setSent(true);
      setShowConfirm(false);
      load();
    } catch {
      setShowConfirm(false);
      setError("Couldn't send request. You may already have a pending request.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={C.brand} />
      </SafeAreaView>
    );
  }

  if (error && !listing) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} testID="pooling-detail-back">
            <Ionicons name="chevron-back" size={22} color={C.onSurface} />
          </Pressable>
          <Text style={styles.headerTitle}>Listing</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.emptyWrap}>
          <Ionicons name="alert-circle-outline" size={48} color={C.onSurfaceTertiary} />
          <Text style={styles.emptySub}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const photos: any[] = listing?.photos || [];
  const owner = listing?.owner || {};
  const joinedMembers: any[] = listing?.joined_members || [];
  const needed = Math.max(0, (listing?.roommates_needed ?? 0) - (listing?.roommates_current ?? 0));
  const lifestyleEntries = Object.entries(owner.lifestyle || {}).filter(([, v]) => v);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} testID="pooling-detail-back">
          <Ionicons name="chevron-back" size={22} color={C.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{listing?.address || "Listing"}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {photos.length > 0 ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {photos.map((p, i) => (
              <Pressable
                key={p.photo_id || i}
                onPress={() => setFullscreenPhoto(p.encrypted_data)}
                testID={`pooling-detail-gallery-${i}`}
              >
                <Image source={{ uri: photoUri(p.encrypted_data) }} style={styles.galleryImg} resizeMode="cover" />
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <View style={[styles.galleryImg, styles.galleryFallback]}>
            <Ionicons name="home-outline" size={48} color={C.onSurfaceTertiary} />
          </View>
        )}

        <View style={styles.body}>
          <Text style={styles.address}>{listing?.address}</Text>
          <Text style={styles.area}>{listing?.area}</Text>

          <View style={styles.factRow}>
            <Fact icon="business-outline" label={listing?.bhk_type} />
            <Fact icon="cash-outline" label={`₹${Number(listing?.rent || 0).toLocaleString()}/mo`} />
            <Fact icon="people-outline" label={`${listing?.roommates_current ?? 0}/${listing?.roommates_needed ?? 0} filled`} />
          </View>
          {needed > 0 && (
            <View style={styles.neededPill}>
              <Text style={styles.neededPillText}>Need {needed} more roommate{needed > 1 ? "s" : ""}</Text>
            </View>
          )}
          {listing?.move_in_date ? (
            <Text style={styles.moveIn}>📅 Move-in: {listing.move_in_date}</Text>
          ) : null}

          {listing?.description ? (
            <Section title="Description">
              <Text style={styles.description}>{listing.description}</Text>
            </Section>
          ) : null}

          {listing?.amenities?.length > 0 && (
            <Section title="Amenities">
              <View style={styles.amenityRow}>
                {listing.amenities.map((a: string) => (
                  <View key={a} style={styles.amenityChip}>
                    <Text style={styles.amenityChipText}>{a}</Text>
                  </View>
                ))}
              </View>
            </Section>
          )}

          <Section title="Owner">
            <View style={styles.ownerCard}>
              <View style={styles.ownerHeaderRow}>
                <Avatar name={owner.name} photo={null} size={56} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.ownerName} numberOfLines={1}>
                    {owner.name}{owner.age ? `, ${owner.age}` : ""}
                  </Text>
                  <Text style={styles.ownerSub} numberOfLines={1}>
                    {owner.occupation === "student" ? "Student" : "Professional"}
                    {owner.org ? ` · ${owner.org}` : ""}
                  </Text>
                  {owner.id_verified ? (
                    <View style={styles.verifiedBadge}>
                      <Text style={styles.verifiedBadgeText}>✅ ID Verified</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {owner.bio ? <Text style={styles.ownerBio}>{owner.bio}</Text> : null}

              {lifestyleEntries.length > 0 && (
                <View style={styles.amenityRow}>
                  {lifestyleEntries.map(([k, v]) => {
                    const meta = LIFESTYLE_META[k] ?? { emoji: "✨", label: k.replace(/_/g, " ") };
                    return (
                      <View key={k} style={styles.lifestyleChip}>
                        <Text style={styles.lifestyleChipText}>{meta.emoji} {String(v)}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </Section>

          {joinedMembers.length > 0 && (
            <Section title={`${joinedMembers.length} ${joinedMembers.length === 1 ? "person has" : "people have"} already joined`}>
              <View style={{ gap: S.sm }}>
                {joinedMembers.map((m: any) => (
                  <View key={m.user_id} style={styles.memberRow}>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>{initials(m.name)}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.memberName} numberOfLines={1}>{m.name}</Text>
                      <Text style={styles.memberSub} numberOfLines={1}>
                        {m.age ? `${m.age} · ` : ""}{m.occupation === "student" ? "Student" : m.occupation === "professional" ? "Professional" : m.occupation || ""}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </Section>
          )}
        </View>
      </ScrollView>

      <View style={styles.actionBar}>
        {listing?.is_owner ? (
          <View style={styles.ownerNote}>
            <Ionicons name="information-circle-outline" size={18} color={C.onSurfaceTertiary} />
            <Text style={styles.ownerNoteText}>This is your listing</Text>
          </View>
        ) : sent || listing?.my_request_status === "pending" ? (
          <View style={styles.pendingPill}>
            <Text style={styles.pendingPillText}>
              {sent ? "✅ Request sent! Owner will review and respond" : "⏳ Request pending"}
            </Text>
          </View>
        ) : listing?.my_request_status === "accepted" ? (
          <PressableScale
            testID="pooling-detail-continue-verification"
            style={styles.primaryBtn}
            onPress={() => {
              if (myRequestId) {
                router.push({ pathname: "/pooling/verify/[requestId]", params: { requestId: myRequestId } });
              } else {
                router.push("/pooling/my-requests");
              }
            }}
          >
            <Ionicons name="camera-outline" size={18} color={C.onBrand} />
            <Text style={styles.primaryBtnText}>
              {myRequestId ? "Continue to Verification" : "Go to My Requests to Verify"}
            </Text>
          </PressableScale>
        ) : listing?.my_request_status === "rejected" ? (
          <View style={styles.rejectedNote}>
            <Text style={styles.rejectedNoteText}>❌ Request was declined</Text>
          </View>
        ) : (
          <PressableScale
            testID="pooling-detail-send-request"
            style={styles.primaryBtn}
            onPress={() => setShowConfirm(true)}
          >
            <Ionicons name="paper-plane-outline" size={18} color={C.onBrand} />
            <Text style={styles.primaryBtnText}>Send Join Request</Text>
          </PressableScale>
        )}
      </View>

      {/* Fullscreen photo modal */}
      <Modal visible={!!fullscreenPhoto} transparent animationType="fade" onRequestClose={() => setFullscreenPhoto(null)}>
        <Pressable style={styles.fullscreenBackdrop} onPress={() => setFullscreenPhoto(null)}>
          {fullscreenPhoto && (
            <Image source={{ uri: photoUri(fullscreenPhoto) }} style={styles.fullscreenImg} resizeMode="contain" />
          )}
        </Pressable>
      </Modal>

      {/* Confirm request modal */}
      <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>
        <View style={styles.confirmBackdrop}>
          <View style={[styles.confirmBox, CARD_SHADOW]} testID="pooling-detail-confirm-modal">
            <Ionicons name="paper-plane-outline" size={36} color={C.brand} />
            <Text style={styles.confirmTitle}>Request to join {listing?.address}?</Text>
            <Text style={styles.confirmText}>
              Owner will review your profile. After acceptance, photo verification required.
            </Text>
            <View style={{ flexDirection: "row", gap: S.md, marginTop: S.lg, width: "100%" }}>
              <PressableScale
                testID="pooling-detail-cancel-request"
                onPress={() => setShowConfirm(false)}
                style={[styles.confirmBtn, styles.confirmCancel]}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </PressableScale>
              <PressableScale
                testID="pooling-detail-confirm-request"
                onPress={sendRequest}
                style={[styles.confirmBtn, styles.confirmSend]}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator color={C.onBrand} />
                ) : (
                  <Text style={styles.confirmSendText}>Send Request</Text>
                )}
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Fact({ icon, label }: { icon: any; label?: string }) {
  if (!label) return null;
  return (
    <View style={styles.factItem}>
      <Ionicons name={icon} size={14} color={C.brand} />
      <Text style={styles.factText}>{label}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: any }) {
  return (
    <View style={{ marginTop: S.xl }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: S.lg, paddingVertical: S.md,
    borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.bg, zIndex: 5,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: C.surfaceSecondary,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border,
  },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: "800", color: C.onSurface, textAlign: "center", marginHorizontal: S.sm },

  galleryImg: { width: W, height: 260, backgroundColor: C.surfaceSecondary },
  galleryFallback: { alignItems: "center", justifyContent: "center" },

  body: { padding: S.xl },
  address: { fontSize: 20, fontWeight: "900", color: C.onSurface },
  area: { fontSize: 14, color: C.onSurfaceTertiary, marginTop: 2 },
  factRow: { flexDirection: "row", flexWrap: "wrap", gap: S.md, marginTop: S.md },
  factItem: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: C.surfaceTertiary, borderRadius: R.pill,
    paddingHorizontal: S.md, paddingVertical: 6, borderWidth: 1, borderColor: C.borderCyan,
  },
  factText: { fontSize: 13, color: C.onSurface, fontWeight: "700" },
  neededPill: {
    alignSelf: "flex-start", marginTop: S.md,
    backgroundColor: "rgba(24,144,255,0.10)", borderWidth: 1, borderColor: C.borderCyan,
    borderRadius: R.pill, paddingHorizontal: S.md, paddingVertical: 5,
  },
  neededPillText: { color: C.brand, fontSize: 12, fontWeight: "700" },
  moveIn: { fontSize: 13, color: C.onSurfaceSecondary, marginTop: S.sm },

  sectionTitle: { fontSize: 12, color: C.onSurfaceTertiary, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: S.sm },
  description: { fontSize: 14, color: C.onSurfaceSecondary, lineHeight: 20 },

  amenityRow: { flexDirection: "row", flexWrap: "wrap", gap: S.sm },
  amenityChip: {
    backgroundColor: C.surfaceSecondary, borderRadius: R.pill,
    paddingHorizontal: S.md, paddingVertical: 5, borderWidth: 1, borderColor: C.border,
  },
  amenityChipText: { fontSize: 12, color: C.onSurfaceSecondary, fontWeight: "600" },

  ownerCard: {
    backgroundColor: C.surfaceSecondary, borderRadius: R.lg, borderWidth: 1, borderColor: C.border,
    padding: S.lg, gap: S.md,
  },
  ownerHeaderRow: { flexDirection: "row", alignItems: "center", gap: S.md },
  ownerName: { fontSize: 16, fontWeight: "800", color: C.onSurface },
  ownerSub: { fontSize: 12, color: C.onSurfaceTertiary, marginTop: 2 },
  verifiedBadge: {
    alignSelf: "flex-start", marginTop: 4,
    backgroundColor: "rgba(82,196,26,0.10)", borderWidth: 1, borderColor: C.success,
    borderRadius: R.pill, paddingHorizontal: S.sm, paddingVertical: 2,
  },
  verifiedBadgeText: { fontSize: 10, color: C.success, fontWeight: "700" },
  ownerBio: { fontSize: 13, color: C.onSurfaceSecondary, lineHeight: 19, fontStyle: "italic" },
  lifestyleChip: {
    backgroundColor: C.surface, borderRadius: R.pill,
    paddingHorizontal: S.md, paddingVertical: 5, borderWidth: 1, borderColor: C.border,
  },
  lifestyleChipText: { fontSize: 12, color: C.onSurface, fontWeight: "600" },

  memberRow: { flexDirection: "row", alignItems: "center", gap: S.md },
  memberAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.surfaceTertiary,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.borderCyan,
  },
  memberAvatarText: { fontSize: 13, fontWeight: "800", color: C.brand },
  memberName: { fontSize: 14, fontWeight: "700", color: C.onSurface },
  memberSub: { fontSize: 11, color: C.onSurfaceTertiary },

  actionBar: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    padding: S.lg, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border,
  },
  primaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: C.brand, paddingVertical: 16, borderRadius: R.pill,
  },
  primaryBtnText: { color: C.onBrand, fontWeight: "800", fontSize: 15 },
  pendingPill: {
    backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.border,
    borderRadius: R.pill, paddingVertical: 14, alignItems: "center",
  },
  pendingPillText: { color: C.onSurfaceSecondary, fontWeight: "700", fontSize: 14 },
  rejectedNote: { alignItems: "center", paddingVertical: 10 },
  rejectedNoteText: { color: C.error, fontWeight: "700", fontSize: 14 },
  ownerNote: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10 },
  ownerNoteText: { color: C.onSurfaceTertiary, fontSize: 13, fontWeight: "600" },

  fullscreenBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center" },
  fullscreenImg: { width: "100%", height: "80%" },

  confirmBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: S.xl },
  confirmBox: { backgroundColor: C.surface, padding: S.xl, borderRadius: R.lg, alignItems: "center", width: "100%", maxWidth: 360, borderWidth: 1, borderColor: C.borderCyan },
  confirmTitle: { fontSize: 18, fontWeight: "800", color: C.onSurface, marginTop: S.md, textAlign: "center" },
  confirmText: { fontSize: 14, color: C.onSurfaceSecondary, textAlign: "center", marginTop: S.sm, lineHeight: 20 },
  confirmBtn: { flex: 1, paddingVertical: S.md, borderRadius: R.pill, alignItems: "center", justifyContent: "center" },
  confirmCancel: { backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.border },
  confirmCancelText: { color: C.onSurface, fontWeight: "700" },
  confirmSend: { backgroundColor: C.brand },
  confirmSendText: { color: C.onBrand, fontWeight: "700" },

  emptyWrap: { alignItems: "center", padding: S.xxl, marginTop: 40, gap: S.md },
  emptySub: { fontSize: 14, color: C.onSurfaceTertiary, textAlign: "center" },
});
