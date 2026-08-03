import { useCallback, useEffect, useState } from "react";
import {
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
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/src/api/client";
import { Avatar } from "@/src/components/Avatar";
import { PressableScale } from "@/src/components/PressableScale";
import { Chip, ChipRow } from "@/src/components/OnboardScreen";
import { C, CARD_SHADOW, R, S } from "@/src/theme/colors";
import { POOLING_AREAS, BHK_TYPES } from "@/src/constants/pooling";

type Filters = {
  area?: string;
  rent_min?: number;
  rent_max?: number;
  bhk_type?: string;
};

function ListingCard({ item, onPress }: { item: any; onPress: () => void }) {
  const photo = item.photos?.[0]?.encrypted_data;
  const needed = Math.max(0, (item.roommates_needed ?? 0) - (item.roommates_current ?? 0));
  const amenities: string[] = item.amenities || [];
  const shownAmenities = amenities.slice(0, 4);
  const extraAmenities = amenities.length - shownAmenities.length;
  const owner = item.owner || {};

  return (
    <PressableScale
      testID={`pooling-browse-card-${item.id}`}
      onPress={onPress}
      style={[styles.card, CARD_SHADOW]}
    >
      {photo ? (
        <Image
          source={{ uri: photo.startsWith("data:") ? photo : `data:image/jpeg;base64,${photo}` }}
          style={styles.cardPhoto}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.cardPhoto, styles.cardPhotoFallback]}>
          <Ionicons name="home-outline" size={40} color={C.onSurfaceTertiary} />
        </View>
      )}

      <View style={styles.cardBody}>
        <Text style={styles.cardAddress} numberOfLines={1}>{item.address}</Text>
        <Text style={styles.cardMeta}>
          {item.bhk_type} · ₹{Number(item.rent || 0).toLocaleString()}/mo
        </Text>
        <View style={styles.cardMetaRow}>
          {needed > 0 && (
            <View style={styles.neededPill}>
              <Text style={styles.neededPillText}>Need {needed} more</Text>
            </View>
          )}
          {item.move_in_date ? (
            <Text style={styles.cardMoveIn}>Move-in: {item.move_in_date}</Text>
          ) : null}
        </View>

        {amenities.length > 0 && (
          <View style={styles.amenityRow}>
            {shownAmenities.map((a) => (
              <View key={a} style={styles.amenityChip}>
                <Text style={styles.amenityChipText} numberOfLines={1}>{a}</Text>
              </View>
            ))}
            {extraAmenities > 0 && (
              <View style={styles.amenityChip}>
                <Text style={styles.amenityChipText}>+{extraAmenities} more</Text>
              </View>
            )}
          </View>
        )}

        {item.description ? (
          <Text style={styles.cardDescription} numberOfLines={2}>{item.description}</Text>
        ) : null}

        <View style={styles.ownerRow}>
          <Avatar name={owner.name} photo={owner.photo ?? null} size={32} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.ownerName} numberOfLines={1}>
              {owner.name}{owner.age ? `, ${owner.age}` : ""}
            </Text>
          </View>
          {owner.id_verified ? (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>✅ ID Verified</Text>
            </View>
          ) : null}
        </View>
      </View>
    </PressableScale>
  );
}

