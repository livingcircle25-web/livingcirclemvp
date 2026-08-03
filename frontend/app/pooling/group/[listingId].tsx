import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { Avatar } from "@/src/components/Avatar";
import { C, R, S } from "@/src/theme/colors";

const REPORT_REASONS = ["Fake profile", "Inappropriate", "Unsafe", "Scam"];

export default function PoolingGroupChat() {
  const router = useRouter();
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const [group, setGroup] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    try {
      const [meMe, grp] = await Promise.all([api.me(), api.poolingGroup(String(listingId))]);
      setMe(meMe);
      setGroup(grp);
      if (grp.my_verified) {
        const msgs = await api.poolingGroupMessages(String(listingId));
        setMessages(msgs);
        setLocked(false);
      } else {
        setLocked(true);
      }
    } catch {
      setLocked(true);
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 3500);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages.length]);

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    try {
      const msg = await api.poolingSendGroupMessage(String(listingId), t);
      setMessages((p) => [...p, msg]);
    } catch {}
  };

  const doLeave = async () => {
    await api.poolingLeaveGroup(String(listingId));
    router.replace("/(tabs)/pooling");
  };

  const doRemove = async (memberId: string) => {
    await api.poolingRemoveMember(String(listingId), memberId);
    setSelectedMember(null);
    load();
  };

  const doReport = async () => {
    if (!selectedMember || !reportReason) return;
    await api.poolingReportMember(String(listingId), selectedMember.user_id, reportReason);
    setReportReason(null);
    setSelectedMember(null);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={C.brand} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} testID="pooling-group-back">
          <Ionicons name="chevron-back" size={26} color={C.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{group?.address || "Group"}</Text>
          <Text style={styles.headerSub}>{group?.members?.length || 0} members</Text>
        </View>
        <Pressable onPress={() => setShowMenu(true)} testID="pooling-group-menu">
          <Ionicons name="ellipsis-vertical" size={22} color={C.onSurface} />
        </Pressable>
      </View>

      {locked ? (
        <View style={styles.lockedWrap} testID="pooling-group-locked">
          <Ionicons name="lock-closed" size={48} color={C.onSurfaceTertiary} />
          <Text style={styles.lockedTitle}>Verification pending</Text>
          <Text style={styles.lockedSub}>Complete verification to unlock this group chat.</Text>
        </View>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.membersBar} contentContainerStyle={{ gap: S.sm, paddingHorizontal: S.lg }}>
            {(group?.members || []).map((m: any) => (
              <Pressable key={m.user_id} style={styles.memberChip} onPress={() => setSelectedMember(m)} testID={`pooling-member-${m.user_id}`}>
                <Avatar name={m.name} photo={m.photo} size={36} />
                <Text style={styles.memberChipName} numberOfLines={1}>{m.is_owner ? `${m.name} 👑` : m.name}</Text>
                {!m.verified && <Text style={styles.memberChipPending}>pending</Text>}
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.safetyBanner}>
            <Ionicons name="shield-checkmark" size={15} color="#92400E" />
            <Text style={styles.safetyBannerText}>
              🛡️ Never share your phone, address, or bank details in this group
            </Text>
          </View>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m) => m.id}
              contentContainerStyle={{ padding: S.lg, gap: S.sm, paddingBottom: S.lg }}
              ListEmptyComponent={
                <Text style={{ textAlign: "center", color: C.onSurfaceTertiary, marginTop: 40 }}>
                  Say hi to the group 👋
                </Text>
              }
              renderItem={({ item }) => {
                if (item.is_system) {
                  return <Text style={styles.systemMsg}>{item.text}</Text>;
                }
                const mine = me && item.sender_id === me.user_id;
                const sender = (group?.members || []).find((m: any) => m.user_id === item.sender_id);
                return (
                  <View style={[styles.bubbleWrap, mine ? { alignSelf: "flex-end" } : { alignSelf: "flex-start" }]}>
                    {!mine && <Text style={styles.senderName}>{sender?.name || "Member"}</Text>}
                    <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                      <Text style={[styles.bubbleText, mine && { color: C.onBrand }]}>{item.text}</Text>
                    </View>
                    {item.contains_personal_details && (
                      <Text style={styles.piiHint}>⚠️ This might contain contact info</Text>
                    )}
                  </View>
                );
              }}
            />
            <View style={styles.inputBar}>
              <TextInput
                testID="pooling-group-input"
                value={text}
                onChangeText={setText}
                placeholder="Message the group…"
                placeholderTextColor={C.onSurfaceTertiary}
                style={styles.input}
                multiline
              />
              <Pressable testID="pooling-group-send" onPress={send} style={styles.sendBtn} disabled={!text.trim()}>
                <Ionicons name="send" size={20} color={C.onBrand} />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </>
      )}

      {/* Header menu */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowMenu(false)}>
          <View style={styles.menu}>
            {group?.is_owner ? (
              <Pressable style={styles.menuItem} onPress={() => { setShowMenu(false); router.push("/pooling/my-listings"); }} testID="pooling-manage-listing">
                <Ionicons name="settings-outline" size={20} color={C.onSurface} />
                <Text style={styles.menuText}>Manage listing</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.menuItem} onPress={() => { setShowMenu(false); doLeave(); }} testID="pooling-leave-group">
                <Ionicons name="exit-outline" size={20} color={C.error} />
                <Text style={[styles.menuText, { color: C.error }]}>Leave group</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Member action sheet */}
      <Modal visible={!!selectedMember} transparent animationType="fade" onRequestClose={() => setSelectedMember(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedMember(null)}>
          <View style={styles.menu}>
            <View style={{ padding: S.md }}>
              <Text style={{ fontWeight: "800", fontSize: 15, color: C.onSurface }}>{selectedMember?.name}</Text>
              {selectedMember?.age ? <Text style={{ fontSize: 12, color: C.onSurfaceTertiary, marginTop: 2 }}>{selectedMember.age} · {selectedMember.occupation}</Text> : null}
            </View>
            {group?.is_owner && !selectedMember?.is_owner && (
              <Pressable style={styles.menuItem} onPress={() => doRemove(selectedMember.user_id)} testID="pooling-remove-member">
                <Ionicons name="person-remove-outline" size={20} color={C.error} />
                <Text style={[styles.menuText, { color: C.error }]}>Remove member</Text>
              </Pressable>
            )}
            {selectedMember?.user_id !== me?.user_id && (
              <Pressable style={styles.menuItem} onPress={() => setReportReason("__pick__")} testID="pooling-report-member">
                <Ionicons name="flag-outline" size={20} color={C.warning} />
                <Text style={[styles.menuText, { color: C.warning }]}>Report member</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Report reason picker */}
      <Modal visible={reportReason === "__pick__"} transparent animationType="fade" onRequestClose={() => setReportReason(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setReportReason(null)}>
          <View style={styles.menu}>
            {REPORT_REASONS.map((r) => (
              <Pressable key={r} style={styles.menuItem} onPress={() => { setReportReason(r); }} testID={`pooling-report-reason-${r}`}>
                <Text style={styles.menuText}>{r}</Text>
              </Pressable>
            ))}
            {reportReason && reportReason !== "__pick__" && (
              <Pressable style={[styles.menuItem, { justifyContent: "center", backgroundColor: C.brandTint }]} onPress={doReport} testID="pooling-report-submit">
                <Text style={[styles.menuText, { color: C.brand, fontWeight: "800" }]}>Submit report: {reportReason}</Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row", alignItems: "center", gap: S.md,
    paddingHorizontal: S.lg, paddingVertical: S.md,
    borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.bg,
  },
  headerTitle: { fontSize: 16, fontWeight: "800", color: C.onSurface },
  headerSub: { fontSize: 12, color: C.onSurfaceTertiary, marginTop: 2 },
  lockedWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: S.xxl, gap: S.md },
  lockedTitle: { fontSize: 20, fontWeight: "800", color: C.onSurface, marginTop: S.sm },
  lockedSub: { fontSize: 14, color: C.onSurfaceSecondary, textAlign: "center", lineHeight: 20 },
  membersBar: { maxHeight: 64, borderBottomWidth: 1, borderBottomColor: C.border, paddingVertical: S.sm },
  memberChip: { alignItems: "center", width: 60 },
  memberChipName: { fontSize: 10, color: C.onSurfaceSecondary, marginTop: 2, fontWeight: "600" },
  memberChipPending: { fontSize: 9, color: C.warning, fontWeight: "700" },
  safetyBanner: {
    flexDirection: "row", alignItems: "center", gap: S.sm,
    backgroundColor: "rgba(251,191,36,0.10)", paddingHorizontal: S.lg, paddingVertical: S.md,
    borderBottomWidth: 1, borderBottomColor: "rgba(251,191,36,0.30)",
  },
  safetyBannerText: { flex: 1, fontSize: 12, color: "#F5A623", lineHeight: 17, fontWeight: "500" },
  systemMsg: { textAlign: "center", fontSize: 12, color: C.onSurfaceTertiary, fontStyle: "italic", marginVertical: 4 },
  bubbleWrap: { maxWidth: "78%" },
  senderName: { fontSize: 11, color: C.onSurfaceTertiary, fontWeight: "700", marginBottom: 2, marginLeft: 4 },
  bubble: { paddingHorizontal: S.lg, paddingVertical: S.md, borderRadius: R.md },
  bubbleMine: { backgroundColor: C.brand, borderBottomRightRadius: 4, borderWidth: 1, borderColor: C.brand },
  bubbleTheirs: { backgroundColor: C.surfaceSecondary, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: C.border },
  bubbleText: { fontSize: 15, color: C.onSurface, lineHeight: 20 },
  piiHint: { fontSize: 10, color: C.warning, marginTop: 2, marginHorizontal: 4 },
  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: S.md,
    paddingHorizontal: S.lg, paddingVertical: S.md,
    borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg,
  },
  input: {
    flex: 1, backgroundColor: C.surfaceSecondary, borderRadius: R.lg,
    paddingHorizontal: S.lg, paddingVertical: S.md, fontSize: 15, color: C.onSurface,
    maxHeight: 100, borderWidth: 1, borderColor: C.borderCyan,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: C.brand,
    alignItems: "center", justifyContent: "center",
  },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "flex-end", padding: S.lg, paddingTop: 80 },
  menu: {
    backgroundColor: C.surface, borderRadius: R.md, padding: S.sm, minWidth: 220,
    borderWidth: 1, borderColor: C.border, shadowColor: "#000000", shadowOpacity: 0.12,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  menuItem: { flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: S.md, paddingHorizontal: S.md },
  menuText: { fontSize: 15, fontWeight: "600", color: C.onSurface },
});
