import { useCallback, useEffect, useRef, useState } from "react";
import { storage } from "@/src/utils/storage";
import {
  ActivityIndicator,
  FlatList,
  Image,
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
import { pickImage } from "@/src/utils/pickImage";
import { C, R, S } from "@/src/theme/colors";

export default function Chat() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const [messages, setMessages] = useState<any[]>([]);
  const [other, setOther] = useState<any>(null);
  const [me, setMe] = useState<any>(null);
  const [text, setText] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [canChat, setCanChat] = useState<boolean | null>(null);
  const [showTour, setShowTour] = useState(false);

  // Persist banner dismissal per chat session.
  useEffect(() => {
    storage.getItem<boolean>(`safety_banner_${id}`, false).then((v) => {
      if (v) setBannerDismissed(true);
    });
  }, [id]);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    try {
      const [meMe, list] = await Promise.all([api.me(), api.matches()]);
      setMe(meMe);
      const m = list.find((x: any) => x.match_id === id);
      if (m) {
        setOther(m.user);
        setCanChat(m.can_chat);
        if (m.can_chat) {
          const msgs = await api.messages(String(id));
          setMessages(msgs);
        }
      }
    } catch {}
  }, [id]);

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
      const msg = await api.sendMessage(String(id), t);
      setMessages((p) => [...p, msg]);
    } catch {}
  };

  const block = async () => {
    if (!other) return;
    await api.block(other.user_id);
    setShowMenu(false);
    router.back();
  };

  const report = async () => {
    if (!other) return;
    await api.report(other.user_id);
    setShowMenu(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} testID="chat-back">
          <Ionicons name="chevron-back" size={26} color={C.onSurface} />
        </Pressable>
        <Avatar name={other?.name || String(name)} photo={other?.photo} size={36} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName}>{other?.name || name}</Text>
          {other?.localities?.length ? (
            <Text style={styles.localityCtx} testID="chat-locality">
              Matches with someone in {other.localities[0]}
            </Text>
          ) : null}
          {other?.compatibility != null && (
            <Text style={styles.headerSub} testID="chat-compat">
              {other.compatibility}% compatible
              {other.shared?.length ? ` · ${other.shared[0]}` : ""}
            </Text>
          )}
        </View>
        {canChat && (
          <Pressable
            onPress={() => setShowTour(true)}
            testID="chat-house-tour"
            style={styles.locationBtn}
          >
            <Text style={styles.locationBtnText}>📷</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => router.push(`/location/${id}`)}
          testID="chat-location"
          style={styles.locationBtn}
        >
          <Text style={styles.locationBtnText}>📍</Text>
        </Pressable>
        <Pressable onPress={() => setShowMenu(true)} testID="chat-menu">
          <Ionicons name="ellipsis-vertical" size={22} color={C.onSurface} />
        </Pressable>
      </View>

      {canChat === false ? (
        <View style={styles.lockedWrap} testID="chat-locked">
          <Ionicons name="lock-closed" size={48} color={C.onSurfaceTertiary} />
          <Text style={styles.lockedTitle}>Verification pending</Text>
          <Text style={styles.lockedSub}>
            You and {other?.name || "your match"} both need to verify it&apos;s really you before you can chat.
          </Text>
          <Pressable
            style={styles.lockedBtn}
            onPress={() => router.push({ pathname: "/verification/[matchId]", params: { matchId: String(id) } })}
            testID="chat-start-verification"
          >
            <Ionicons name="camera-outline" size={18} color={C.onBrand} />
            <Text style={styles.lockedBtnText}>Start Verification</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* Bot banner */}
          {other?.is_bot && (
            <View style={styles.botBanner}>
              <Text style={styles.botBannerEmoji}>🤖</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.botBannerTitle}>Test Bot — All Features Enabled</Text>
                <Text style={styles.botBannerSub}>Messages are instant auto-replies. Maps, lifestyle & photos work normally.</Text>
              </View>
            </View>
          )}

          {/* Safety banner */}
          {!bannerDismissed && !other?.is_bot && (
            <View style={styles.safetyBanner}>
              <Ionicons name="shield-checkmark" size={15} color="#92400E" />
              <Text style={styles.safetyBannerText}>
                🛡️ Never share your phone, address, or bank details in chat
              </Text>
              <Pressable
                onPress={() => {
                  setBannerDismissed(true);
                  storage.setItem(`safety_banner_${id}`, true);
                }}
                hitSlop={8}
                testID="dismiss-safety-banner"
              >
                <Ionicons name="close" size={16} color="#92400E" />
              </Pressable>
            </View>
          )}

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
          >
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m) => m.id}
              contentContainerStyle={{ padding: S.lg, gap: S.sm, paddingBottom: S.lg }}
              ListEmptyComponent={
                <Text style={{ textAlign: "center", color: C.onSurfaceTertiary, marginTop: 40 }}>
                  You matched! Say hi to {other?.name || name} 👋
                </Text>
              }
              renderItem={({ item }) => {
                const mine = me && item.sender_id === me.user_id;
                return (
                  <View style={[styles.bubbleWrap, mine ? { alignSelf: "flex-end" } : { alignSelf: "flex-start" }]}>
                    <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                      <Text style={[styles.bubbleText, mine && { color: C.onBrand }]}>{item.text}</Text>
                    </View>
                  </View>
                );
              }}
            />
            <View style={styles.inputBar}>
              <TextInput
                testID="chat-input"
                value={text}
                onChangeText={setText}
                placeholder="Type a message…"
                placeholderTextColor={C.onSurfaceTertiary}
                style={styles.input}
                multiline
              />
              <Pressable testID="chat-send" onPress={send} style={styles.sendBtn} disabled={!text.trim()}>
                <Ionicons name="send" size={20} color={C.onBrand} />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </>
      )}

      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowMenu(false)}>
          <View style={styles.menu}>
            <Pressable style={styles.menuItem} onPress={report} testID="chat-report">
              <Ionicons name="flag-outline" size={20} color={C.warning} />
              <Text style={[styles.menuText, { color: C.warning }]}>Report user</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={block} testID="chat-block">
              <Ionicons name="ban-outline" size={20} color={C.error} />
              <Text style={[styles.menuText, { color: C.error }]}>Block user</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <HouseTourModal
        visible={showTour}
        matchId={String(id)}
        me={me}
        otherName={other?.name || String(name)}
        onClose={() => setShowTour(false)}
      />
    </SafeAreaView>
  );
}