function FilterSheet({
  visible,
  initial,
  onClose,
  onApply,
}: {
  visible: boolean;
  initial: Filters;
  onClose: () => void;
  onApply: (f: Filters) => void;
}) {
  const [area, setArea] = useState<string>(initial.area || "");
  const [rentMin, setRentMin] = useState(initial.rent_min ? String(initial.rent_min) : "");
  const [rentMax, setRentMax] = useState(initial.rent_max ? String(initial.rent_max) : "");
  const [bhk, setBhk] = useState<string>(initial.bhk_type || "");
  const [areaSearch, setAreaSearch] = useState("");

  useEffect(() => {
    if (visible) {
      setArea(initial.area || "");
      setRentMin(initial.rent_min ? String(initial.rent_min) : "");
      setRentMax(initial.rent_max ? String(initial.rent_max) : "");
      setBhk(initial.bhk_type || "");
      setAreaSearch("");
    }
  }, [visible, initial]);

  const filteredAreas = POOLING_AREAS.filter((a) =>
    a.toLowerCase().includes(areaSearch.trim().toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.sheet, CARD_SHADOW]} testID="pooling-browse-filter-sheet">
          <View style={styles.sheetHandle} />
          <ScrollView contentContainerStyle={{ padding: S.xl }} keyboardShouldPersistTaps="handled">
            <Text style={styles.h1}>Filters</Text>

            <Text style={styles.filterLabel}>Area</Text>
            <TextInput
              testID="pooling-browse-filter-area-search"
              value={areaSearch}
              onChangeText={setAreaSearch}
              placeholder="Search areas…"
              placeholderTextColor={C.onSurfaceTertiary}
              style={styles.fInput}
            />
            <View style={styles.areaListWrap}>
              <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                <ChipRow>
                  {area ? (
                    <Chip
                      label={`✕ ${area}`}
                      active
                      onPress={() => setArea("")}
                      testID="pooling-browse-filter-area-clear"
                    />
                  ) : null}
                  {filteredAreas.map((a) => (
                    <Chip
                      key={a}
                      label={a}
                      active={area === a}
                      onPress={() => setArea(area === a ? "" : a)}
                      testID={`pooling-browse-filter-area-${a}`}
                    />
                  ))}
                </ChipRow>
              </ScrollView>
            </View>

            <Text style={styles.filterLabel}>Rent (₹/mo)</Text>
            <View style={{ flexDirection: "row", gap: S.md }}>
              <TextInput
                testID="pooling-browse-filter-rent-min"
                value={rentMin}
                onChangeText={(t) => setRentMin(t.replace(/\D/g, ""))}
                keyboardType="number-pad"
                placeholder="Min"
                placeholderTextColor={C.onSurfaceTertiary}
                style={[styles.fInput, { flex: 1 }]}
              />
              <TextInput
                testID="pooling-browse-filter-rent-max"
                value={rentMax}
                onChangeText={(t) => setRentMax(t.replace(/\D/g, ""))}
                keyboardType="number-pad"
                placeholder="Max"
                placeholderTextColor={C.onSurfaceTertiary}
                style={[styles.fInput, { flex: 1 }]}
              />
            </View>

            <Text style={styles.filterLabel}>BHK Type</Text>
            <ChipRow>
              {BHK_TYPES.map((t) => (
                <Chip
                  key={t}
                  label={t}
                  active={bhk === t}
                  onPress={() => setBhk(bhk === t ? "" : t)}
                  testID={`pooling-browse-filter-bhk-${t}`}
                />
              ))}
            </ChipRow>
          </ScrollView>

          <View style={{ flexDirection: "row", padding: S.lg, gap: S.md }}>
            <PressableScale
              testID="pooling-browse-filter-clear"
              style={[styles.cta, { flex: 1, backgroundColor: C.surfaceTertiary }]}
              onPress={() => onApply({})}
            >
              <Text style={[styles.ctaText, { color: C.onSurface }]}>Clear</Text>
            </PressableScale>
            <PressableScale
              testID="pooling-browse-filter-apply"
              style={[styles.cta, { flex: 2 }]}
              onPress={() =>
                onApply({
                  area: area || undefined,
                  rent_min: rentMin ? Number(rentMin) : undefined,
                  rent_max: rentMax ? Number(rentMax) : undefined,
                  bhk_type: bhk || undefined,
                })
              }
            >
              <Text style={styles.ctaText}>Apply</Text>
            </PressableScale>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function PoolingJoin() {
  const router = useRouter();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({});
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async (f: Filters) => {
    setLoading(true);
    try {
      const res = await api.poolingBrowse(f);
      setListings(res || []);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filters);
  }, [load, filters]);

  const activeFilterCount = Object.values(filters).filter((v) => v !== undefined && v !== "").length;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()} testID="pooling-browse-back">
          <Ionicons name="chevron-back" size={22} color={C.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Browse Listings</Text>
        <Pressable
          style={styles.filterBtn}
          onPress={() => setShowFilters(true)}
          testID="pooling-browse-filter-button"
        >
          <Ionicons name="options-outline" size={20} color={C.brand} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {loading ? (
        <Text style={styles.loadingText}>Loading listings…</Text>
      ) : listings.length === 0 ? (
        <View style={styles.emptyWrap} testID="pooling-browse-empty">
          <Ionicons name="home-outline" size={64} color={C.borderStrong} />
          <Text style={styles.emptyTitle}>No listings match your filters</Text>
          <Text style={styles.emptySub}>Try widening your search area or rent range.</Text>
          <PressableScale
            testID="pooling-browse-reset"
            style={styles.resetBtn}
            onPress={() => setFilters({})}
          >
            <Text style={styles.resetBtnText}>Reset filters</Text>
          </PressableScale>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: S.lg, gap: S.lg, paddingBottom: S.xxxl }}
          renderItem={({ item }) => (
            <ListingCard
              item={item}
              onPress={() =>
                router.push({ pathname: "/pooling/[listingId]", params: { listingId: item.id } })
              }
            />
          )}
        />
      )}

      <FilterSheet
        visible={showFilters}
        initial={filters}
        onClose={() => setShowFilters(false)}
        onApply={(f) => {
          setFilters(f);
          setShowFilters(false);
        }}
      />
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
  filterBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.surfaceTertiary, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: C.borderCyan,
  },
  filterBadge: {
    position: "absolute", top: -4, right: -4,
    minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
    backgroundColor: C.brand, alignItems: "center", justifyContent: "center",
  },
  filterBadgeText: { color: C.onBrand, fontSize: 10, fontWeight: "800" },
  loadingText: { textAlign: "center", color: C.onSurfaceTertiary, marginTop: 40 },

  emptyWrap: { alignItems: "center", padding: S.xxl, marginTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: C.onSurface, marginTop: S.lg, textAlign: "center" },
  emptySub: { fontSize: 14, color: C.onSurfaceTertiary, marginTop: S.sm, textAlign: "center" },
  resetBtn: { marginTop: S.xl, backgroundColor: C.brand, paddingHorizontal: S.xl, paddingVertical: S.md, borderRadius: R.pill },
  resetBtnText: { color: C.onBrand, fontWeight: "700" },

  card: {
    backgroundColor: C.surface, borderRadius: R.lg, overflow: "hidden",
    borderWidth: 1, borderColor: C.border,
  },
  cardPhoto: { width: "100%", height: 180 },
  cardPhotoFallback: { alignItems: "center", justifyContent: "center", backgroundColor: C.surfaceSecondary },
  cardBody: { padding: S.lg, gap: 6 },
  cardAddress: { fontSize: 16, fontWeight: "800", color: C.onSurface },
  cardMeta: { fontSize: 14, color: C.brand, fontWeight: "700" },
  cardMetaRow: { flexDirection: "row", alignItems: "center", gap: S.md, flexWrap: "wrap" },
  neededPill: {
    backgroundColor: C.surfaceTertiary, borderWidth: 1, borderColor: C.borderCyan,
    borderRadius: R.pill, paddingHorizontal: S.md, paddingVertical: 3,
  },
  neededPillText: { color: C.brand, fontSize: 11, fontWeight: "700" },
  cardMoveIn: { fontSize: 12, color: C.onSurfaceTertiary },
  amenityRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  amenityChip: {
    backgroundColor: C.surfaceSecondary, borderRadius: R.pill,
    paddingHorizontal: S.md, paddingVertical: 3, borderWidth: 1, borderColor: C.border,
  },
  amenityChipText: { fontSize: 11, color: C.onSurfaceSecondary, fontWeight: "600" },
  cardDescription: { fontSize: 13, color: C.onSurfaceSecondary, lineHeight: 18, marginTop: 2 },
  ownerRow: { flexDirection: "row", alignItems: "center", gap: S.sm, marginTop: S.sm },
  ownerName: { fontSize: 13, fontWeight: "700", color: C.onSurface },
  verifiedBadge: {
    backgroundColor: "rgba(82,196,26,0.10)", borderWidth: 1, borderColor: C.success,
    borderRadius: R.pill, paddingHorizontal: S.sm, paddingVertical: 3,
  },
  verifiedBadgeText: { fontSize: 10, color: C.success, fontWeight: "700" },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "85%", borderWidth: 1, borderColor: C.border },
  sheetHandle: { width: 40, height: 4, backgroundColor: C.borderStrong, borderRadius: 2, alignSelf: "center", marginTop: S.md },
  h1: { fontSize: 24, fontWeight: "800", color: C.onSurface, letterSpacing: 0.5 },
  filterLabel: { fontSize: 14, color: C.onSurfaceSecondary, marginTop: S.lg, marginBottom: S.sm, fontWeight: "600" },
  fInput: {
    backgroundColor: C.surfaceSecondary, borderRadius: R.md,
    paddingHorizontal: S.lg, paddingVertical: S.md, fontSize: 16, color: C.onSurface,
    borderWidth: 1, borderColor: C.border,
  },
  areaListWrap: { marginTop: S.sm },
  cta: { backgroundColor: C.brand, paddingVertical: S.lg, borderRadius: R.pill, alignItems: "center" },
  ctaText: { color: C.onBrand, fontSize: 16, fontWeight: "800" },
});
