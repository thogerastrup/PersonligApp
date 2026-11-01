import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  PanResponder,
  SafeAreaView,
  Alert,
} from "react-native";
import { useNavigation } from "../navigation";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Line } from "react-native-svg";

const STORAGE_KEY = "clothing-project-board";

const PHOTO_WIDTH = 115;
const PHOTO_HEIGHT = 145;
const GRID_SPACING = 24; // grid spacing in "world" units
const MIN_SCALE = 0.25;
const MAX_SCALE = 4;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Semi-transparent grid. It is drawn in screen space from the current
// zoom/pan, so it scales and scrolls together with the photos.
function GridBackground({ width, height, view }) {
  if (!width || !height) return null;

  // Keep lines from getting too dense when zoomed far out.
  let step = GRID_SPACING * view.scale;
  while (step < 12) step *= 2;

  const startX = ((view.x % step) + step) % step;
  const startY = ((view.y % step) + step) % step;

  const vertical = [];
  for (let x = startX; x <= width; x += step) vertical.push(x);

  const horizontal = [];
  for (let y = startY; y <= height; y += step) horizontal.push(y);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        {vertical.map((x, i) => (
          <Line
            key={`v-${i}`}
            x1={x}
            y1={0}
            x2={x}
            y2={height}
            stroke="#000000"
            strokeOpacity={0.12}
            strokeWidth={1}
          />
        ))}
        {horizontal.map((y, i) => (
          <Line
            key={`h-${i}`}
            x1={0}
            y1={y}
            x2={width}
            y2={y}
            stroke="#000000"
            strokeOpacity={0.12}
            strokeWidth={1}
          />
        ))}
      </Svg>
    </View>
  );
}

