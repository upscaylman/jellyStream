import { useBottomSheet } from "@/components/BottomSheet/BottomSheetContext";
import {
  useAddToCollection,
  useAllCollections,
  useCreateCollection,
  useDeleteItem,
  useIsFavorite,
  useIsLiked,
  useIsPlayed,
  useItemDetail,
  useRefreshMetadata,
  useToggleFavorite,
  useToggleLike,
  useTogglePlayed,
} from "@/src/api/queries/useMediaQueries";
import { Ionicons } from "@expo/vector-icons";
import { MetadataRefreshMode } from "@jellyfin/sdk/lib/generated-client/models";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

interface IManageSheetProps {
  itemId: string;
  itemName: string;
  itemType?: string;
}

type SheetView = "main" | "collection" | "refresh" | "info";

export function ManageSheet({ itemId, itemName, itemType }: IManageSheetProps) {
  const { closeSheet } = useBottomSheet();
  const router = useRouter();
  const [view, setView] = useState<SheetView>("main");
  const [newCollectionName, setNewCollectionName] = useState("");

  // Détail de l'item (pour infos média + progression)
  const { data: item } = useItemDetail(itemId);

  // Hooks d'état
  const { data: isFavorite } = useIsFavorite(itemId);
  const { data: isLiked } = useIsLiked(itemId);
  const { data: isPlayed } = useIsPlayed(itemId);

  // Progression de lecture
  const playbackTicks = item?.UserData?.PlaybackPositionTicks ?? 0;
  const totalTicks = item?.RunTimeTicks ?? 0;
  const hasProgress = playbackTicks > 0 && totalTicks > 0;
  const progressPercent = hasProgress
    ? Math.min((playbackTicks / totalTicks) * 100, 100)
    : 0;

  const formatTicks = (ticks: number) => {
    const totalMin = Math.round(ticks / 600_000_000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}min`;
  };

  const handlePlay = () => {
    closeSheet();
    router.push({
      pathname: "/player",
      params: { itemId },
    });
  };

  const handlePlayFromStart = () => {
    closeSheet();
    router.push({
      pathname: "/player",
      params: { itemId, startFrom: "0" },
    });
  };

  // Mutations
  const toggleFavorite = useToggleFavorite();
  const toggleLike = useToggleLike();
  const togglePlayed = useTogglePlayed();
  const refreshMetadata = useRefreshMetadata();
  const deleteItem = useDeleteItem();
  const addToCollection = useAddToCollection();
  const createCollection = useCreateCollection();

  // Collections existantes
  const { data: collections, isLoading: isLoadingCollections } =
    useAllCollections();

  const confirmDelete = () => {
    if (Platform.OS === "web") {
      if (window.confirm(`Supprimer « ${itemName} » du serveur ?`)) {
        deleteItem.mutate(
          { itemId },
          {
            onSuccess: () => {
              closeSheet();
              router.back();
            },
          },
        );
      }
    } else {
      Alert.alert("Supprimer", `Supprimer « ${itemName} » du serveur ?`, [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            deleteItem.mutate(
              { itemId },
              {
                onSuccess: () => {
                  closeSheet();
                  router.back();
                },
              },
            );
          },
        },
      ]);
    }
  };

  const handleRefresh = (mode: MetadataRefreshMode, replace: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refreshMetadata.mutate(
      {
        itemId,
        mode,
        replaceAllMetadata: replace,
        replaceAllImages: replace,
      },
      {
        onSuccess: () => setView("main"),
      },
    );
  };

  const handleAddToCollection = (collectionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addToCollection.mutate(
      { collectionId, itemIds: [itemId] },
      {
        onSuccess: () => setView("main"),
      },
    );
  };

  const handleCreateCollection = () => {
    const name = newCollectionName.trim();
    if (!name) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createCollection.mutate(
      { name, itemIds: [itemId] },
      {
        onSuccess: () => {
          setNewCollectionName("");
          setView("main");
        },
      },
    );
  };

  // ─── Vue : Informations du média ───
  if (view === "info" && item) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <Pressable onPress={() => setView("main")} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <Text style={s.headerTitle}>Informations</Text>
        </View>
        <ScrollView style={s.mediaInfoScroll}>
          {item.ProductionYear && (
            <MediaInfoRow label="Année" value={String(item.ProductionYear)} />
          )}
          {item.OfficialRating && (
            <MediaInfoRow label="Classification" value={item.OfficialRating} />
          )}
          {item.CommunityRating != null && (
            <MediaInfoRow
              label="Note"
              value={`${item.CommunityRating.toFixed(1)} / 10`}
            />
          )}
          {totalTicks > 0 && (
            <MediaInfoRow label="Durée" value={formatTicks(totalTicks)} />
          )}
          {item.Genres && item.Genres.length > 0 && (
            <MediaInfoRow label="Genres" value={item.Genres.join(", ")} />
          )}
          {item.Studios && item.Studios.length > 0 && (
            <MediaInfoRow
              label="Studio"
              value={item.Studios.map((st) => st.Name).join(", ")}
            />
          )}
          {item.MediaSources?.[0] && (
            <>
              {item.MediaSources[0].Container && (
                <MediaInfoRow
                  label="Format"
                  value={item.MediaSources[0].Container.toUpperCase()}
                />
              )}
              {item.MediaSources[0].MediaStreams?.find(
                (ms) => ms.Type === "Video",
              ) && (
                <MediaInfoRow
                  label="Vidéo"
                  value={(() => {
                    const vs = item.MediaSources![0].MediaStreams!.find(
                      (ms) => ms.Type === "Video",
                    )!;
                    const parts: string[] = [];
                    if (vs.Codec) parts.push(vs.Codec.toUpperCase());
                    if (vs.Width && vs.Height)
                      parts.push(`${vs.Width}×${vs.Height}`);
                    if (vs.BitRate)
                      parts.push(`${(vs.BitRate / 1_000_000).toFixed(1)} Mbps`);
                    return parts.join(" · ");
                  })()}
                />
              )}
              {item.MediaSources[0].MediaStreams?.find(
                (ms) => ms.Type === "Audio",
              ) && (
                <MediaInfoRow
                  label="Audio"
                  value={(() => {
                    const as_ = item.MediaSources![0].MediaStreams!.find(
                      (ms) => ms.Type === "Audio",
                    )!;
                    const parts: string[] = [];
                    if (as_.Codec) parts.push(as_.Codec.toUpperCase());
                    if (as_.ChannelLayout) parts.push(as_.ChannelLayout);
                    if (as_.Language) parts.push(as_.Language.toUpperCase());
                    return parts.join(" · ");
                  })()}
                />
              )}
              {item.MediaSources[0].Size && (
                <MediaInfoRow
                  label="Taille"
                  value={`${(item.MediaSources[0].Size / 1_073_741_824).toFixed(2)} Go`}
                />
              )}
              {item.MediaSources[0].Path && (
                <MediaInfoRow
                  label="Fichier"
                  value={item.MediaSources[0].Path.split(/[\\/]/).pop() ?? ""}
                />
              )}
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  // ─── Vue : Choix du mode de rafraîchissement ───
  if (view === "refresh") {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <Pressable onPress={() => setView("main")} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <Text style={s.headerTitle}>Rafraîchir les métadonnées</Text>
        </View>
        <ActionRow
          icon="scan-outline"
          label="Scan rapide"
          sublabel="Recherche les métadonnées manquantes"
          onPress={() => handleRefresh(MetadataRefreshMode.Default, false)}
          loading={refreshMetadata.isPending}
        />
        <ActionRow
          icon="refresh-outline"
          label="Rafraîchissement complet"
          sublabel="Remplace toutes les métadonnées et images"
          onPress={() => handleRefresh(MetadataRefreshMode.FullRefresh, true)}
          loading={refreshMetadata.isPending}
        />
      </View>
    );
  }

  // ─── Vue : Ajout à une collection ───
  if (view === "collection") {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <Pressable onPress={() => setView("main")} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <Text style={s.headerTitle}>Ajouter à une collection</Text>
        </View>

        {/* Créer une nouvelle collection */}
        <View style={s.newCollectionRow}>
          <TextInput
            style={s.newCollectionInput}
            placeholder="Nouvelle collection..."
            placeholderTextColor="#666"
            value={newCollectionName}
            onChangeText={setNewCollectionName}
            onSubmitEditing={handleCreateCollection}
          />
          <Pressable
            style={[
              s.newCollectionBtn,
              !newCollectionName.trim() && s.newCollectionBtnDisabled,
            ]}
            onPress={handleCreateCollection}
            disabled={!newCollectionName.trim() || createCollection.isPending}
          >
            {createCollection.isPending ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Ionicons name="add" size={20} color="#000" />
            )}
          </Pressable>
        </View>

        {/* Collections existantes */}
        <ScrollView style={s.collectionList}>
          {isLoadingCollections ? (
            <ActivityIndicator
              size="small"
              color="#E50914"
              style={{ marginTop: 20 }}
            />
          ) : (
            (collections ?? []).map((col) => (
              <Pressable
                key={col.Id}
                style={s.collectionItem}
                onPress={() => handleAddToCollection(col.Id!)}
                disabled={addToCollection.isPending}
              >
                <Ionicons name="folder-outline" size={20} color="#fff" />
                <Text style={s.collectionItemText} numberOfLines={1}>
                  {col.Name}
                </Text>
                {addToCollection.isPending && (
                  <ActivityIndicator size="small" color="#E50914" />
                )}
              </Pressable>
            ))
          )}
          {!isLoadingCollections && (collections ?? []).length === 0 && (
            <Text style={s.emptyText}>Aucune collection existante</Text>
          )}
        </ScrollView>
      </View>
    );
  }

  // ─── Vue principale ───
  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Gérer</Text>
        <Pressable onPress={closeSheet} hitSlop={12}>
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>
      </View>

      <Text style={s.itemName} numberOfLines={1}>
        {itemName}
      </Text>

      {/* Actions rapides */}
      <View style={s.quickActions}>
        <QuickActionButton
          icon="play"
          label={hasProgress ? "Reprendre" : "Lecture"}
          active={false}
          onPress={handlePlay}
        />
        {hasProgress && (
          <QuickActionButton
            icon="refresh-outline"
            label="Depuis le début"
            active={false}
            onPress={handlePlayFromStart}
          />
        )}
        <QuickActionButton
          icon={isFavorite ? "checkmark" : "add"}
          label="Ma liste"
          active={!!isFavorite}
          onPress={() =>
            toggleFavorite.mutate({
              itemId,
              isFavorite: isFavorite ?? false,
            })
          }
        />
        <QuickActionButton
          icon={isLiked ? "heart" : "heart-outline"}
          label="J'aime"
          active={!!isLiked}
          onPress={() => toggleLike.mutate({ itemId, isLiked: !!isLiked })}
        />
        <QuickActionButton
          icon={isPlayed ? "eye" : "eye-outline"}
          label="Vue"
          active={!!isPlayed}
          onPress={() => togglePlayed.mutate({ itemId, isPlayed: !!isPlayed })}
        />
      </View>

      {/* Séparateur */}
      <View style={s.separator} />

      {/* Actions admin */}
      <ActionRow
        icon="folder-open-outline"
        label="Ajouter à une collection"
        onPress={() => setView("collection")}
      />
      <ActionRow
        icon="refresh-outline"
        label="Rafraîchir les métadonnées"
        onPress={() => setView("refresh")}
      />
      {itemType === "Movie" && (
        <ActionRow
          icon="git-merge-outline"
          label="Fusionner les versions"
          sublabel="Nécessite une sélection multiple"
          disabled
        />
      )}
      <ActionRow
        icon="information-circle-outline"
        label="Informations du média"
        onPress={() => setView("info")}
      />
      <ActionRow
        icon="trash-outline"
        label="Supprimer"
        danger
        onPress={confirmDelete}
        loading={deleteItem.isPending}
      />
    </View>
  );
}

// ─── Sous-composants ───

function QuickActionButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={s.quickActionBtn}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
    >
      <View style={[s.quickActionIcon, active && s.quickActionIconActive]}>
        <Ionicons name={icon} size={22} color={active ? "#000" : "#fff"} />
      </View>
      <Text style={[s.quickActionLabel, active && s.quickActionLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ActionRow({
  icon,
  label,
  sublabel,
  onPress,
  danger,
  loading,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  danger?: boolean;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[s.actionRow, disabled && s.actionRowDisabled]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      <Ionicons
        name={icon}
        size={22}
        color={danger ? "#E50914" : disabled ? "#555" : "#fff"}
      />
      <View style={s.actionRowText}>
        <Text
          style={[
            s.actionRowLabel,
            danger && s.actionRowLabelDanger,
            disabled && s.actionRowLabelDisabled,
          ]}
        >
          {label}
        </Text>
        {sublabel ? <Text style={s.actionRowSublabel}>{sublabel}</Text> : null}
      </View>
      {loading ? (
        <ActivityIndicator size="small" color="#E50914" />
      ) : (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={disabled ? "#333" : "#555"}
        />
      )}
    </Pressable>
  );
}

function MediaInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.mediaInfoRow}>
      <Text style={s.mediaInfoLabel}>{label}</Text>
      <Text style={s.mediaInfoValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    paddingBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
    marginLeft: 8,
  },
  itemName: {
    color: "#999",
    fontSize: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexWrap: "wrap",
  },
  quickActionBtn: {
    alignItems: "center",
    gap: 6,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  quickActionIconActive: {
    backgroundColor: "#fff",
  },
  quickActionLabel: {
    color: "#ccc",
    fontSize: 11,
  },
  quickActionLabelActive: {
    color: "#fff",
    fontWeight: "600",
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginHorizontal: 16,
    marginVertical: 8,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  actionRowDisabled: {
    opacity: 0.4,
  },
  actionRowText: {
    flex: 1,
  },
  actionRowLabel: {
    color: "#fff",
    fontSize: 15,
  },
  actionRowLabelDanger: {
    color: "#E50914",
  },
  actionRowLabelDisabled: {
    color: "#555",
  },
  actionRowSublabel: {
    color: "#666",
    fontSize: 12,
    marginTop: 2,
  },
  // Collection view
  newCollectionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  newCollectionInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 14,
  },
  newCollectionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  newCollectionBtnDisabled: {
    opacity: 0.3,
  },
  collectionList: {
    maxHeight: 250,
    paddingHorizontal: 16,
  },
  collectionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  collectionItemText: {
    color: "#fff",
    fontSize: 14,
    flex: 1,
  },
  emptyText: {
    color: "#666",
    fontSize: 13,
    textAlign: "center",
    marginTop: 20,
  },
  // Media info
  mediaInfoScroll: {
    maxHeight: 350,
    paddingHorizontal: 16,
  },
  mediaInfoRow: {
    flexDirection: "row",
    paddingVertical: 5,
  },
  mediaInfoLabel: {
    color: "#666",
    fontSize: 13,
    width: 100,
  },
  mediaInfoValue: {
    color: "#ccc",
    fontSize: 13,
    flex: 1,
  },
});
