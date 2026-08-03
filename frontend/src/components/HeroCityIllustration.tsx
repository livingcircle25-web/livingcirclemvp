/**
 * Decorative isometric-style city background for the landing hero —
 * buildings, a park, a waterfront, and map pins with matched-roommate
 * avatars connected by gradient paths. Purely decorative (pointerEvents none).
 */
import { Fragment } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop, Text as SvgText } from "react-native-svg";
import { AVATAR_PALETTE } from "@/src/theme/colors";

type Props = { style?: StyleProp<ViewStyle> };

const GROUND_Y = 640;

const BUILDINGS = [
  { x: 90, w: 70, h: 140, color: "#8B5CF6" },
  { x: 170, w: 60, h: 190, color: "#3B82F6" },
  { x: 240, w: 55, h: 110, color: "#14B8A6" },
  { x: 780, w: 65, h: 170, color: "#7C3AED" },
  { x: 855, w: 70, h: 230, color: "#3B82F6" },
  { x: 935, w: 60, h: 150, color: "#14B8A6" },
  { x: 1100, w: 55, h: 120, color: "#F5A623" },
  { x: 1170, w: 70, h: 200, color: "#8B5CF6" },
  { x: 1250, w: 60, h: 160, color: "#60A5FA" },
  { x: 1330, w: 55, h: 110, color: "#34D5C4" },
];

const TREES = [
  { cx: 500, cy: 575 }, { cx: 545, cy: 608 }, { cx: 600, cy: 585 }, { cx: 615, cy: 555 },
];

const PINS = [
  { cx: 200, cy: 430, initials: "AR", palette: AVATAR_PALETTE[0] },
  { cx: 890, cy: 350, initials: "MK", palette: AVATAR_PALETTE[1] },
  { cx: 1205, cy: 410, initials: "SI", palette: AVATAR_PALETTE[2] },
  { cx: 130, cy: 480, initials: "PJ", palette: AVATAR_PALETTE[3] },
  { cx: 1280, cy: 430, initials: "RN", palette: AVATAR_PALETTE[6] },
];

export function HeroCityIllustration({ style }: Props) {
  return (
    <View style={style} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 1600 800" preserveAspectRatio="xMidYMid slice">
        <Defs>
          {PINS.map((p, i) => (
            <LinearGradient key={`pg${i}`} id={`heroPinGrad${i}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor={p.palette[0]} />
              <Stop offset="100%" stopColor={p.palette[1]} />
            </LinearGradient>
          ))}
          <LinearGradient id="heroPathGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#7C3AED" />
            <Stop offset="100%" stopColor="#14B8A6" />
          </LinearGradient>
        </Defs>

        {/* Water + sailboat */}
        <Path d="M 0 690 Q 160 630 320 680 T 0 800 Z" fill="rgba(59,130,246,0.14)" />
        <Path d="M 175 660 L 175 605 L 205 655 Z" fill="rgba(59,130,246,0.35)" />
        <Rect x="160" y="658" width="34" height="5" rx="2.5" fill="rgba(20,22,58,0.16)" />

        {/* Park */}
        <Circle cx="560" cy="600" r="110" fill="rgba(20,184,166,0.18)" />
        {TREES.map((t, i) => (
          <Fragment key={`t${i}`}>
            <Rect x={t.cx - 2} y={t.cy + 10} width={4} height={16} fill="rgba(20,22,58,0.18)" />
            <Circle cx={t.cx} cy={t.cy} r={16} fill="rgba(52,199,115,0.5)" />
          </Fragment>
        ))}

        {/* Buildings */}
        {BUILDINGS.map((b, i) => (
          <Fragment key={`b${i}`}>
            <Rect x={b.x + b.w} y={GROUND_Y - b.h + 6} width={8} height={b.h} fill="rgba(20,22,58,0.10)" />
            <Rect x={b.x} y={GROUND_Y - b.h} width={b.w} height={b.h} rx={5} fill={b.color} opacity={0.28} />
            <Rect x={b.x + 8} y={GROUND_Y - b.h + 16} width={b.w - 16} height={10} rx={2} fill={b.color} opacity={0.45} />
          </Fragment>
        ))}

        {/* Connector paths between matched pins */}
        <Path d="M 200 430 Q 500 300 890 350" stroke="url(#heroPathGrad)" strokeWidth={3} strokeDasharray="2 10" fill="none" strokeLinecap="round" opacity={0.45} />
        <Path d="M 890 350 Q 1050 380 1205 410" stroke="url(#heroPathGrad)" strokeWidth={3} strokeDasharray="2 10" fill="none" strokeLinecap="round" opacity={0.45} />

        {/* Pins with avatar initials */}
        {PINS.map((p, i) => (
          <Fragment key={`p${i}`}>
            <Path d={`M ${p.cx - 14} ${p.cy + 22} L ${p.cx} ${p.cy + 50} L ${p.cx + 14} ${p.cy + 22} Z`} fill={p.palette[0]} opacity={0.8} />
            <Circle cx={p.cx} cy={p.cy} r={28} fill="#FFFFFF" opacity={0.85} />
            <Circle cx={p.cx} cy={p.cy} r={24} fill={`url(#heroPinGrad${i})`} opacity={0.82} />
            <SvgText x={p.cx} y={p.cy + 6} fontSize={16} fontWeight="800" fill="#FFFFFF" textAnchor="middle" opacity={0.92}>
              {p.initials}
            </SvgText>
          </Fragment>
        ))}

        {/* Floating icon badges */}
        <Circle cx="110" cy="110" r="24" fill="#FFFFFF" opacity={0.8} />
        <Rect x="98" y="100" width="24" height="16" rx="6" fill="#3B82F6" opacity={0.65} />
        <Path d="M 104 116 L 100 124 L 110 116 Z" fill="#3B82F6" opacity={0.65} />

        <Circle cx="1470" cy="150" r="24" fill="#FFFFFF" opacity={0.8} />
        <Path
          d="M 1470 162 C 1455 150 1458 138 1467 140 C 1470 141 1470 143 1470 143 C 1470 143 1470 141 1473 140 C 1482 138 1485 150 1470 162 Z"
          fill="#7C3AED"
          opacity={0.65}
        />

        <Circle cx="760" cy="70" r="24" fill="#FFFFFF" opacity={0.8} />
        <Circle cx="753" cy="68" r="8" fill="#14B8A6" opacity={0.65} />
        <Circle cx="767" cy="68" r="8" fill="#14B8A6" opacity={0.45} />
      </Svg>
    </View>
  );
}
