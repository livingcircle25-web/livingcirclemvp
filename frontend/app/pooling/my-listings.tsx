import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { C, R, S, CARD_SHADOW } from "@/src/theme/colors";

const ROOMMATE_OPTIONS = ["1", "2", "3", "4", "5"];

type EditDraft = {
  rent: string;
  description: string;
  roommates_needed: string;
  status: string;
};

export default function MyListingsScreen() {
  const router = useRouter();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [requestsMap, setRequestsMap] = useState<Record<string, any[]>>({});
  const [requestsLoading, setRequestsLoading] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.poolingMyListings();
      setListings(data);
    } catch {
      // keep whatever was there before
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const startEdit = (listing: any) => {
    setEditingId(listing.id);
    setEditError(null);
    setEditDraft({
      rent: String(listing.rent ?? ""),
      description: listing.description || "",
      roommates_needed: String(listing.roommates_needed ?? ""),
      status: listing.status,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
    setEditError(null);
  };

  const saveEdit = async (id: string) => {
    if (!editDraft) return;
    const rentNum = Number(editDraft.rent);
    const roommatesNum = Number(editDraft.roommates_needed);
    if (!rentNum || rentNum <= 0) {
      setEditError("Rent must be a positive number.");
      return;
    }
    if (!roommatesNum || roommatesNum <= 0) {
      setEditError("Roommates needed must be a positive number.");
      return;
    }
    setSaving(true);
    setEditError(null);
    try {
      const updated = await api.poolingEditListing(id, {
        rent: rentNum,
        description: editDraft.description.trim() || undefined,
        roommates_needed: roommatesNum,
        status: editDraft.status,
      });
      setListings((prev) => prev.map((l) => (l.id === id ? { ...l, ...updated } : l)));
      setEditingId(null);
      setEditDraft(null);
    } catch (e: any) {
      setEditError(e?.message ?? "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    setDeleteConfirmId(null);
    try {
      await api.poolingDeleteListing(id);
      setListings((prev) => prev.filter((l) => l.id !== id));
    } catch {
      load();
    }
  };

  const toggleRequests = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!requestsMap[id]) {
      setRequestsLoading((p) => ({ ...p, [id]: true }));
      try {
        const reqs = await api.poolingListingRequests(id);
        setRequestsMap((p) => ({ ...p, [id]: reqs }));
      } catch {
        setRequestsMap((p) => ({ ...p, [id]: [] }));
      } finally {
        setRequestsLoading((p) => ({ ...p, [id]: false }));
      }
    }
  };

  const respond = async (listingId: string, requestId: string, accept: boolean) => {
    try {
      await api.poolingRespondRequest(requestId, accept);
      setRequestsMap((p) => ({
        ...p,
        [listingId]: (p[listingId] || []).filter((r) => r.id !== requestId),
      }));
      if (accept) {
        setListings((prev) =>
          prev.map((l) =>
            l.id === listingId ? { ...l, roommates_current: (l.roommates_current ?? 0) + 1 } : l
          )
        );
      }
    } catch {
      // leave request in the pending list so the user can retry
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} testID="pooling-my-listings-back">
          <Ionicons name="chevron-back" size={22} color={C.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>My Listings</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator color={C.brand} />
        </View>
      ) : listings.length === 0 ? (
        <View style={styles.emptyWrap} testID="pooling-my-listings-empty">
          <Ionicons name="home-outline" size={64} color={C.borderStrong} />
          <Text style={styles.emptyTitle}>No listings yet</Text>
          <Text style={styles.emptySub}>List your place and start finding roommates.</Text>
          <Pressable
            style={styles.emptyBtn}
            onPress={() => router.push("/pooling/list")}
            testID="pooling-my-listings-create"
          >
            <Ionicons name="add-circle" size={18} color={C.onBrand} />
            <Text style={styles.emptyBtnText}>List a Place</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: S.xxxl, gap: S.lg }}>
          {listings.map((listing) => {
            const isEditing = editingId === listing.id;
            const isExpanded = expandedId === listing.id;
            const thumb = listing.photos?.[0]?.encrypted_data;
            const requests = requestsMap[listing.id] || [];

            return (
              <View key={listing.id} style={[styles.card, CARD_SHADOW]} testID={`pooling-listing-${listing.id}`}>
                <View style={styles.cardTop}>
                  {thumb ? (
                    <Image source={{ uri: thumb }} style={styles.thumb} resizeMode="cover" />
                  ) : (
                    <View style={[styles.thumb, styles.thumbPlaceholder]}>
                      <Ionicons name="home-outline" size={24} color={C.onSurfaceTertiary} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.address} numberOfLines={1}>{listing.address}</Text>
                    <Text style={styles.meta}>{listing.area}</Text>
                    <Text style={styles.meta}>
                      {listing.bhk_type} · ₹{Number(listing.rent).toLocaleString()}
                    </Text>
                    <Text style={styles.meta}>
                      Need {listing.roommates_needed}, have {listing.roommates_current ?? 0}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      { borderColor: listing.status === "open" ? C.success : C.onSurfaceTertiary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: listing.status === "open" ? C.success : C.onSurfaceTertiary },
                      ]}
                    >
                      {listing.status === "open" ? "🟢 Open" : "Closed"}
                    </Text>
                  </View>
                </View>

                {isEditing && editDraft ? (
                  <View style={styles.editBox}>
                    <Text style={styles.editLabel}>Rent (₹/month)</Text>
                    <TextInput
                      style={styles.editInput}
                      value={editDraft.rent}
                      onChangeText={(t) => setEditDraft({ ...editDraft, rent: t.replace(/[^0-9]/g, "") })}
                      keyboardType="numeric"
                      testID={`pooling-listing-edit-rent-${listing.id}`}
                    />

                    <Text style={styles.editLabel}>Roommates needed</Text>
                    <View style={styles.chipRow}>
                      {ROOMMATE_OPTIONS.map((n) => (
                        <Pressable
                          key={n}
                          style={[styles.chip, editDraft.roommates_needed === n && styles.chipActive]}
                          onPress={() => setEditDraft({ ...editDraft, roommates_needed: n })}
                          testID={`pooling-listing-edit-roommates-${listing.id}-${n}`}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              editDraft.roommates_needed === n && styles.chipTextActive,
                            ]}
                          >
                            {n}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    <Text style={styles.editLabel}>Description</Text>
                    <TextInput
                      style={[styles.editInput, styles.editTextArea]}
                      value={editDraft.description}
                      onChangeText={(t) => setEditDraft({ ...editDraft, description: t.slice(0, 500) })}
                      multiline
                      maxLength={500}
                      testID={`pooling-listing-edit-description-${listing.id}`}
                    />

                    <Text style={styles.editLabel}>Status</Text>
                    <View style={styles.chipRow}>
                      {["open", "closed"].map((s) => (
                        <Pressable
                          key={s}
                          style={[styles.chip, editDraft.status === s && styles.chipActive]}
                          onPress={() => setEditDraft({ ...editDraft, status: s })}
                          testID={`pooling-listing-edit-status-${listing.id}-${s}`}
                        >
                          <Text style={[styles.chipText, editDraft.status === s && styles.chipTextActive]}>
                            {s === "open" ? "Open" : "Closed"}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    {editError && <Text style={styles.editError}>{editError}</Text>}

                    <View style={styles.editActions}>
                      <Pressable style={styles.editCancelBtn} onPress={cancelEdit} testID={`pooling-listing-edit-cancel-${listing.id}`}>
                        <Text style={styles.editCancelText}>Cancel</Text>
                      </Pressable>
                      <Pressable
                        style={styles.editSaveBtn}
                        onPress={() => saveEdit(listing.id)}
                        disabled={saving}
                        testID={`pooling-listing-save-${listing.id}`}
                      >
                        {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.editSaveText}>Save</Text>}
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={styles.actions}>
                    <Pressable
                      style={[styles.actionBtn, styles.editBtn]}
                      onPress={() => startEdit(listing)}
                      testID={`pooling-listing-edit-${listing.id}`}
                    >
                      <Ionicons name="create-outline" size={15} color={C.brand} />
                      <Text style={styles.editBtnText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionBtn, styles.requestsBtn]}
                      onPress={() => toggleRequests(listing.id)}
                      testID={`pooling-listing-view-requests-${listing.id}`}
                    >
                      <Ionicons name="people-outline" size={15} color={C.brand} />
                      <Text style={styles.editBtnText}>{isExpanded ? "Hide Requests" : "View Requests"}</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionBtn, styles.deleteBtn]}
                      onPress={() => setDeleteConfirmId(listing.id)}
                      testID={`pooling-listing-delete-${listing.id}`}
                    >
                      <Ionicons name="trash-outline" size={15} color={C.error} />
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </Pressable>
                  </View>
                )}

                {isExpanded && (
                  <View style={styles.requestsBox}>
                    {requestsLoading[listing.id] ? (
                      <ActivityIndicator color={C.brand} style={{ marginVertical: S.md }} />
                    ) : requests.length === 0 ? (
                      <Text style={styles.noRequestsText}>No pending requests.</Text>
                    ) : (
                      requests.map((r) => (
                        <View key={r.id} style={styles.requestRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.requesterName}>
                              {r.requester?.name}{r.requester?.age ? `, ${r.requester.age}` : ""}
                            </Text>
                            <Text style={styles.requesterMeta}>
                              {r.requester?.occupation}{r.requester?.org ? ` · ${r.requester.org}` : ""}
                            </Text>
                            {r.requester?.id_verified ? (
                              <Text style={styles.verifiedBadge}>✅ ID Verified</Text>
                            ) : null}
                          </View>
                          <View style={{ flexDirection: "row", gap: S.sm }}>
                            <Pressable
                              style={styles.acceptBtn}
                              onPress={() => respond(listing.id, r.id, true)}
                              testID={`pooling-request-accept-${r.id}`}
                            >
                              <Ionicons name="checkmark" size={16} color="#fff" />
                            </Pressable>
                            <Pressable
                              style={styles.rejectBtn}
                              onPress={() => respond(listing.id, r.id, false)}
                              testID={`pooling-request-reject-${r.id}`}
                            >
                              <Ionicons name="close" size={16} color="#fff" />
                            </Pressable>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      <Modal
        visible={!!deleteConfirmId}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmId(null)}
      >
        <View style={styles.confirmBackdrop}>
          <View style={[styles.confirmBox, CARD_SHADOW]}>
            <Ionicons name="alert-circle" size={36} color={C.error} />
            <Text style={styles.confirmTitle}>Delete listing?</Text>
            <Text style={styles.confirmText}>
              This will remove your listing. This action can&apos;t be undone.
            </Text>
            <View style={{ flexDirection: "row", gap: S.md, marginTop: S.lg, width: "100%" }}>
              <Pressable
                style={[styles.confirmBtn, styles.confirmCancel]}
                onPress={() => setDeleteConfirmId(null)}
                testID="pooling-listing-delete-cancel"
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmBtn, styles.confirmDestructive]}
                onPress={doDelete}
                testID={deleteConfirmId ? `pooling-listing-delete-confirm-${deleteConfirmId}` : undefined}
              >
                <Text style={styles.confirmDestructiveText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: S.lg, paddingVertical: 14,
    backgroundColor: C.surfaceSecondary,
    borderBottomWidth: 1, borderBottomColor: C.borderCyan,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.surfaceGlass, borderWidth: 1, borderColor: C.border,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "800", color: C.onSurface, letterSpacing: 0.3 },

  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center" },

  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: S.xxl, gap: 4 },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: C.onSurface, marginTop: S.lg, letterSpacing: 0.5 },
  emptySub: { fontSize: 14, color: C.onSurfaceTertiary, marginTop: S.sm, textAlign: "center" },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.brand, paddingHorizontal: 22, paddingVertical: 13, borderRadius: R.pill,
    marginTop: S.xl,
  },
  emptyBtnText: { color: C.onBrand, fontWeight: "800", fontSize: 14 },

  card: {
    backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg,
    borderWidth: 1, borderColor: C.border,
  },
  cardTop: { flexDirection: "row", gap: S.md, alignItems: "flex-start" },
  thumb: { width: 64, height: 64, borderRadius: R.md },
  thumbPlaceholder: { backgroundColor: C.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  address: { fontSize: 15, fontWeight: "800", color: C.onSurface },
  meta: { fontSize: 12, color: C.onSurfaceTertiary, marginTop: 2 },
  statusPill: { borderWidth: 1, borderRadius: R.pill, paddingHorizontal: S.md, paddingVertical: 4, alignSelf: "flex-start" },
  statusPillText: { fontSize: 11, fontWeight: "700" },

  actions: { flexDirection: "row", gap: S.sm, marginTop: S.md },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 4, paddingVertical: S.sm, borderRadius: R.pill, borderWidth: 1,
  },
  editBtn: { borderColor: C.borderCyan, backgroundColor: "rgba(24,144,255,0.06)" },
  editBtnText: { color: C.brand, fontWeight: "700", fontSize: 12 },
  requestsBtn: { borderColor: C.borderCyan, backgroundColor: "rgba(24,144,255,0.06)" },
  deleteBtn: { borderColor: C.error, backgroundColor: "rgba(255,77,79,0.06)" },
  deleteBtnText: { color: C.error, fontWeight: "700", fontSize: 12 },

  editBox: { marginTop: S.md, gap: S.sm },
  editLabel: { fontSize: 12, fontWeight: "700", color: C.onSurfaceSecondary, marginTop: S.sm },
  editInput: {
    backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.border,
    borderRadius: R.md, paddingHorizontal: S.md, paddingVertical: 10,
    fontSize: 14, color: C.onSurface,
  },
  editTextArea: { minHeight: 70, textAlignVertical: "top" },
  editError: { fontSize: 12, color: C.error, marginTop: 4 },
  editActions: { flexDirection: "row", gap: S.sm, marginTop: S.md },
  editCancelBtn: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingVertical: S.sm, borderRadius: R.pill,
    backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.border,
  },
  editCancelText: { color: C.onSurface, fontWeight: "700", fontSize: 13 },
  editSaveBtn: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingVertical: S.sm, borderRadius: R.pill, backgroundColor: C.brand,
  },
  editSaveText: { color: C.onBrand, fontWeight: "700", fontSize: 13 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: S.sm },
  chip: {
    paddingHorizontal: S.md, paddingVertical: 8, borderRadius: R.pill,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceSecondary,
  },
  chipActive: { backgroundColor: C.brand, borderColor: C.brand },
  chipText: { fontSize: 12, fontWeight: "600", color: C.onSurface },
  chipTextActive: { color: C.onBrand, fontWeight: "700" },

  requestsBox: { marginTop: S.md, borderTopWidth: 1, borderTopColor: C.border, paddingTop: S.md, gap: S.sm },
  noRequestsText: { fontSize: 13, color: C.onSurfaceTertiary, textAlign: "center", paddingVertical: S.sm },
  requestRow: {
    flexDirection: "row", alignItems: "center", gap: S.sm,
    backgroundColor: C.surfaceSecondary, borderRadius: R.md, padding: S.md,
    borderWidth: 1, borderColor: C.border,
  },
  requesterName: { fontSize: 14, fontWeight: "700", color: C.onSurface },
  requesterMeta: { fontSize: 12, color: C.onSurfaceTertiary, marginTop: 2 },
  verifiedBadge: { fontSize: 11, color: C.success, fontWeight: "700", marginTop: 4 },
  acceptBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: C.success,
    alignItems: "center", justifyContent: "center",
  },
  rejectBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: C.error,
    alignItems: "center", justifyContent: "center",
  },

  confirmBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: S.xl },
  confirmBox: { backgroundColor: C.surface, padding: S.xl, borderRadius: R.lg, alignItems: "center", width: "100%", maxWidth: 360, borderWidth: 1, borderColor: C.borderCoral },
  confirmTitle: { fontSize: 20, fontWeight: "800", color: C.onSurface, marginTop: S.md },
  confirmText: { fontSize: 14, color: C.onSurfaceSecondary, textAlign: "center", marginTop: S.sm, lineHeight: 20 },
  confirmBtn: { flex: 1, paddingVertical: S.md, borderRadius: R.pill, alignItems: "center" },
  confirmCancel: { backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.border },
  confirmCancelText: { color: C.onSurface, fontWeight: "700" },
  confirmDestructive: { backgroundColor: C.error },
  confirmDestructiveText: { color: "#FFFFFF", fontWeight: "700" },
});
