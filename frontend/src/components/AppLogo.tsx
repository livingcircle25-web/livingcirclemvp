/**
 * Living Circle logo — renders the official brand mark artwork
 * (ring of two people around a mini skyline, over a gradient house pin).
 */
import { Image, Platform, Text, View, ViewStyle, StyleProp } from "react-native";
import { C } from "@/src/theme/colors";

type Props = { size?: number; style?: StyleProp<ViewStyle>; showText?: boolean };

export function AppLogo({ size = 40, style, showText = false }: Props) {
  return (
    <View style={[{ alignItems: "center" }, style]}>
      <Image
        source={require("@/assets/images/logo-mark.png")}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />

      {showText && (
        <View style={{ alignItems: "center", marginTop: size * 0.12 }}>
          <View style={{ flexDirection: "row" }}>
            <Text style={{ color: "#14163A", fontSize: size * 0.26, fontWeight: "800", letterSpacing: size * 0.02 }}>
              LIVING{" "}
            </Text>
            <Text
              style={
                Platform.OS === "web"
                  ? ({
                      fontSize: size * 0.26,
                      fontWeight: "800",
                      letterSpacing: size * 0.02,
                      backgroundImage: "linear-gradient(90deg, #3B82F6, #14B8A6)",
                      backgroundClip: "text",
                      WebkitBackgroundClip: "text",
                      color: "transparent",
                    } as any)
                  : { color: C.teal, fontSize: size * 0.26, fontWeight: "800", letterSpacing: size * 0.02 }
              }
            >
              CIRCLE
            </Text>
          </View>
          <Text style={{ color: "#6D5DD3", fontSize: size * 0.1, fontWeight: "700", letterSpacing: size * 0.015, marginTop: size * 0.04 }}>
            FIND YOUR PEOPLE. BUILD YOUR PLACE.
          </Text>
        </View>
      )}
    </View>
  );
}
