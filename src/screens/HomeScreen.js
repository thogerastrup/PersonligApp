import React from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "../navigation";

const pages = [
  { key: "clothing", number: "01", title: "Clothing", detail: "Moodboards and outfit ideas", symbol: "✳" },
  { key: "notes", number: "02", title: "Notes", detail: "A space for quick thoughts", symbol: "✎" },
  { key: "habits", number: "03", title: "Habits", detail: "Small routines, kept simple", symbol: "◷" },
  { key: "planning", number: "04", title: "Planning", detail: "Keep your days in view", symbol: "▦" },
];

export default function HomeScreen() {
  const { navigate } = useNavigation();

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topline}>
          <Text style={styles.brand}>MY SPACE</Text>
          <Text style={styles.date}>PERSONAL TOOLKIT</Text>
        </View>

        <View style={styles.intro}>
          <Text style={styles.eyebrow}>A PLACE FOR YOUR EVERYDAY</Text>
          <Text style={styles.title}>Everything,{"\n"}in one place.</Text>
          <Text style={styles.subtitle}>Your own little corner, made for you.</Text>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>YOUR PAGES</Text>
          <Text style={styles.pageCount}>04</Text>
        </View>

        <View style={styles.cards}>
          {pages.map((page) => (
            <Pressable
              key={page.key}
              onPress={() => navigate(page.key)}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              accessibilityRole="button"
              accessibilityLabel={`Open ${page.title}`}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardNumber}>{page.number}</Text>
                <Text style={styles.symbol}>{page.symbol}</Text>
              </View>
              <Text style={styles.cardTitle}>{page.title}</Text>
              <View style={styles.cardBottom}>
                <Text style={styles.cardDetail}>{page.detail}</Text>
                <Text style={styles.arrow}>↗</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Text style={styles.footer}>MADE FOR YOUR DAY, AT YOUR PACE.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f5f5f2" },
  content: { paddingHorizontal: 22, paddingBottom: 34 },
  topline: {
    paddingTop: 10,
    paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#DADAD5",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: { fontSize: 13, fontWeight: "600", letterSpacing: 2, color: "#20201e" },
  date: { fontSize: 9, letterSpacing: 1.4, color: "#878780" },
  intro: { paddingTop: 42, paddingBottom: 34 },
  eyebrow: { fontSize: 9, letterSpacing: 1.8, color: "#878780" },
  title: { marginTop: 14, fontSize: 42, lineHeight: 48, letterSpacing: -1.5, color: "#22221f" },
  subtitle: { marginTop: 13, fontSize: 14, color: "#777770" },
  sectionHeading: {
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#DADAD5",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 10, letterSpacing: 1.6, color: "#696962" },
  pageCount: { fontSize: 10, letterSpacing: 1.2, color: "#999991" },
  cards: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingTop: 4 },
  card: {
    width: "48.3%",
    minHeight: 172,
    marginTop: 12,
    padding: 15,
    backgroundColor: "#fff",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E3E3DE",
    justifyContent: "space-between",
  },
  cardPressed: { opacity: 0.72 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardNumber: { fontSize: 10, letterSpacing: 1, color: "#999991" },
  symbol: { fontSize: 19, color: "#606057" },
  cardTitle: { marginTop: 18, fontSize: 23, letterSpacing: -0.4, color: "#22221f" },
  cardBottom: { marginTop: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  cardDetail: { maxWidth: "82%", fontSize: 10, lineHeight: 15, color: "#85857e" },
  arrow: { fontSize: 15, color: "#55554e" },
  footer: { marginTop: 30, textAlign: "center", fontSize: 8, letterSpacing: 1.7, color: "#A2A29A" },
});
