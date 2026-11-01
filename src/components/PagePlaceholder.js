import React from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "../navigation";

export default function PagePlaceholder({ number, title, description }) {
  const { goHome } = useNavigation();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>MY SPACE</Text>
          <Text style={styles.kicker}>PERSONAL TOOLKIT</Text>
        </View>
        <Pressable onPress={goHome} style={styles.homeButton} accessibilityRole="button">
          <Text style={styles.homeText}>Home</Text>
        </Pressable>
      </View>
      <View style={styles.content}>
        <Text style={styles.number}>{number}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <Text style={styles.note}>This page is ready for you to build on.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    paddingHorizontal: 22,
    paddingVertical: 17,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5E5",
  },
  brand: { fontSize: 17, fontWeight: "600", letterSpacing: 1.5, color: "#111111" },
  kicker: { marginTop: 5, fontSize: 9, letterSpacing: 1.5, color: "#777777" },
  homeButton: { paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: "#BBBBBB", borderRadius: 999 },
  homeText: { fontSize: 12, color: "#222222" },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 28 },
  number: { fontSize: 12, letterSpacing: 2, color: "#888888" },
  title: { marginTop: 12, fontSize: 36, fontWeight: "500", color: "#171717" },
  description: { marginTop: 10, fontSize: 16, lineHeight: 24, color: "#626262" },
  note: { marginTop: 28, fontSize: 12, color: "#999999" },
});
