import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { storage } from "@/src/utils/storage";
import { api } from "@/src/api/client";
import { C } from "@/src/theme/colors";
import { AppLogo } from "@/src/components/AppLogo";
import { HeroCityIllustration } from "@/src/components/HeroCityIllustration";

const { width: W } = Dimensions.get("window");
const isWide = W >= 768;
const isDesk = W >= 1024; // two-column hero with side visual
const isWeb = Platform.OS === "web";
const POPPINS = isWeb ? "Poppins" : undefined;

const webOnly = (style: object) => (isWeb ? (style as any) : {});

// ── Keyframes (web only — react-native-web compiles these to CSS animations) ──

const KF_FADE_UP = {
  from: { opacity: 0, transform: [{ translateY: 28 }] },
  to: { opacity: 1, transform: [{ translateY: 0 }] },
};
const KF_FADE_IN = {
  from: { opacity: 0 },
  to: { opacity: 1 },
};
const KF_FLOAT = {
  "0%": { transform: [{ translateY: 0 }] },
  "50%": { transform: [{ translateY: -12 }] },
  "100%": { transform: [{ translateY: 0 }] },
};
const KF_FLOAT_SLOW = {
  "0%": { transform: [{ translateY: 0 }, { rotate: "-2deg" }] },
  "50%": { transform: [{ translateY: -8 }, { rotate: "2deg" }] },
  "100%": { transform: [{ translateY: 0 }, { rotate: "-2deg" }] },
};
const KF_PULSE = {
  "0%": { transform: [{ scale: 1 }], opacity: 0.55 },
  "70%": { transform: [{ scale: 1.9 }], opacity: 0 },
  "100%": { transform: [{ scale: 1.9 }], opacity: 0 },
};

const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

// Entrance animation with stagger — applied on web, instant on native.
const enter = (delayMs: number) =>
  webOnly({
    animationKeyframes: KF_FADE_UP,
    animationDuration: "800ms",
    animationDelay: `${delayMs}ms`,
    animationTimingFunction: EASE_OUT,
    animationFillMode: "both",
  });

const float = (durMs: number, delayMs = 0, slow = false) =>
  webOnly({
    animationKeyframes: slow ? KF_FLOAT_SLOW : KF_FLOAT,
    animationDuration: `${durMs}ms`,
    animationDelay: `${delayMs}ms`,
    animationTimingFunction: "ease-in-out",
    animationIterationCount: "infinite",
  });

// ── Scroll-reveal (web IntersectionObserver; instant elsewhere) ───────────────

