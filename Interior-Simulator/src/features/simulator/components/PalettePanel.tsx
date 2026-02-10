import "./PalettePanel.css";
import { useState, useMemo } from "react";
import { searchItems, CATEGORY_LABELS } from "../constants";
import type { ItemDefinition, WallSide } from "../types";
import { useSimulatorStore } from "../store/useSimulatorStore";

const wallSides: WallSide[] = ["north", "east", "south", "west"];

const wallLabels: Record<WallSide, string> = {
  north: "북",
  east: "동",
  south: "남",
  west: "서",
};

export function PalettePanel() {
  const [selectedWall, setSelectedWall] = useState<WallSide>("north");
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const setPendingFurniture = useSimulatorStore((state) => state.setPendingFurniture);
  const setPendingDoor = useSimulatorStore((state) => state.setPendingDoor);
  const setPendingWindow = useSimulatorStore((state) => state.setPendingWindow);

  // Search results
  const searchResults = useMemo(() => {
    return searchItems(searchQuery);
  }, [searchQuery]);

  // Group by category
  const groupedResults = useMemo(() => {
    const grouped: Record<string, ItemDefinition[]> = {};
    searchResults.forEach((item) => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });
    return grouped;
  }, [searchResults]);

  // Favorite items
  const favoriteItems = useMemo(() => {
    return searchItems("").filter((item) => favorites.includes(item.id));
  }, [favorites]);

  const handleSelectItem = (item: ItemDefinition) => {
    setPendingFurniture(item.type, {
      name: item.name,
      width: item.width,
      depth: item.depth,
      height: item.height,
    });
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((fav) => fav !== id) : [...prev, id]
    );
  };

  return (
    <div className="palette-panel">
      {/* Header */}
      <div>
        <p className="panel-kicker">팔레트</p>
        <h2 className="panel-title">아이템 검색</h2>
        <p className="panel-subtitle">검색하여 배치할 아이템을 찾으세요</p>
      </div>

      {/* Search Box */}
      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="소파, 냉장고, TV 등..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "0.75rem",
            border: "1px solid #ccc",
            borderRadius: "4px",
            fontSize: "14px",
          }}
        />
      </div>

      {/* Favorites Section */}
      {favoriteItems.length > 0 && (
        <>
          <div style={{ marginBottom: "0.5rem" }}>
            <p className="panel-kicker">즐겨찾기</p>
          </div>
          <div style={{ marginBottom: "1.5rem", maxHeight: "200px", overflowY: "auto" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {favoriteItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0.5rem",
                    border: "1px solid #e0e0e0",
                    borderRadius: "4px",
                    background: "#f9f9f9",
                  }}
                >
                  <button
                    onClick={() => handleSelectItem(item)}
                    style={{
                      flex: 1,
                      textAlign: "left",
                      padding: "0.25rem 0.5rem",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    <div style={{ fontWeight: 500 }}>{item.label}</div>
                    <div style={{ fontSize: "11px", color: "#666" }}>
                      {item.width}×{item.depth}×{item.height}mm
                    </div>
                  </button>
                  <button
                    onClick={() => toggleFavorite(item.id)}
                    style={{
                      padding: "0.25rem 0.5rem",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "16px",
                    }}
                  >
                    ⭐
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Search Results */}
      {searchQuery && (
        <div style={{ marginBottom: "0.5rem" }}>
          <p className="panel-kicker">
            검색 결과 ({searchResults.length}개)
          </p>
        </div>
      )}

      <div style={{ maxHeight: "400px", overflowY: "auto" }}>
        {Object.entries(groupedResults).map(([category, items]) => (
          <div key={category} style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "13px", fontWeight: 600, marginBottom: "0.5rem", color: "#666" }}>
              {CATEGORY_LABELS[category] || category}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0.5rem",
                    border: "1px solid #e0e0e0",
                    borderRadius: "4px",
                    background: "white",
                  }}
                >
                  <button
                    onClick={() => handleSelectItem(item)}
                    style={{
                      flex: 1,
                      textAlign: "left",
                      padding: "0.25rem 0.5rem",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    <div style={{ fontWeight: 500 }}>{item.label}</div>
                    <div style={{ fontSize: "11px", color: "#666" }}>
                      {item.width}×{item.depth}×{item.height}mm
                    </div>
                  </button>
                  <button
                    onClick={() => toggleFavorite(item.id)}
                    style={{
                      padding: "0.25rem 0.5rem",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "16px",
                    }}
                  >
                    {favorites.includes(item.id) ? "⭐" : "☆"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Openings Section */}
      <div style={{ marginTop: "2rem" }}>
        <p className="panel-kicker">개구부</p>
        <h2 className="panel-title">문 & 창문</h2>
        <p className="panel-subtitle">벽을 선택하고 추가하세요</p>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          <span style={{ fontWeight: 500 }}>벽:</span>
        </label>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {wallSides.map((wall) => (
            <button
              key={wall}
              onClick={() => setSelectedWall(wall)}
              style={{
                padding: "0.5rem 0.75rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
                background: selectedWall === wall ? "#4A90E2" : "white",
                color: selectedWall === wall ? "white" : "#333",
                cursor: "pointer",
              }}
            >
              {wallLabels[wall]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          onClick={() => setPendingDoor(selectedWall)}
          style={{
            flex: 1,
            padding: "0.75rem",
            background: "#654321",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          문 선택
        </button>
        <button
          onClick={() => setPendingWindow(selectedWall)}
          style={{
            flex: 1,
            padding: "0.75rem",
            background: "#4682B4",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          창문 선택
        </button>
      </div>
    </div>
  );
}
