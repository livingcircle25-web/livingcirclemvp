import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
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
import { MapPinPicker } from "@/src/components/MapPinPicker";
import { pickImage } from "@/src/utils/pickImage";
import { BANGALORE_CENTER, BHK_TYPES, POOLING_AMENITIES, POOLING_AREAS } from "@/src/constants/pooling";
import { C, R, S, CARD_SHADOW } from "@/src/theme/colors";

const ROOMMATE_OPTIONS = ["1", "2", "3", "4", "5+"];
const MAX_PHOTOS = 6;
const MIN_PHOTOS = 3;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function ListPoolingScreen() {
  const router = useRouter();

  // ── Gate ────────────────────────────────────────────────────────────
  const [checking, setChecking] = useState(true);
  const [idVerified, setIdVerified] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await api.me();
        setIdVerified(!!me?.id_verified);
      } catch {
        setIdVerified(false);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  // ── Form state ──────────────────────────────────────────────────────
  const [address, setAddress] = useState("");
  const [area, setArea] = useState("");
  const [areaModalVisible, setAreaModalVisible] = useState(false);
  const [areaSearch, setAreaSearch] = useState("");
  const [coords, setCoords] = useState(BANGALORE_CENTER);
  const [geocoding, setGeocoding] = useState(false);

  const [bhkType, setBhkType] = useState<string | null>(null);
  const [rent, setRent] = useState("");
  const [roommatesOption, setRoommatesOption] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [moveInDate, setMoveInDate] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const filteredAreas = useMemo(() => {
    const q = areaSearch.trim().toLowerCase();
    if (!q) return POOLING_AREAS;
    return POOLING_AREAS.filter((a) => a.toLowerCase().includes(q));
  }, [areaSearch]);

  const selectArea = async (a: string) => {
    setArea(a);
    setAreaModalVisible(false);
    setAreaSearch("");
    setGeocoding(true);
    try {
      const results = await api.geocode(`${a}, Bangalore`);
      if (results && results.length > 0 && results[0]?.lat != null && results[0]?.lng != null) {
        setCoords({ lat: results[0].lat, lng: results[0].lng });
      } else {
        setCoords(BANGALORE_CENTER);
      }
    } catch {
      setCoords(BANGALORE_CENTER);
    } finally {
      setGeocoding(false);
    }
  };

  const takePhoto = async (replaceIndex?: number) => {
    const uri = await pickImage("camera");
    if (!uri) return;
    setPhotos((prev) => {
      if (replaceIndex != null) {
        const next = [...prev];
        next[replaceIndex] = uri;
        return next;
      }
      if (prev.length >= MAX_PHOTOS) return prev;
      return [...prev, uri];
    });
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleAmenity = (name: string) => {
    setAmenities((prev) => (prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]));
  };

  const dateValid = DATE_RE.test(moveInDate.trim());
  const rentNum = Number(rent);
  const canSubmit =
    address.trim().length > 0 &&
    !!area &&
    !!bhkType &&
    !isNaN(rentNum) &&
    rentNum > 0 &&
    !!roommatesOption &&
    photos.length >= MIN_PHOTOS &&
    dateValid &&
    !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || !bhkType || !roommatesOption) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.poolingCreateListing({
        address: address.trim(),
        area,
        latitude: coords.lat,
        longitude: coords.lng,
        bhk_type: bhkType,
        rent: rentNum,
        roommates_needed: roommatesOption === "5+" ? 5 : Number(roommatesOption),
        photos,
        description: description.trim() || undefined,
        move_in_date: moveInDate.trim(),
        amenities,
      });
      setSubmitSuccess(true);
      setTimeout(() => router.replace("/pooling/my-listings"), 900);
    } catch (e: any) {
      setSubmitError(e?.message ?? "Failed to post listing. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} testID="pooling-list-back">
          <Ionicons name="chevron-back" size={22} color={C.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>🏘️ List a Place</Text>
        <View style={{ width: 38 }} />
      </View>

      {checking ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator color={C.brand} />
        </View>
      ) : !idVerified ? (
        <View style={styles.centerWrap}>
          <Ionicons name="shield-checkmark-outline" size={56} color={C.borderStrong} />
          <Text style={styles.gateTitle}>Complete ID verification first</Text>
          <Text style={styles.gateSub}>
            Listing a place for roommates requires verified ID, since strangers will be moving in with each other.
          </Text>
          <Pressable
            style={styles.gateBtn}
            onPress={() => router.push("/verification/id")}
            testID="pooling-list-verify-cta"
          >
            <Ionicons name="shield-checkmark" size={18} color={C.onBrand} />
            <Text style={styles.gateBtnText}>Complete ID Verification</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Address */}
          <Field label="Address">
            <TextInput
              style={styles.input}
              placeholder="e.g. 3rd Cross, 100ft Road"
              placeholderTextColor={C.onSurfaceTertiary}
              value={address}
              onChangeText={setAddress}
              testID="pooling-list-address-input"
            />
          </Field>

          {/* Area */}
          <Field label="Area">
            <Pressable
              style={styles.selectBtn}
              onPress={() => setAreaModalVisible(true)}
              testID="pooling-list-area-picker"
            >
              <Text style={area ? styles.selectBtnText : styles.selectBtnPlaceholder}>
                {area || "Choose an area"}
              </Text>
              <Ionicons name="chevron-down" size={18} color={C.onSurfaceTertiary} />
            </Pressable>
          </Field>

          {area ? (
            geocoding ? (
              <View style={[styles.mapLoading]}>
                <ActivityIndicator color={C.brand} />
              </View>
            ) : (
              <View style={{ gap: S.sm, marginBottom: S.lg }}>
                <Text style={styles.caption}>Drag the pin to your exact location</Text>
                <MapPinPicker
                  key={area}
                  latitude={coords.lat}
                  longitude={coords.lng}
                  onChange={(lat, lng) => setCoords({ lat, lng })}
                />
              </View>
            )
          ) : null}

          {/* BHK */}
          <Field label="BHK Type">
            <View style={styles.chipRow}>
              {BHK_TYPES.map((t) => (
                <Pressable
                  key={t}
                  style={[styles.chip, bhkType === t && styles.chipActive]}
                  onPress={() => setBhkType(t)}
                  testID={`pooling-list-bhk-${t}`}
                >
                  <Text style={[styles.chipText, bhkType === t && styles.chipTextActive]}>{t}</Text>
                </Pressable>
              ))}
            </View>
          </Field>

          {/* Rent */}
          <Field label="Rent (₹ per month)">
            <TextInput
              style={styles.input}
              placeholder="e.g. 15000"
              placeholderTextColor={C.onSurfaceTertiary}
              value={rent}
              onChangeText={(t) => setRent(t.replace(/[^0-9]/g, ""))}
              keyboardType="numeric"
              testID="pooling-list-rent-input"
            />
          </Field>

          {/* Roommates needed */}
          <Field label="Roommates needed">
            <View style={styles.chipRow}>
              {ROOMMATE_OPTIONS.map((n) => (
                <Pressable
                  key={n}
                  style={[styles.chip, roommatesOption === n && styles.chipActive]}
                  onPress={() => setRoommatesOption(n)}
                  testID={`pooling-list-roommates-${n}`}
                >
                  <Text style={[styles.chipText, roommatesOption === n && styles.chipTextActive]}>{n}</Text>
                </Pressable>
              ))}
            </View>
          </Field>

          {/* Photos */}
          <Field label={`Photos (${photos.length}/${MAX_PHOTOS}) — at least ${MIN_PHOTOS} required`}>
            <View style={styles.photoGrid}>
              {photos.map((uri, i) => (
                <View key={i} style={styles.photoThumbWrap}>
                  <Image source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
                  <Pressable
                    style={styles.photoRemoveBtn}
                    onPress={() => removePhoto(i)}
                    testID={`pooling-list-photo-remove-${i}`}
                    hitSlop={6}
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                  </Pressable>
                  <Pressable
                    style={styles.photoRetakeBtn}
                    onPress={() => takePhoto(i)}
                    testID={`pooling-list-photo-retake-${i}`}
                    hitSlop={6}
                  >
                    <Ionicons name="camera" size={13} color="#fff" />
                  </Pressable>
                </View>
              ))}
              {photos.length < MAX_PHOTOS && (
                <Pressable
                  style={styles.takePhotoBtn}
                  onPress={() => takePhoto()}
                  testID="pooling-list-take-photo"
                >
                  <Ionicons name="camera-outline" size={26} color={C.brand} />
                  <Text style={styles.takePhotoText}>Take Photo</Text>
                </Pressable>
              )}
            </View>
            <Text style={styles.caption}>
              Photo {Math.min(photos.length, MAX_PHOTOS)} of {MAX_PHOTOS} captured
            </Text>
          </Field>

          {/* Description */}
          <Field label="Description (optional)">
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Tell people about your place — amenities, floor, facing, etc."
              placeholderTextColor={C.onSurfaceTertiary}
              value={description}
              onChangeText={(t) => setDescription(t.slice(0, 500))}
              multiline
              numberOfLines={4}
              maxLength={500}
              testID="pooling-list-description-input"
            />
            <Text style={styles.caption}>{description.length}/500</Text>
          </Field>

          {/* Move-in date */}
          <Field label="Move-in date">
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={C.onSurfaceTertiary}
              value={moveInDate}
              onChangeText={setMoveInDate}
              testID="pooling-list-movein-input"
            />
            {moveInDate.length > 0 && !dateValid && (
              <Text style={styles.errorText}>Use the format YYYY-MM-DD</Text>
            )}
          </Field>

          {/* Amenities */}
          <Field label="Amenities (optional)">
            <View style={styles.chipRow}>
              {POOLING_AMENITIES.map((name) => {
                const active = amenities.includes(name);
                return (
                  <Pressable
                    key={name}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => toggleAmenity(name)}
                    testID={`pooling-list-amenity-${name}`}
                  >
                    {active && <Ionicons name="checkmark" size={13} color={C.onBrand} style={{ marginRight: 4 }} />}
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          {submitError && (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle" size={18} color={C.error} />
              <Text style={styles.errorCardText}>{submitError}</Text>
            </View>
          )}

          {submitSuccess ? (
            <View style={styles.successCard}>
              <Text style={styles.successText}>✅ Listing posted!</Text>
            </View>
          ) : (
            <Pressable
              style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              testID="pooling-list-submit"
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={styles.submitBtnText}>Post Listing</Text>
                </>
              )}
            </Pressable>
          )}
        </ScrollView>
      )}

      {/* Area picker modal */}
      <Modal
        visible={areaModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAreaModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose an area</Text>
              <Pressable onPress={() => setAreaModalVisible(false)} testID="pooling-list-area-modal-close" hitSlop={8}>
                <Ionicons name="close" size={22} color={C.onSurface} />
              </Pressable>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search areas…"
              placeholderTextColor={C.onSurfaceTertiary}
              value={areaSearch}
              onChangeText={setAreaSearch}
              testID="pooling-list-area-search"
            />
            <FlatList
              data={filteredAreas}
              keyExtractor={(a) => a}
              style={{ maxHeight: 380 }}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.areaRow}
                  onPress={() => selectArea(item)}
                  testID={`pooling-list-area-option-${item}`}
                >
                  <Text style={styles.areaRowText}>{item}</Text>
                  {area === item && <Ionicons name="checkmark" size={18} color={C.brand} />}
                </Pressable>
              )}
              ListEmptyComponent={<Text style={styles.emptyAreaText}>No areas match "{areaSearch}"</Text>}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
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

  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: S.xxl, gap: S.md },
  gateTitle: { fontSize: 19, fontWeight: "800", color: C.onSurface, textAlign: "center", marginTop: S.sm },
  gateSub: { fontSize: 14, color: C.onSurfaceSecondary, textAlign: "center", lineHeight: 20, marginBottom: S.md },
  gateBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.brand, paddingHorizontal: 24, paddingVertical: 14, borderRadius: R.pill,
  },
  gateBtnText: { color: C.onBrand, fontWeight: "800", fontSize: 15 },

  scroll: { padding: S.xl, paddingBottom: S.xxxl },

  field: { marginBottom: S.lg },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: C.onSurfaceSecondary, marginBottom: S.sm },
  caption: { fontSize: 12, color: C.onSurfaceTertiary, marginTop: 4 },
  errorText: { fontSize: 12, color: C.error, marginTop: 4 },

  input: {
    backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.border,
    borderRadius: R.md, paddingHorizontal: S.md, paddingVertical: 12,
    fontSize: 15, color: C.onSurface,
  },
  textArea: { minHeight: 90, textAlignVertical: "top" },

  selectBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.border,
    borderRadius: R.md, paddingHorizontal: S.md, paddingVertical: 12,
  },
  selectBtnText: { fontSize: 15, color: C.onSurface, fontWeight: "600" },
  selectBtnPlaceholder: { fontSize: 15, color: C.onSurfaceTertiary },

  mapLoading: {
    height: 260, borderRadius: R.lg, backgroundColor: C.surfaceSecondary,
    alignItems: "center", justifyContent: "center", marginBottom: S.lg,
    borderWidth: 1, borderColor: C.border,
  },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: S.sm },
  chip: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: S.md, paddingVertical: 9, borderRadius: R.pill,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.surfaceSecondary,
  },
  chipActive: { backgroundColor: C.brand, borderColor: C.brand },
  chipText: { fontSize: 13, fontWeight: "600", color: C.onSurface },
  chipTextActive: { color: C.onBrand, fontWeight: "700" },

  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: S.sm },
  photoThumbWrap: { width: 92, height: 92, borderRadius: R.md, overflow: "hidden", position: "relative" },
  photoThumb: { width: "100%", height: "100%" },
  photoRemoveBtn: {
    position: "absolute", top: 4, right: 4,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center",
  },
  photoRetakeBtn: {
    position: "absolute", bottom: 4, left: 4,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "rgba(24,144,255,0.85)", alignItems: "center", justifyContent: "center",
  },
  takePhotoBtn: {
    width: 92, height: 92, borderRadius: R.md,
    borderWidth: 1.5, borderColor: C.borderCyan, borderStyle: "dashed",
    backgroundColor: C.surfaceGlass, alignItems: "center", justifyContent: "center", gap: 4,
  },
  takePhotoText: { fontSize: 11, color: C.brand, fontWeight: "700" },

  errorCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgba(255,77,79,0.08)", borderWidth: 1, borderColor: C.error,
    borderRadius: R.md, padding: S.md, marginBottom: S.lg,
  },
  errorCardText: { flex: 1, fontSize: 13, color: C.error, fontWeight: "600" },

  successCard: {
    backgroundColor: "rgba(82,196,26,0.1)", borderWidth: 1, borderColor: C.success,
    borderRadius: R.lg, padding: S.lg, alignItems: "center",
  },
  successText: { fontSize: 16, fontWeight: "800", color: C.success },

  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: C.brand, paddingVertical: 16, borderRadius: R.pill,
    shadowColor: C.brand, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 14,
    elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: "#fff", fontWeight: "900", fontSize: 15, letterSpacing: 0.4 },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalBox: {
    backgroundColor: C.bg, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg,
    padding: S.xl, maxHeight: "80%",
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: S.md },
  modalTitle: { fontSize: 17, fontWeight: "800", color: C.onSurface },
  searchInput: {
    backgroundColor: C.surfaceSecondary, borderWidth: 1, borderColor: C.border,
    borderRadius: R.md, paddingHorizontal: S.md, paddingVertical: 10,
    fontSize: 14, color: C.onSurface, marginBottom: S.md,
  },
  areaRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  areaRowText: { fontSize: 15, color: C.onSurface },
  emptyAreaText: { textAlign: "center", color: C.onSurfaceTertiary, padding: S.xl },
});