function Reveal({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: any }) {
  const ref = useRef<any>(null);
  const [shown, setShown] = useState(!isWeb);

  useEffect(() => {
    if (!isWeb || shown) return;
    const node = ref.current as unknown as Element | null;
    if (!node || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [shown]);

  return (
    <View ref={ref} style={[style, !shown && { opacity: 0 }, shown && enter(delay)]}>
      {children}
    </View>
  );
}

// ── Brand mark ────────────────────────────────────────────────────────────────

function Mark({ size = 32 }: { size?: number }) {
  return <AppLogo size={size} />;
}

// ── Hover primitives ──────────────────────────────────────────────────────────

function HoverLink({ text, onPress, muted }: { text: string; onPress: () => void; muted?: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      // @ts-ignore — web-only hover events
      onMouseEnter={() => setHovered(true)}
      // @ts-ignore
      onMouseLeave={() => setHovered(false)}
    >
      <Text
        style={[
          styles.link,
          muted && { color: C.onSurfaceSecondary },
          hovered && { color: C.brand },
        ]}
      >
        {text}
      </Text>
    </Pressable>
  );
}

function GradientButton({
  label,
  onPress,
  icon,
  full,
}: {
  label: string;
  onPress: () => void;
  icon?: any;
  full?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      // @ts-ignore
      onMouseEnter={() => setHovered(true)}
      // @ts-ignore
      onMouseLeave={() => setHovered(false)}
      style={[
        { borderRadius: 14, width: full ? "100%" : undefined },
        webOnly({
          transition: `transform 0.25s ${EASE_OUT}, box-shadow 0.25s ease`,
          cursor: "pointer",
          boxShadow: "0 4px 14px rgba(124,58,237,0.30)",
        }),
        hovered &&
          webOnly({
            transform: "translateY(-2px)",
            boxShadow: "0 12px 28px rgba(124,58,237,0.40)",
          }),
      ]}
    >
      <LinearGradient
        colors={hovered ? ["#9F67F5", "#34D5C4"] : [C.gradStart, C.gradEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradBtnInner}
      >
        <Text style={styles.gradBtnText}>{label}</Text>
        {icon && <Ionicons name={icon} size={17} color="#FFFFFF" />}
      </LinearGradient>
    </Pressable>
  );
}

function GhostButton({ label, onPress, full }: { label: string; onPress: () => void; full?: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      // @ts-ignore
      onMouseEnter={() => setHovered(true)}
      // @ts-ignore
      onMouseLeave={() => setHovered(false)}
      style={[
        styles.ghostBtn,
        full && { width: "100%" },
        webOnly({ transition: `all 0.25s ${EASE_OUT}`, cursor: "pointer" }),
        hovered && {
          borderColor: C.brand,
          backgroundColor: C.brandTint,
          ...webOnly({ transform: "translateY(-2px)" }),
        },
      ]}
    >
      <Text style={[styles.ghostBtnText, hovered && { color: C.brand }]}>{label}</Text>
    </Pressable>
  );
}

function LiftCard({ children, style, delay = 0 }: { children: React.ReactNode; style?: any; delay?: number }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Reveal delay={delay} style={style?.flex !== undefined || style?.flexBasis !== undefined ? style : undefined}>
      <View
        // @ts-ignore
        onMouseEnter={() => setHovered(true)}
        // @ts-ignore
        onMouseLeave={() => setHovered(false)}
        style={[
          style?.flex === undefined && style?.flexBasis === undefined ? style : { flex: 1 },
          webOnly({ transition: `transform 0.3s ${EASE_OUT}, box-shadow 0.3s ease, border-color 0.3s ease` }),
          hovered &&
            webOnly({
              transform: "translateY(-6px)",
              boxShadow: "0 20px 40px rgba(20,22,58,0.14)",
            }),
          hovered && { borderColor: "rgba(124,58,237,0.45)" },
        ]}
      >
        {children}
      </View>
    </Reveal>
  );
}

// ── Hero visual: floating mock match card ─────────────────────────────────────

function MatchCardVisual() {
  return (
    <View style={styles.visualWrap}>
      {/* soft decorative circles */}
      <View style={[styles.blob, styles.blobA]} />
      <View style={[styles.blob, styles.blobB]} />

      {/* main mock card */}
      <View style={[styles.mockCard, float(6000)]}>
        <LinearGradient
          colors={["#7C3AED", "#14B8A6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.mockHeader}
        >
          <LinearGradient
            colors={["#14B8A6", "#3B82F6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mockAvatar}
          >
            <Text style={styles.mockAvatarText}>AN</Text>
          </LinearGradient>
          <Text style={styles.mockName}>Ananya, 24</Text>
          <Text style={styles.mockRole}>Product Designer · HSR Layout</Text>
        </LinearGradient>

        <View style={styles.mockBody}>
          <View style={styles.mockChipRow}>
            <View style={styles.mockChip}>
              <Ionicons name="sunny-outline" size={13} color={C.onBrandTint} />
              <Text style={styles.mockChipText}>Early bird</Text>
            </View>
            <View style={styles.mockChip}>
              <Ionicons name="leaf-outline" size={13} color={C.onBrandTint} />
              <Text style={styles.mockChipText}>Veg</Text>
            </View>
            <View style={styles.mockChip}>
              <Ionicons name="sparkles-outline" size={13} color={C.onBrandTint} />
              <Text style={styles.mockChipText}>Tidy</Text>
            </View>
          </View>
          <View style={styles.mockBudgetRow}>
            <Text style={styles.mockBudgetLabel}>Budget</Text>
            <Text style={styles.mockBudgetValue}>₹18–24k</Text>
          </View>
          <View style={styles.mockBarTrack}>
            <LinearGradient
              colors={[C.gradStart, C.gradEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.mockBarFill}
            />
          </View>
        </View>

        {/* match badge with pulse ring */}
        <View style={styles.matchBadgeWrap}>
          <View style={[styles.pulseRing, webOnly({
            animationKeyframes: KF_PULSE,
            animationDuration: "2400ms",
            animationTimingFunction: "ease-out",
            animationIterationCount: "infinite",
          })]} />
          <LinearGradient
            colors={[C.gradStart, C.gradEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.matchBadge}
          >
            <Text style={styles.matchBadgePct}>92%</Text>
            <Text style={styles.matchBadgeLbl}>match</Text>
          </LinearGradient>
        </View>
      </View>

      {/* floating side chips */}
      <View style={[styles.floatChip, styles.floatChipTL, float(5200, 400, true)]}>
        <View style={[styles.floatChipIcon, { backgroundColor: "rgba(20,184,166,0.15)" }]}>
          <Ionicons name="shield-checkmark" size={15} color={C.teal} />
        </View>
        <Text style={styles.floatChipText}>Photo verified</Text>
      </View>

      <View style={[styles.floatChip, styles.floatChipBR, float(5800, 1000, true)]}>
        <View style={[styles.floatChipIcon, { backgroundColor: C.brandTint }]}>
          <Ionicons name="navigate" size={15} color={C.brand} />
        </View>
        <Text style={styles.floatChipText}>1.8 km from work</Text>
      </View>

      <View style={[styles.floatChip, styles.floatChipBL, float(6400, 1800, true)]}>
        <View style={[styles.floatChipIcon, { backgroundColor: "rgba(77,168,255,0.15)" }]}>
          <Ionicons name="chatbubbles" size={15} color={C.sky} />
        </View>
        <Text style={styles.floatChipText}>Chat unlocked</Text>
      </View>
    </View>
  );
}

// ── Section primitives ────────────────────────────────────────────────────────

function SectionHead({ kicker, title, delay = 0 }: { kicker: string; title: string; delay?: number }) {
  return (
    <Reveal delay={delay}>
      <Text style={styles.sectionKicker}>{kicker}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </Reveal>
  );
}

function Step({ n, icon, title, body, delay }: { n: string; icon: any; title: string; body: string; delay: number }) {
  return (
    <LiftCard style={styles.stepCard} delay={delay}>
      <View style={styles.stepCardInner}>
        <View style={styles.stepTopRow}>
          <View style={styles.stepIconWrap}>
            <Ionicons name={icon} size={22} color={C.brand} />
          </View>
          <Text style={styles.stepNum}>{n}</Text>
        </View>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepBody}>{body}</Text>
      </View>
    </LiftCard>
  );
}

function Feature({ icon, title, body, delay }: { icon: any; title: string; body: string; delay: number }) {
  return (
    <LiftCard style={styles.featureCard} delay={delay}>
      <View style={styles.featureCardInner}>
        <View style={styles.featureIconWrap}>
          <Ionicons name={icon} size={22} color={C.brand} />
        </View>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureBody}>{body}</Text>
      </View>
    </LiftCard>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();
  const [session, setSession] = useState<"none" | "onboarded" | "partial">("none");

  // Detect an existing session, but stay on the landing page —
  // logged-in visitors get an "Open App" button instead of a redirect.
  useEffect(() => {
    (async () => {
      const tk = await storage.getItem<string>("lc_token", "");
      if (!tk) return;
      try {
        const me = await api.me();
        setSession(me?.onboarded ? "onboarded" : "partial");
      } catch {
        await storage.removeItem("lc_token");
      }
    })();
  }, []);

  const goAuth = () => router.replace("/auth/phone");
  const openApp = () =>
    router.replace(session === "onboarded" ? "/(tabs)/discover" : "/onboarding/profile");
  const primaryAction = session === "none" ? goAuth : openApp;
  const primaryLabel = session === "none" ? "Get Started" : "Open App";

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* ── NAVBAR ── */}
      <View style={styles.nav}>
        <View style={styles.navBrand}>
          <Mark size={30} />
          <Text style={styles.navBrandText}>Living Circle</Text>
        </View>
        <View style={styles.navRight}>
          {session === "none" && <HoverLink text="Login" onPress={goAuth} muted />}
          <Pressable onPress={primaryAction} style={webOnly({ cursor: "pointer" })}>
            <LinearGradient
              colors={[C.gradStart, C.gradEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.navCta}
            >
              <Text style={styles.navCtaText}>{primaryLabel}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      {/* ── HERO ── */}
      <LinearGradient
        colors={["#FFFFFF", "#F3F0FF"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.hero}
      >
        {isDesk && (
          <>
            <HeroCityIllustration style={styles.heroCityBg} />
            <LinearGradient
              colors={["rgba(255,255,255,0.97)", "rgba(255,255,255,0.55)", "rgba(255,255,255,0.15)"]}
              locations={[0, 0.4, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.heroScrim}
            />
          </>
        )}
        <View style={styles.heroInner}>
          <View style={styles.heroLeft}>
            <View style={[styles.heroBadge, enter(0)]}>
              <Ionicons name="shield-checkmark" size={14} color={C.teal} />
              <Text style={styles.heroBadgeText}>Photo-verified members · Privacy-first</Text>
            </View>
            <Text style={[styles.heroTitle, enter(120)]}>
              <Text style={{ color: C.brand }}>Find your people.</Text>{"\n"}
              <Text style={{ color: C.teal }}>Find your place.</Text>
            </Text>
            <Text style={[styles.heroSubtitle, enter(240)]}>
              The smarter way to find roommates and rooms that feel like home. Photos and
              numbers stay private until you both say yes.
            </Text>

            <View style={[styles.ctaRow, enter(360)]}>
              {session === "none" ? (
                <>
                  <GradientButton label="Get Started — Free" icon="arrow-forward" onPress={goAuth} full={!isWide} />
                  <GhostButton label="I already have an account" onPress={goAuth} full={!isWide} />
                </>
              ) : (
                <GradientButton label="Open the app" icon="arrow-forward" onPress={openApp} full={!isWide} />
              )}
            </View>

            <View style={[styles.trustRow, enter(480)]}>
              <View style={styles.trustItem}>
                <Ionicons name="lock-closed" size={15} color={C.brand} />
                <Text style={styles.trustText}>Photos hidden until you match</Text>
              </View>
              <View style={styles.trustItem}>
                <Ionicons name="checkmark-circle" size={15} color={C.brand} />
                <Text style={styles.trustText}>Both sides verify</Text>
              </View>
              <View style={styles.trustItem}>
                <Ionicons name="card" size={15} color={C.brand} />
                <Text style={styles.trustText}>Free to join</Text>
              </View>
            </View>
          </View>

          {isDesk && (
            <View style={[styles.heroRight, webOnly({
              animationKeyframes: KF_FADE_IN,
              animationDuration: "1100ms",
              animationDelay: "250ms",
              animationTimingFunction: EASE_OUT,
              animationFillMode: "both",
            })]}>
              <MatchCardVisual />
            </View>
          )}
        </View>
      </LinearGradient>

      {/* ── HOW IT WORKS ── */}
      <View style={styles.how}>
        <SectionHead kicker="HOW IT WORKS" title="Three steps to your next home" />
        <View style={styles.stepsRow}>
          <Step
            n="01"
            icon="options-outline"
            title="Tell us how you live"
            body="Budget, localities, lifestyle — early bird or night owl, tidy or relaxed, pets or not."
            delay={0}
          />
          <Step
            n="02"
            icon="sparkles-outline"
            title="Match on what matters"
            body="Every profile is scored against yours, so you only see people whose life actually fits."
            delay={120}
          />
          <Step
            n="03"
            icon="chatbubbles-outline"
            title="Verify, then chat"
            body="Both of you confirm it's really you with a quick photo. Then chat, meet, and move in."
            delay={240}
          />
        </View>
      </View>

      {/* ── FEATURES ── */}
      <View style={styles.features}>
        <SectionHead kicker="WHY LIVING CIRCLE" title="Built around trust" />
        <View style={styles.featuresGrid}>
          <Feature
            icon="lock-closed-outline"
            title="Privacy first"
            body="Room photos stay hidden until you match, and your phone number is never shared."
            delay={0}
          />
          <Feature
            icon="sparkles-outline"
            title="Smart matching"
            body="Compatibility scored on lifestyle, budget, and preferred localities — not just photos."
            delay={100}
          />
          <Feature
            icon="map-outline"
            title="Neighbourhood map"
            body="See commute times, metro stops, gyms, and essentials around a place after you match."
            delay={200}
          />
          <Feature
            icon="people-outline"
            title="Room pooling"
            body="Team up with others to take a bigger place together, with group chat built in."
            delay={300}
          />
        </View>
      </View>

      {/* ── CTA BAND ── */}
      <LinearGradient
        colors={["#7C3AED", "#14B8A6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.band}
      >
        <Reveal>
          <Text style={styles.bandTitle}>Your people are looking for you too</Text>
          <Text style={styles.bandSub}>Set up your profile in a few minutes. It&apos;s free.</Text>
          <View style={{ alignItems: "center" }}>
            <BandButton onPress={primaryAction} label={session === "none" ? "Create your profile" : "Open the app"} />
          </View>
        </Reveal>
      </LinearGradient>

      {/* ── FOOTER ── */}
      <View style={styles.footer}>
        <View style={styles.footerBrand}>
          <Mark size={24} />
          <Text style={styles.footerBrandText}>Living Circle</Text>
        </View>
        <View style={styles.footerLinks}>
          <HoverLink text="Login" onPress={goAuth} muted />
          <Text style={styles.footerSep}>·</Text>
          <HoverLink text="Terms of Service" onPress={() => router.push("/legal/terms")} muted />
          <Text style={styles.footerSep}>·</Text>
          <HoverLink text="Privacy Policy" onPress={() => router.push("/legal/privacy")} muted />
        </View>
        <Text style={styles.footerCopy}>© 2026 Living Circle</Text>
      </View>
    </ScrollView>
  );
}

function BandButton({ onPress, label }: { onPress: () => void; label: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      // @ts-ignore
      onMouseEnter={() => setHovered(true)}
      // @ts-ignore
      onMouseLeave={() => setHovered(false)}
      style={[
        styles.bandCta,
        webOnly({ transition: `transform 0.25s ${EASE_OUT}, box-shadow 0.25s ease`, cursor: "pointer" }),
        hovered && webOnly({ transform: "translateY(-2px)", boxShadow: "0 14px 30px rgba(0,0,0,0.28)" }),
      ]}
    >
      <Text style={styles.bandCtaText}>{label}</Text>
      <Ionicons name="arrow-forward" size={16} color="#7C3AED" />
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 0 },

  // Nav
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: isWide ? 40 : 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: "rgba(255,255,255,0.85)",
    ...webOnly({ position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(12px)" }),
  },
  navBrand: { flexDirection: "row", alignItems: "center", gap: 10 },
  navBrandText: { color: C.onSurface, fontSize: 17, fontWeight: "800", letterSpacing: -0.3, fontFamily: POPPINS },
  navRight: { flexDirection: "row", alignItems: "center", gap: isWide ? 24 : 14 },
  navCta: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 99,
  },
  navCtaText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700", fontFamily: POPPINS },
  link: {
    color: C.brand,
    fontSize: 14,
    fontWeight: "600",
    fontFamily: POPPINS,
    ...webOnly({ cursor: "pointer", transition: "color 0.2s ease" }),
  },

  // Gradient / ghost buttons
  gradBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 26,
    borderRadius: 14,
  },
  gradBtnText: { color: "#FFFFFF", fontSize: 15.5, fontWeight: "700", fontFamily: POPPINS },
  ghostBtn: {
    backgroundColor: C.bg,
    borderWidth: 1.5,
    borderColor: C.borderStrong,
    paddingVertical: 13,
    paddingHorizontal: 26,
    borderRadius: 14,
    alignItems: "center",
  },
  ghostBtnText: { color: C.onSurface, fontSize: 15.5, fontWeight: "600", fontFamily: POPPINS },

  // Hero
  hero: {
    paddingTop: isWide ? 84 : 48,
    paddingBottom: isWide ? 96 : 56,
    paddingHorizontal: isWide ? 40 : 20,
    overflow: "hidden",
  },
  heroCityBg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  heroScrim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  heroInner: {
    flexDirection: isDesk ? "row" : "column",
    alignItems: "center",
    gap: isDesk ? 48 : 0,
    maxWidth: 1120,
    width: "100%",
    alignSelf: "center",
  },
  heroLeft: {
    flex: isDesk ? 1.05 : undefined,
    alignItems: isDesk ? "flex-start" : "center",
    width: "100%",
  },
  heroRight: { flex: 0.95, alignItems: "center", justifyContent: "center" },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(20,184,166,0.30)",
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 99,
    marginBottom: 26,
  },
  heroBadgeText: { color: C.teal, fontSize: 13, fontWeight: "600", fontFamily: POPPINS },
  heroTitle: {
    fontSize: isDesk ? 50 : isWide ? 42 : 34,
    fontWeight: "800",
    color: C.onSurface,
    textAlign: isDesk ? "left" : "center",
    lineHeight: isDesk ? 60 : isWide ? 52 : 42,
    letterSpacing: isWide ? -1.2 : -0.5,
    marginBottom: 20,
    maxWidth: 680,
    fontFamily: POPPINS,
  },
  heroSubtitle: {
    fontSize: isWide ? 17 : 15.5,
    fontWeight: "400",
    color: C.onSurfaceSecondary,
    textAlign: isDesk ? "left" : "center",
    lineHeight: isWide ? 27 : 24,
    marginBottom: 34,
    maxWidth: 540,
    fontFamily: POPPINS,
  },
  ctaRow: {
    flexDirection: isWide ? "row" : "column",
    gap: isWide ? 14 : 12,
    width: isWide ? undefined : "100%",
    alignItems: "center",
    marginBottom: 34,
  },
  trustRow: {
    flexDirection: isWide ? "row" : "column",
    gap: isWide ? 24 : 10,
    alignItems: "center",
  },
  trustItem: { flexDirection: "row", alignItems: "center", gap: 7 },
  trustText: { color: C.onSurfaceSecondary, fontSize: 13.5, fontWeight: "500", fontFamily: POPPINS },

  // Hero visual
  visualWrap: {
    width: 420,
    height: 470,
    alignItems: "center",
    justifyContent: "center",
  },
  blob: { position: "absolute", borderRadius: 999 },
  blobA: {
    width: 340,
    height: 340,
    backgroundColor: "rgba(124,58,237,0.12)",
    top: 20,
    right: -10,
  },
  blobB: {
    width: 220,
    height: 220,
    backgroundColor: "rgba(59,130,246,0.08)",
    bottom: 10,
    left: 0,
  },
  mockCard: {
    width: 300,
    backgroundColor: C.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "visible",
    ...webOnly({ boxShadow: "0 24px 60px rgba(20,22,58,0.14)" }),
  },
  mockHeader: {
    alignItems: "center",
    paddingVertical: 26,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  mockAvatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.35)",
  },
  mockAvatarText: { color: "#FFFFFF", fontSize: 24, fontWeight: "800", fontFamily: POPPINS },
  mockName: { color: "#FFFFFF", fontSize: 19, fontWeight: "800", fontFamily: POPPINS },
  mockRole: { color: "rgba(255,255,255,0.78)", fontSize: 13, marginTop: 3, fontFamily: POPPINS },
  mockBody: { padding: 18, gap: 14 },
  mockChipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  mockChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.brandTint,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 99,
  },
  mockChipText: { color: C.onBrandTint, fontSize: 12.5, fontWeight: "600", fontFamily: POPPINS },
  mockBudgetRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  mockBudgetLabel: { color: C.onSurfaceTertiary, fontSize: 13, fontWeight: "600", fontFamily: POPPINS },
  mockBudgetValue: { color: C.onSurface, fontSize: 15, fontWeight: "800", fontFamily: POPPINS },
  mockBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: C.surfaceTertiary,
    overflow: "hidden",
  },
  mockBarFill: { width: "78%", height: "100%", borderRadius: 4 },
  matchBadgeWrap: {
    position: "absolute",
    top: -18,
    right: -18,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(124,58,237,0.45)",
  },
  matchBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: C.bg,
  },
  matchBadgePct: { color: "#FFFFFF", fontSize: 18, fontWeight: "900", lineHeight: 20, fontFamily: POPPINS },
  matchBadgeLbl: { color: "rgba(255,255,255,0.85)", fontSize: 10.5, fontWeight: "700", fontFamily: POPPINS },
  floatChip: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    ...webOnly({ boxShadow: "0 10px 26px rgba(20,22,58,0.12)" }),
  },
  floatChipTL: { top: 42, left: 2 },
  floatChipBR: { bottom: 26, right: 2 },
  floatChipBL: { bottom: -8, left: 34 },
  floatChipIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  floatChipText: { color: C.onSurface, fontSize: 13, fontWeight: "600", fontFamily: POPPINS },

  // Sections shared
  sectionKicker: {
    color: C.brand,
    fontSize: 12.5,
    fontWeight: "800",
    letterSpacing: 1.6,
    textAlign: "center",
    marginBottom: 10,
    fontFamily: POPPINS,
  },
  sectionTitle: {
    fontSize: isWide ? 32 : 25,
    fontWeight: "800",
    color: C.onSurface,
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: isWide ? 48 : 32,
    fontFamily: POPPINS,
  },

  // How it works
  how: {
    backgroundColor: C.surfaceSecondary,
    paddingVertical: isWide ? 88 : 48,
    paddingHorizontal: isWide ? 40 : 20,
  },
  stepsRow: {
    flexDirection: isWide ? "row" : "column",
    gap: 22,
    maxWidth: 1040,
    width: "100%",
    alignSelf: "center",
  },
  stepCard: { flex: isWide ? 1 : undefined },
  stepCardInner: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 28,
    height: "100%",
  },
  stepTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  stepIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: C.brandTint,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNum: { fontSize: 15, fontWeight: "900", color: C.onSurfaceTertiary, letterSpacing: 1, fontFamily: POPPINS },
  stepTitle: { fontSize: 17.5, fontWeight: "700", color: C.onSurface, marginBottom: 8, fontFamily: POPPINS },
  stepBody: { fontSize: 14, color: C.onSurfaceSecondary, lineHeight: 21.5, fontFamily: POPPINS },

  // Features
  features: {
    backgroundColor: C.bg,
    paddingVertical: isWide ? 88 : 48,
    paddingHorizontal: isWide ? 40 : 20,
  },
  featuresGrid: {
    flexDirection: isWide ? "row" : "column",
    flexWrap: isWide ? "wrap" : "nowrap",
    gap: 20,
    maxWidth: 1040,
    width: "100%",
    alignSelf: "center",
  },
  featureCard: { flexBasis: isWide ? "47%" : undefined, flexGrow: 1 },
  featureCardInner: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 26,
    height: "100%",
  },
  featureIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: C.brandTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  featureTitle: { fontSize: 16.5, fontWeight: "700", color: C.onSurface, marginBottom: 7, fontFamily: POPPINS },
  featureBody: { fontSize: 14, fontWeight: "400", color: C.onSurfaceSecondary, lineHeight: 21, fontFamily: POPPINS },

  // CTA band
  band: {
    alignItems: "center",
    paddingVertical: isWide ? 76 : 50,
    paddingHorizontal: 20,
  },
  bandTitle: {
    color: "#FFFFFF",
    fontSize: isWide ? 30 : 23,
    fontWeight: "800",
    letterSpacing: -0.4,
    textAlign: "center",
    marginBottom: 10,
    fontFamily: POPPINS,
  },
  bandSub: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 15.5,
    textAlign: "center",
    marginBottom: 28,
    fontFamily: POPPINS,
  },
  bandCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 14,
  },
  bandCtaText: { color: "#7C3AED", fontSize: 16, fontWeight: "800", fontFamily: POPPINS },

  // Footer
  footer: {
    backgroundColor: C.bg,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingVertical: 36,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 14,
  },
  footerBrand: { flexDirection: "row", alignItems: "center", gap: 8 },
  footerBrandText: { color: C.onSurface, fontSize: 15, fontWeight: "700", fontFamily: POPPINS },
  footerLinks: { flexDirection: "row", alignItems: "center", gap: 12 },
  footerSep: { color: C.onSurfaceTertiary, fontSize: 14 },
  footerCopy: { color: C.onSurfaceTertiary, fontSize: 12.5, fontFamily: POPPINS },
});
