// Contenu Paramètres pour le GlobalBottomSheet (sous-titres, audio, qualité, aspect)
import { useBottomSheet } from "@/components/BottomSheet/BottomSheetContext";
import {
  getAudioStreams,
  getSubtitleStreams,
  QUALITY_PROFILES,
  type MediaSource,
  type QualityProfile,
} from "@/src/api/queries/usePlaybackInfo";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

const ASPECT_RATIOS = [
  { label: "Auto", value: "contain" as const },
  { label: "Remplir", value: "cover" as const },
  { label: "Étirer", value: "fill" as const },
] as const;

type AspectRatioValue = (typeof ASPECT_RATIOS)[number]["value"];
type Panel = "main" | "subtitles" | "audio" | "quality" | "aspectRatio";

interface ISettingsSheetProps {
  mediaSource: MediaSource | null;
  selectedSubIndex: number;
  onSelectSubtitle: (index: number) => void;
  selectedAudioIndex: number;
  onSelectAudio: (index: number) => void;
  selectedQuality: QualityProfile;
  onSelectQuality: (q: QualityProfile) => void;
  selectedAspect: AspectRatioValue;
  onSelectAspect: (a: AspectRatioValue) => void;
}

export function SettingsSheet({
  mediaSource,
  selectedSubIndex,
  onSelectSubtitle,
  selectedAudioIndex,
  onSelectAudio,
  selectedQuality,
  onSelectQuality,
  selectedAspect,
  onSelectAspect,
}: ISettingsSheetProps) {
  const { closeSheet } = useBottomSheet();
  const [panel, setPanel] = useState<Panel>("main");

  const subtitles = mediaSource ? getSubtitleStreams(mediaSource) : [];
  const audioTracks = mediaSource ? getAudioStreams(mediaSource) : [];

  if (panel === "subtitles") {
    return (
      <View style={s.content}>
        <Pressable style={s.backRow} onPress={() => setPanel("main")}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
          <Text style={s.title}>Sous-titres</Text>
        </Pressable>
        <Pressable
          style={[s.optionItem, selectedSubIndex === -1 && s.optionSelected]}
          onPress={() => {
            onSelectSubtitle(-1);
            closeSheet();
          }}
        >
          <Text style={s.optionText}>Désactivés</Text>
          {selectedSubIndex === -1 && (
            <Ionicons name="checkmark" size={18} color="#E50914" />
          )}
        </Pressable>
        <FlatList
          data={subtitles}
          keyExtractor={(item) => String(item.Index)}
          renderItem={({ item }) => (
            <Pressable
              style={[
                s.optionItem,
                selectedSubIndex === item.Index && s.optionSelected,
              ]}
              onPress={() => {
                onSelectSubtitle(item.Index);
                closeSheet();
              }}
            >
              <Text style={s.optionText}>
                {item.DisplayTitle ?? item.Language ?? `Piste ${item.Index}`}
              </Text>
              <Text style={s.optionSub}>
                {item.Codec?.toUpperCase()}
                {item.IsForced ? " · Forcé" : ""}
              </Text>
              {selectedSubIndex === item.Index && (
                <Ionicons name="checkmark" size={18} color="#E50914" />
              )}
            </Pressable>
          )}
        />
      </View>
    );
  }

  if (panel === "audio") {
    return (
      <View style={s.content}>
        <Pressable style={s.backRow} onPress={() => setPanel("main")}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
          <Text style={s.title}>Audio</Text>
        </Pressable>
        <FlatList
          data={audioTracks}
          keyExtractor={(item) => String(item.Index)}
          renderItem={({ item }) => (
            <Pressable
              style={[
                s.optionItem,
                selectedAudioIndex === item.Index && s.optionSelected,
              ]}
              onPress={() => {
                onSelectAudio(item.Index);
                closeSheet();
              }}
            >
              <Text style={s.optionText}>
                {item.DisplayTitle ?? item.Language ?? `Piste ${item.Index}`}
              </Text>
              <Text style={s.optionSub}>
                {item.Codec?.toUpperCase()} · {item.Channels}ch
              </Text>
              {selectedAudioIndex === item.Index && (
                <Ionicons name="checkmark" size={18} color="#E50914" />
              )}
            </Pressable>
          )}
        />
      </View>
    );
  }

  if (panel === "quality") {
    return (
      <View style={s.content}>
        <Pressable style={s.backRow} onPress={() => setPanel("main")}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
          <Text style={s.title}>Qualité</Text>
        </Pressable>
        <FlatList
          data={QUALITY_PROFILES}
          keyExtractor={(item) => item.label}
          renderItem={({ item }) => (
            <Pressable
              style={[
                s.optionItem,
                selectedQuality.label === item.label && s.optionSelected,
              ]}
              onPress={() => {
                onSelectQuality(item);
                closeSheet();
              }}
            >
              <Text style={s.optionText}>{item.label}</Text>
              {selectedQuality.label === item.label && (
                <Ionicons name="checkmark" size={18} color="#E50914" />
              )}
            </Pressable>
          )}
        />
      </View>
    );
  }

  if (panel === "aspectRatio") {
    return (
      <View style={s.content}>
        <Pressable style={s.backRow} onPress={() => setPanel("main")}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
          <Text style={s.title}>Format d'image</Text>
        </Pressable>
        {ASPECT_RATIOS.map((item) => (
          <Pressable
            key={item.value}
            style={[
              s.optionItem,
              selectedAspect === item.value && s.optionSelected,
            ]}
            onPress={() => {
              onSelectAspect(item.value);
              closeSheet();
            }}
          >
            <Text style={s.optionText}>{item.label}</Text>
            {selectedAspect === item.value && (
              <Ionicons name="checkmark" size={18} color="#E50914" />
            )}
          </Pressable>
        ))}
      </View>
    );
  }

  // Menu principal
  return (
    <View style={s.content}>
      <Text style={s.title}>Paramètres</Text>
      {!mediaSource && (
        <Text style={s.menuValue}>Chargement des pistes...</Text>
      )}
      <Pressable style={s.menuItem} onPress={() => setPanel("subtitles")}>
        <Ionicons name="text-outline" size={20} color="#fff" />
        <Text style={s.menuText}>Sous-titres</Text>
        <Text style={s.menuValue}>
          {selectedSubIndex === -1
            ? "Désactivés"
            : (subtitles.find((st) => st.Index === selectedSubIndex)
                ?.DisplayTitle ?? "?")}
        </Text>
        <Ionicons name="chevron-forward" size={18} color="#888" />
      </Pressable>
      <Pressable style={s.menuItem} onPress={() => setPanel("audio")}>
        <Ionicons name="volume-high-outline" size={20} color="#fff" />
        <Text style={s.menuText}>Audio</Text>
        <Text style={s.menuValue}>
          {audioTracks.find((a) => a.Index === selectedAudioIndex)
            ?.DisplayTitle ?? "?"}
        </Text>
        <Ionicons name="chevron-forward" size={18} color="#888" />
      </Pressable>
      <Pressable style={s.menuItem} onPress={() => setPanel("quality")}>
        <Ionicons name="speedometer-outline" size={20} color="#fff" />
        <Text style={s.menuText}>Qualité</Text>
        <Text style={s.menuValue}>{selectedQuality.label}</Text>
        <Ionicons name="chevron-forward" size={18} color="#888" />
      </Pressable>
      <Pressable style={s.menuItem} onPress={() => setPanel("aspectRatio")}>
        <Ionicons name="resize-outline" size={20} color="#fff" />
        <Text style={s.menuText}>Format d'image</Text>
        <Text style={s.menuValue}>
          {ASPECT_RATIOS.find((a) => a.value === selectedAspect)?.label}
        </Text>
        <Ionicons name="chevron-forward" size={18} color="#888" />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 4,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.1)",
    gap: 12,
  },
  menuText: {
    color: "#fff",
    fontSize: 15,
    flex: 1,
  },
  menuValue: {
    color: "#999",
    fontSize: 13,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 8,
  },
  optionSelected: {
    backgroundColor: "rgba(229,9,20,0.15)",
  },
  optionText: {
    color: "#fff",
    fontSize: 14,
    flex: 1,
  },
  optionSub: {
    color: "#888",
    fontSize: 11,
  },
});