// ── House Tour (async in-app photo capture) ────────────────────────────────

function HouseTourModal({
  visible,
  matchId,
  me,
  otherName,
  onClose,
}: {
  visible: boolean;
  matchId: string;
  me: any;
  otherName: string;
  onClose: () => void;
}) {
  const [tour, setTour] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [fullscreen, setFullscreen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const tours = await api.houseTourForMatch(matchId);
      setTour(tours?.[0] || null);
    } catch {} finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [visible, load]);

  const iAmReceiver = tour && me && tour.receiver_id === me.user_id;
  const iAmRequester = tour && me && tour.requester_id === me.user_id;

  const doRequest = async () => {
    setBusy(true);
    try {
      const t = await api.houseTourRequest(matchId);
      setTour(t);
    } catch {} finally {
      setBusy(false);
    }
  };

  const doRespond = async (accept: boolean) => {
    if (!tour) return;
    setBusy(true);
    try {
      await api.houseTourRespond(tour.id, accept);
      await load();
    } catch {} finally {
      setBusy(false);
    }
  };

  const doTakePhoto = async () => {
    if (!tour) return;
    const uri = await pickImage("camera");
    if (!uri) return;
    setBusy(true);
    try {
      await api.houseTourAddPhoto(tour.id, uri);
      await load();
    } catch {} finally {
      setBusy(false);
    }
  };

  const doDeletePhoto = async (photoId: string) => {
    if (!tour) return;
    try {
      await api.houseTourDeletePhoto(tour.id, photoId);
      await load();
    } catch {}
  };

  const doFinish = async () => {
    if (!tour) return;
    setBusy(true);
    try {
      await api.houseTourComplete(tour.id);
      await load();
    } catch {} finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={tourStyles.backdrop}>
        <View style={tourStyles.sheet}>
          <View style={tourStyles.sheetHeader}>
            <Text style={tourStyles.sheetTitle}>📷 House Tour</Text>
            <Pressable onPress={onClose} hitSlop={8} testID="house-tour-close">
              <Ionicons name="close" size={24} color={C.onSurface} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: S.xl }} showsVerticalScrollIndicator={false}>
            {loading ? (
              <ActivityIndicator color={C.brand} style={{ marginTop: S.xl }} />
            ) : !tour ? (
              <View style={tourStyles.block}>
                <Text style={tourStyles.blockText}>
                  Request a house tour from {otherName}? They&apos;ll take in-app photos of the property to share with you.
                </Text>
                <Pressable style={tourStyles.primaryBtn} onPress={doRequest} disabled={busy} testID="house-tour-request">
                  <Text style={tourStyles.primaryBtnText}>{busy ? "Sending…" : "Send Request"}</Text>
                </Pressable>
              </View>
            ) : (
              <>
                {tour.status === "requested" && iAmReceiver && (
                  <View style={tourStyles.block}>
                    <Text style={tourStyles.blockText}>
                      {otherName} requested a house tour. Accept to start taking photos.
                    </Text>
                    <View style={{ flexDirection: "row", gap: S.sm }}>
                      <Pressable style={[tourStyles.primaryBtn, { flex: 1 }]} onPress={() => doRespond(true)} disabled={busy} testID="house-tour-accept">
                        <Text style={tourStyles.primaryBtnText}>Accept</Text>
                      </Pressable>
                      <Pressable style={[tourStyles.secondaryBtn, { flex: 1 }]} onPress={() => doRespond(false)} disabled={busy} testID="house-tour-decline">
                        <Text style={tourStyles.secondaryBtnText}>Decline</Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {tour.status === "requested" && iAmRequester && (
                  <View style={tourStyles.block}>
                    <Text style={tourStyles.blockText}>⏳ Waiting for {otherName} to accept your request…</Text>
                  </View>
                )}

                {tour.status === "declined" && (
                  <View style={tourStyles.block}>
                    <Text style={tourStyles.blockText}>The tour request was declined.</Text>
                    {iAmRequester && (
                      <Pressable style={tourStyles.primaryBtn} onPress={doRequest} disabled={busy} testID="house-tour-request-again">
                        <Text style={tourStyles.primaryBtnText}>Request again</Text>
                      </Pressable>
                    )}
                  </View>
                )}

                {(tour.status === "accepted" || tour.status === "completed") && (
                  <>
                    {tour.status === "accepted" && iAmReceiver && (
                      <View style={tourStyles.actionRow}>
                        <Pressable style={tourStyles.primaryBtn} onPress={doTakePhoto} disabled={busy} testID="house-tour-take-photo">
                          <Ionicons name="camera" size={16} color={C.onBrand} />
                          <Text style={tourStyles.primaryBtnText}>Take Photo</Text>
                        </Pressable>
                        <Pressable style={tourStyles.secondaryBtn} onPress={doFinish} disabled={busy} testID="house-tour-finish">
                          <Text style={tourStyles.secondaryBtnText}>Finish Tour</Text>
                        </Pressable>
                      </View>
                    )}
                    {tour.status === "accepted" && iAmRequester && (
                      <Text style={tourStyles.hint}>⏳ Waiting for {otherName} to share photos…</Text>
                    )}
                    {tour.status === "completed" && (
                      <Text style={tourStyles.hint}>Tour completed.</Text>
                    )}

                    <View style={tourStyles.gallery}>
                      {(tour.photos || []).length === 0 ? (
                        <Text style={tourStyles.hint}>No photos yet.</Text>
                      ) : (
                        tour.photos.map((p: any) => (
                          <View key={p.photo_id} style={tourStyles.thumbWrap}>
                            <Pressable onPress={() => setFullscreen(p.encrypted_data)}>
                              <Image source={{ uri: p.encrypted_data }} style={tourStyles.thumb} />
                            </Pressable>
                            <Pressable
                              style={tourStyles.thumbDelete}
                              onPress={() => doDeletePhoto(p.photo_id)}
                              testID={`house-tour-delete-${p.photo_id}`}
                            >
                              <Ionicons name="trash" size={13} color="#fff" />
                            </Pressable>
                          </View>
                        ))
                      )}
                    </View>
                  </>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>

      <Modal visible={!!fullscreen} transparent animationType="fade" onRequestClose={() => setFullscreen(null)}>
        <Pressable style={tourStyles.fullscreenBackdrop} onPress={() => setFullscreen(null)}>
          {fullscreen && <Image source={{ uri: fullscreen }} style={tourStyles.fullscreenImg} resizeMode="contain" />}
        </Pressable>
      </Modal>
    </Modal>
  );
}

const tourStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: "80%", padding: S.xl,
  },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: S.lg },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: C.onSurface },
  block: { gap: S.md, marginBottom: S.md },
  blockText: { fontSize: 14, color: C.onSurfaceSecondary, lineHeight: 20 },
  actionRow: { flexDirection: "row", gap: S.sm, marginBottom: S.lg },
  primaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: C.brand, paddingVertical: S.md, borderRadius: R.pill,
  },
  primaryBtnText: { color: C.onBrand, fontWeight: "700", fontSize: 14 },
  secondaryBtn: {
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: C.brand, paddingVertical: S.md, borderRadius: R.pill,
  },
  secondaryBtnText: { color: C.brand, fontWeight: "700", fontSize: 14 },
  hint: { fontSize: 13, color: C.onSurfaceTertiary, marginBottom: S.md },
  gallery: { flexDirection: "row", flexWrap: "wrap", gap: S.sm },
  thumbWrap: { width: 96, height: 96, borderRadius: R.md, overflow: "hidden" },
  thumb: { width: "100%", height: "100%" },
  thumbDelete: {
    position: "absolute", top: 4, right: 4,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center",
  },
  fullscreenBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center" },
  fullscreenImg: { width: "100%", height: "80%" },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row", alignItems: "center", gap: S.md,
    paddingHorizontal: S.lg, paddingVertical: S.md,
    borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: C.bg,
  },
  locationBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.brandTint,
    borderWidth: 1,
    borderColor: C.borderCyan,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  locationBtnText: { fontSize: 18 },
  lockedWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: S.xxl, gap: S.md },
  lockedTitle: { fontSize: 20, fontWeight: "800", color: C.onSurface, marginTop: S.sm },
  lockedSub: { fontSize: 14, color: C.onSurfaceSecondary, textAlign: "center", lineHeight: 20 },
  lockedBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.brand, paddingVertical: S.md, paddingHorizontal: S.xl,
    borderRadius: R.pill, marginTop: S.md,
  },
  lockedBtnText: { color: C.onBrand, fontWeight: "700", fontSize: 15 },
  botBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(123,97,255,0.12)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(123,97,255,0.30)",
  },
  botBannerEmoji: { fontSize: 22 },
  botBannerTitle: { color: "#8B5CF6", fontWeight: "800", fontSize: 13, letterSpacing: 0.2 },
  botBannerSub: { color: "#C4B5FD", fontSize: 11, marginTop: 2 },
  headerName: { fontSize: 16, fontWeight: "800", color: C.onSurface, letterSpacing: 0.3 },
  localityCtx: { fontSize: 12, color: C.cyan, fontWeight: "600", marginTop: 2 },
  headerSub: { fontSize: 12, color: C.cyan, fontWeight: "600", marginTop: 2 },
  safetyBanner: {
    flexDirection: "row", alignItems: "center", gap: S.sm,
    backgroundColor: "rgba(251,191,36,0.10)",
    paddingHorizontal: S.lg, paddingVertical: S.md,
    borderBottomWidth: 1, borderBottomColor: "rgba(251,191,36,0.30)",
  },
  safetyBannerText: {
    flex: 1, fontSize: 12, color: "#F5A623", lineHeight: 17, fontWeight: "500",
  },
  bubbleWrap: { maxWidth: "78%" },
  bubble: { paddingHorizontal: S.lg, paddingVertical: S.md, borderRadius: R.md },
  bubbleMine: {
    backgroundColor: C.brand, borderBottomRightRadius: 4,
    borderWidth: 1, borderColor: C.brand,
  },
  bubbleTheirs: {
    backgroundColor: C.surfaceSecondary, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: C.border,
  },
  bubbleText: { fontSize: 15, color: C.onSurface, lineHeight: 20 },
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
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.brand, alignItems: "center", justifyContent: "center",
    shadowColor: C.brand, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.20, shadowRadius: 10, elevation: 6,
  },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "flex-end", padding: S.lg, paddingTop: 80 },
  menu: { backgroundColor: C.surface, borderRadius: R.md, padding: S.sm, minWidth: 200, borderWidth: 1, borderColor: C.border, shadowColor: "#000000", shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  menuItem: { flexDirection: "row", alignItems: "center", gap: S.md, paddingVertical: S.md, paddingHorizontal: S.md },
  menuText: { fontSize: 15, fontWeight: "600", color: C.onSurface },
});