export default function App() {
  const { goHome } = useNavigation();
  const [page, setPage] = useState("moodboard");

  const [photos, setPhotos] = useState([]);
  const [groups, setGroups] = useState([]);
  const [outfitPhotos, setOutfitPhotos] = useState([]);
  const [outfits, setOutfits] = useState([]);
  const [connections, setConnections] = useState([]);

  const [selectedIds, setSelectedIds] = useState([]);
  const [mode, setMode] = useState("normal");
  const [loaded, setLoaded] = useState(false);

  // Camera: photos live in "world" coordinates; screen = world * scale + offset.
  const [view, setViewState] = useState({ scale: 1, x: 0, y: 0 });
  const viewRef = useRef(view);
  function setView(next) {
    viewRef.current = next;
    setViewState(next);
  }

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    async function loadBoard() {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const data = JSON.parse(saved);
          setPhotos(data.photos || []);
          setGroups(data.groups || []);
          setOutfitPhotos(data.outfitPhotos || []);
          setOutfits(data.outfits || []);
          setConnections(data.connections || []);
        }
      } catch (error) {
        Alert.alert("Error", "Could not load your saved board.");
      } finally {
        setLoaded(true);
      }
    }
    loadBoard();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const data = { photos, groups, outfitPhotos, outfits, connections };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {
      Alert.alert("Error", "Could not save your changes.");
    });
  }, [loaded, photos, groups, outfitPhotos, outfits, connections]);

  const currentPhotos = page === "moodboard" ? photos : outfitPhotos;
  const currentGroups = page === "moodboard" ? groups : outfits;

  async function addPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    const count = currentPhotos.length;
    const v = viewRef.current;

    // Drop the new photo near the top-left of what is currently visible.
    const newPhoto = {
      id: `${Date.now()}-${Math.random()}`,
      uri: asset.uri,
      x: (20 + (count % 3) * 30 - v.x) / v.scale,
      y: (20 + (count % 4) * 25 - v.y) / v.scale,
    };

    if (page === "moodboard") {
      setPhotos((current) => [...current, newPhoto]);
    } else {
      setOutfitPhotos((current) => [...current, newPhoto]);
    }

    setSelectedIds([newPhoto.id]);
    setMode("normal");
  }

  // Updates a photo's world position while it is dragged.
  function movePhoto(id, x, y) {
    const update = (current) =>
      current.map((photo) => (photo.id === id ? { ...photo, x, y } : photo));
    if (page === "moodboard") {
      setPhotos(update);
    } else {
      setOutfitPhotos(update);
    }
  }

  function tapPhoto(id) {
    if (mode === "group") {
      setSelectedIds((current) =>
        current.includes(id)
          ? current.filter((item) => item !== id)
          : [...current, id]
      );
      return;
    }

    if (mode === "connect" && page === "moodboard") {
      if (selectedIds.length === 0) {
        setSelectedIds([id]);
        return;
      }

      const first = selectedIds[0];
      if (first === id) {
        setSelectedIds([]);
        return;
      }

      setConnections((current) => {
        const exists = current.some(
          (line) =>
            (line.from === first && line.to === id) ||
            (line.from === id && line.to === first)
        );
        if (exists) return current;
        return [...current, { from: first, to: id }];
      });

      setSelectedIds([]);
      setMode("normal");
      return;
    }

    setSelectedIds([id]);
  }

  function tapEmpty() {
    if (mode === "normal") setSelectedIds([]);
  }

  // Zoom buttons: zoom around the centre of the canvas.
  function zoomBy(factor) {
    const v = viewRef.current;
    const cx = canvasSize.width / 2;
    const cy = canvasSize.height / 2;
    const newScale = clamp(v.scale * factor, MIN_SCALE, MAX_SCALE);
    const wx = (cx - v.x) / v.scale;
    const wy = (cy - v.y) / v.scale;
    setView({ scale: newScale, x: cx - wx * newScale, y: cy - wy * newScale });
  }

  // Latest values for the gesture handler (it is created only once).
  const live = useRef({});
  live.current = {
    photos: currentPhotos,
    movePhoto,
    tapPhoto,
    tapEmpty,
  };

  // One responder on the canvas handles everything:
  //  - 1 finger on a photo  -> drag that photo
  //  - 1 finger on empty    -> pan the whole board
  //  - 2 fingers            -> pinch to zoom (photos and grid follow)
  const gesture = useRef({}).current;
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: (e) => {
        const n = e.nativeEvent;
        gesture.origin = { x: n.pageX - n.locationX, y: n.pageY - n.locationY };
        gesture.moved = false;
        gesture.pinch = null;
        gesture.single = null;
        gesture.dragId = null;

        const t = n.touches;
        if (t.length === 1) {
          startSingle(t[0].pageX, t[0].pageY, true);
        }
      },

      onPanResponderMove: (e) => {
        const t = e.nativeEvent.touches;
        const o = gesture.origin;
        if (!t || t.length === 0) return;

        if (t.length >= 2) {
          const a = t[0];
          const b = t[1];
          const dist = Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
          const cx = (a.pageX + b.pageX) / 2 - o.x;
          const cy = (a.pageY + b.pageY) / 2 - o.y;
          const v = viewRef.current;

          if (!gesture.pinch) {
            gesture.pinch = {
              dist: Math.max(dist, 1),
              scale: v.scale,
              wx: (cx - v.x) / v.scale,
              wy: (cy - v.y) / v.scale,
            };
            gesture.single = null;
            gesture.dragId = null;
          }

          gesture.moved = true;
          const p = gesture.pinch;
          const newScale = clamp(
            p.scale * (dist / p.dist),
            MIN_SCALE,
            MAX_SCALE
          );
          // Keep the world point under the fingers fixed (zoom + pan together).
          setView({
            scale: newScale,
            x: cx - p.wx * newScale,
            y: cy - p.wy * newScale,
          });
          return;
        }

        // One finger
        const touch = t[0];

        if (gesture.pinch) {
          // Went from two fingers to one: continue as a pan.
          gesture.pinch = null;
          startSingle(touch.pageX, touch.pageY, false);
        }
        if (!gesture.single) startSingle(touch.pageX, touch.pageY, false);

        const s = gesture.single;
        const dx = touch.pageX - s.px;
        const dy = touch.pageY - s.py;

        if (Math.abs(dx) + Math.abs(dy) > 4) gesture.moved = true;
        if (!gesture.moved) return;

        if (gesture.dragId) {
          const scale = viewRef.current.scale;
          live.current.movePhoto(
            gesture.dragId,
            s.photoX + dx / scale,
            s.photoY + dy / scale
          );
        } else {
          setView({ scale: s.scale, x: s.vx + dx, y: s.vy + dy });
        }
      },

      onPanResponderRelease: () => {
        if (!gesture.moved) {
          if (gesture.tapId) live.current.tapPhoto(gesture.tapId);
          else live.current.tapEmpty();
        }
        gesture.pinch = null;
        gesture.single = null;
        gesture.dragId = null;
      },

      onPanResponderTerminate: () => {
        gesture.pinch = null;
        gesture.single = null;
        gesture.dragId = null;
      },
    })
  ).current;

  // Records where a one-finger gesture began. If `hitTest` is true, checks
  // whether the finger landed on a photo (topmost first).
  function startSingle(pageX, pageY, hitTest) {
    const v = viewRef.current;
    const o = gesture.origin;

    if (hitTest) {
      const cx = pageX - o.x;
      const cy = pageY - o.y;
      const list = live.current.photos;
      let hit = null;
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        const sx = p.x * v.scale + v.x;
        const sy = p.y * v.scale + v.y;
        if (
          cx >= sx &&
          cx <= sx + PHOTO_WIDTH * v.scale &&
          cy >= sy &&
          cy <= sy + PHOTO_HEIGHT * v.scale
        ) {
          hit = p;
          break;
        }
      }
      gesture.tapId = hit ? hit.id : null;
      gesture.dragId = hit ? hit.id : null;
      gesture.hit = hit;
    }

    const hit = gesture.hit;
    gesture.single = {
      px: pageX,
      py: pageY,
      vx: v.x,
      vy: v.y,
      scale: v.scale,
      photoX: hit && gesture.dragId ? hit.x : 0,
      photoY: hit && gesture.dragId ? hit.y : 0,
    };
  }

  // Selects a group's photos and moves/zooms the camera so they fill the view.
  function focusGroup(group) {
    const members = currentPhotos.filter((p) => group.photoIds.includes(p.id));
    if (members.length === 0) return;

    const pad = 40;
    const minX = Math.min(...members.map((p) => p.x));
    const minY = Math.min(...members.map((p) => p.y));
    const maxX = Math.max(...members.map((p) => p.x + PHOTO_WIDTH));
    const maxY = Math.max(...members.map((p) => p.y + PHOTO_HEIGHT));

    const { width, height } = canvasSize;
    if (width && height) {
      const fit = Math.min(
        (width - pad * 2) / (maxX - minX),
        (height - pad * 2) / (maxY - minY)
      );
      // Cap at 2x so a single photo isn't blown up too far.
      const scale = clamp(Math.min(fit, 2), MIN_SCALE, MAX_SCALE);
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      setView({
        scale,
        x: width / 2 - centerX * scale,
        y: height / 2 - centerY * scale,
      });
    }

    setSelectedIds(members.map((p) => p.id));
    setMode("normal");
  }

  function createGroup() {
    if (selectedIds.length === 0) {
      Alert.alert("Select photos", "Choose at least one photo first.");
      return;
    }

    Alert.prompt(
      page === "moodboard" ? "Name your group" : "Name your outfit",
      "Give this collection a name.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Create",
          onPress: (enteredName) => {
            const name = enteredName?.trim();
            if (!name) return;

            const newGroup = {
              id: `${Date.now()}`,
              name,
              photoIds: [...selectedIds],
            };

            if (page === "moodboard") {
              setGroups((current) => [...current, newGroup]);
            } else {
              setOutfits((current) => [...current, newGroup]);
            }

            setSelectedIds([]);
            setMode("normal");
          },
        },
      ],
      "plain-text"
    );
  }

    // Removes a group/outfit but keeps all of its photos on the board.
  function deleteGroup(group) {
    Alert.alert(
      page === "moodboard" ? "Delete group?" : "Delete outfit?",
      `"${group.name}" will be removed. Your photos stay on the board.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            if (page === "moodboard") {
              setGroups((current) => current.filter((g) => g.id !== group.id));
            } else {
              setOutfits((current) => current.filter((o) => o.id !== group.id));
            }
            setSelectedIds([]);
          },
        },
      ]
    );
  }

  function deleteSelected() {
    if (selectedIds.length === 0) return;
    const ids = selectedIds;

    if (page === "moodboard") {
      setPhotos((current) => current.filter((p) => !ids.includes(p.id)));
      setConnections((current) =>
        current.filter(
          (line) => !ids.includes(line.from) && !ids.includes(line.to)
        )
      );
      setGroups((current) =>
        current
          .map((g) => ({
            ...g,
            photoIds: g.photoIds.filter((id) => !ids.includes(id)),
          }))
          .filter((g) => g.photoIds.length > 0)
      );
    } else {
      setOutfitPhotos((current) => current.filter((p) => !ids.includes(p.id)));
      setOutfits((current) =>
        current
          .map((o) => ({
            ...o,
            photoIds: o.photoIds.filter((id) => !ids.includes(id)),
          }))
          .filter((o) => o.photoIds.length > 0)
      );
    }

    setSelectedIds([]);
    setMode("normal");
  }

  if (!loaded) {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.loading}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>CLOSET</Text>
          <Text style={styles.subtitle}>YOUR PERSONAL SPACE</Text>
        </View>
        <Pressable onPress={goHome} style={styles.homeButton} accessibilityRole="button">
          <Text style={styles.homeButtonText}>Home</Text>
        </Pressable>
      </View>

      <View style={styles.tabs}>
        <Pressable
          onPress={() => {
            setPage("moodboard");
            setSelectedIds([]);
            setMode("normal");
          }}
          style={[styles.tab, page === "moodboard" && styles.activeTab]}
        >
          <Text style={styles.tabText}>Moodboard</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setPage("outfits");
            setSelectedIds([]);
            setMode("normal");
          }}
          style={[styles.tab, page === "outfits" && styles.activeTab]}
        >
          <Text style={styles.tabText}>Outfits</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.toolbar}
        contentContainerStyle={styles.toolbarContent}
      >
        <Pressable onPress={addPhoto} style={styles.tool}>
          <Text style={styles.toolText}>+ Add photo</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setMode(mode === "group" ? "normal" : "group");
            setSelectedIds([]);
          }}
          style={[styles.tool, mode === "group" && styles.activeTool]}
        >
          <Text style={styles.toolText}>
            {mode === "group" ? "Selecting..." : "Select"}
          </Text>
        </Pressable>

        <Pressable onPress={createGroup} style={styles.tool}>
          <Text style={styles.toolText}>
            {page === "moodboard" ? "Name group" : "Create outfit"}
          </Text>
        </Pressable>

        {page === "moodboard" && (
          <Pressable
            onPress={() => {
              setMode(mode === "connect" ? "normal" : "connect");
              setSelectedIds([]);
            }}
            style={[styles.tool, mode === "connect" && styles.activeTool]}
          >
            <Text style={styles.toolText}>
              {mode === "connect" ? "Choose images" : "Connect"}
            </Text>
          </Pressable>
        )}

        <Pressable onPress={deleteSelected} style={styles.tool}>
          <Text style={styles.toolText}>Delete</Text>
        </Pressable>

        <Pressable onPress={() => zoomBy(1.25)} style={styles.tool}>
          <Text style={styles.toolText}>Zoom +</Text>
        </Pressable>

        <Pressable onPress={() => zoomBy(0.8)} style={styles.tool}>
          <Text style={styles.toolText}>Zoom −</Text>
        </Pressable>

        <Pressable
          onPress={() => setView({ scale: 1, x: 0, y: 0 })}
          style={styles.tool}
        >
          <Text style={styles.toolText}>Reset view</Text>
        </Pressable>
      </ScrollView>

      <Text style={styles.instruction}>
        {mode === "group"
          ? "Select photos, then name your group."
          : mode === "connect"
          ? "Select two photos to connect them."
          : page === "moodboard"
          ? "Drag photos. Pinch to zoom, drag empty space to pan."
          : "Combine screenshots into outfit ideas."}
      </Text>

      {/* The canvas: grid, connection lines and photos all follow `view`. */}
      <View
        style={styles.canvas}
        onLayout={(e) =>
          setCanvasSize({
            width: e.nativeEvent.layout.width,
            height: e.nativeEvent.layout.height,
          })
        }
        {...responder.panHandlers}
      >
        <GridBackground
          width={canvasSize.width}
          height={canvasSize.height}
          view={view}
        />

        {page === "moodboard" && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Svg width={canvasSize.width} height={canvasSize.height}>
              {connections.map((connection, index) => {
                const from = photos.find((p) => p.id === connection.from);
                const to = photos.find((p) => p.id === connection.to);
                if (!from || !to) return null;

                return (
                  <Line
                    key={index}
                    x1={(from.x + PHOTO_WIDTH / 2) * view.scale + view.x}
                    y1={(from.y + PHOTO_HEIGHT / 2) * view.scale + view.y}
                    x2={(to.x + PHOTO_WIDTH / 2) * view.scale + view.x}
                    y2={(to.y + PHOTO_HEIGHT / 2) * view.scale + view.y}
                    stroke="#222222"
                    strokeWidth={1}
                  />
                );
              })}
            </Svg>
          </View>
        )}

        {currentPhotos.map((photo) => (
          <View
            key={photo.id}
            pointerEvents="none"
            style={[
              styles.photo,
              {
                left: photo.x * view.scale + view.x,
                top: photo.y * view.scale + view.y,
                width: PHOTO_WIDTH * view.scale,
                height: PHOTO_HEIGHT * view.scale,
              },
              selectedIds.includes(photo.id) && styles.selectedPhoto,
            ]}
          >
            <Image
              source={{ uri: photo.uri }}
              style={styles.photoImage}
              resizeMode="cover"
            />
          </View>
        ))}

        {currentPhotos.length === 0 && (
          <View style={styles.emptyState} pointerEvents="none">
            <Text style={styles.emptyTitle}>
              {page === "moodboard" ? "An open canvas." : "New outfit ideas."}
            </Text>
            <Text style={styles.emptyText}>Add photos to get started.</Text>
          </View>
        )}
      </View>

      {currentGroups.length > 0 && (
        <View style={styles.groupSection}>
          <Text style={styles.groupHeading}>
            {page === "moodboard" ? "GROUPS" : "OUTFITS"}
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {currentGroups.map((group) => (
              <Pressable
                key={group.id}
                style={styles.groupChip}
                onPress={() => focusGroup(group)}
                onLongPress={() => deleteGroup(group)}
              >
                <Text style={styles.groupChipText}>{group.name}</Text>
                <Text style={styles.groupCount}>{group.photoIds.length}</Text>
                <Pressable onPress={() => deleteGroup(group)} hitSlop={8}>
                  <Text style={styles.groupDelete}>✕</Text>
                </Pressable>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loading: {
    padding: 24,
    fontFamily: "Helvetica Neue",
    color: "#222222",
  },
  header: {
    paddingHorizontal: 22,
    paddingVertical: 17,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5E5",
  },
  brand: {
    fontFamily: "Helvetica Neue",
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: 1.5,
    color: "#111111",
  },
  subtitle: {
    marginTop: 5,
    fontFamily: "Helvetica Neue",
    fontSize: 9,
    letterSpacing: 1.5,
    color: "#777777",
  },
  pageNumber: {
    fontFamily: "Helvetica Neue",
    fontSize: 12,
    color: "#777777",
  },
  homeButton: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#BBBBBB",
    borderRadius: 999,
  },
  homeButtonText: {
    fontFamily: "Helvetica Neue",
    fontSize: 12,
    color: "#222222",
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 22,
    gap: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5E5",
  },
  tab: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#111111",
  },
  tabText: {
    fontFamily: "Helvetica Neue",
    fontSize: 13,
    color: "#222222",
  },
  toolbar: {
    flexGrow: 0,
    maxHeight: 52,
  },
  toolbarContent: {
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 7,
  },
  tool: {
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  toolText: {
    fontFamily: "Helvetica Neue",
    fontSize: 12,
    color: "#222222",
  },
  activeTool: {
    backgroundColor: "#ffffff",
  },
  instruction: {
    paddingHorizontal: 22,
    paddingVertical: 9,
    fontFamily: "Helvetica Neue",
    fontSize: 11,
    color: "#888888",
  },
  canvas: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  photo: {
    position: "absolute",
    backgroundColor: "#F4F4F4",
    borderWidth: 1,
    borderColor: "transparent",
  },
  selectedPhoto: {
    borderColor: "#111111",
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  emptyState: {
    position: "absolute",
    top: "42%",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  emptyTitle: {
    fontFamily: "Helvetica Neue",
    fontSize: 20,
    color: "#222222",
  },
  emptyText: {
    marginTop: 8,
    fontFamily: "Helvetica Neue",
    fontSize: 12,
    color: "#888888",
  },
  groupSection: {
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E5E5",
  },
  groupHeading: {
    paddingHorizontal: 22,
    marginBottom: 10,
    fontFamily: "Helvetica Neue",
    fontSize: 9,
    letterSpacing: 1.5,
    color: "#777777",
  },
  groupChip: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  groupChipText: {
    fontFamily: "Helvetica Neue",
    fontSize: 11,
    color: "#222222",
  },
  groupCount: {
    fontFamily: "Helvetica Neue",
    fontSize: 10,
    color: "#888888",
  },
    groupDelete: {
    fontFamily: "Helvetica Neue",
    fontSize: 11,
    color: "#888888",
  },
});
