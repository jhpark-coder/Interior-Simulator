import "./PalettePanel.css";
import { useState, useMemo, useEffect } from "react";
import { searchItems, CATEGORY_LABELS } from "../constants";
import type { CustomItemDefinition, FurnitureType, ItemCategory, ItemDefinition, WallSide } from "../types";
import { useSimulatorStore } from "../store/useSimulatorStore";
import { FURNITURE_CATALOG } from "../constants";

const CUSTOM_ITEMS_KEY = "interior-simulator-custom-items";

const wallSides: WallSide[] = ["north", "east", "south", "west"];

const wallLabels: Record<WallSide, string> = {
  north: "북",
  east: "동",
  south: "남",
  west: "서",
};

const categoryOptions: { value: ItemCategory; label: string }[] = [
  { value: "furniture", label: "가구" },
  { value: "appliance", label: "가전제품" },
  { value: "electronics", label: "전자제품" },
  { value: "fixture", label: "설비" },
];

const CATEGORY_TYPES: Record<ItemCategory, { type: FurnitureType; label: string }[]> = {
  furniture: [
    { type: "bed", label: "침대" },
    { type: "desk", label: "책상" },
    { type: "chair", label: "의자" },
    { type: "closet", label: "수납장" },
    { type: "sofa", label: "소파" },
    { type: "table", label: "테이블" },
  ],
  appliance: [
    { type: "refrigerator", label: "냉장고" },
    { type: "washing-machine", label: "세탁기" },
    { type: "dryer", label: "건조기" },
    { type: "dishwasher", label: "식기세척기" },
    { type: "oven", label: "오븐" },
    { type: "microwave", label: "전자레인지" },
  ],
  electronics: [
    { type: "tv", label: "TV" },
    { type: "air-conditioner", label: "에어컨" },
    { type: "air-purifier", label: "공기청정기" },
    { type: "humidifier", label: "가습기" },
  ],
  fixture: [
    { type: "sink", label: "싱크대" },
    { type: "toilet", label: "변기" },
    { type: "bathtub", label: "욕조" },
    { type: "shower", label: "샤워부스" },
  ],
};

function loadCustomItems(): CustomItemDefinition[] {
  try {
    const raw = localStorage.getItem(CUSTOM_ITEMS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
}

function saveCustomItems(items: CustomItemDefinition[]) {
  localStorage.setItem(CUSTOM_ITEMS_KEY, JSON.stringify(items));
}

export function PalettePanel() {
  const [selectedWall, setSelectedWall] = useState<WallSide>("north");
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [customItems, setCustomItems] = useState<CustomItemDefinition[]>(loadCustomItems);
  const [showCustomForm, setShowCustomForm] = useState(false);

  // Custom form state
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<ItemCategory>("furniture");
  const [formType, setFormType] = useState<FurnitureType>("bed");
  const [formWidth, setFormWidth] = useState("");
  const [formDepth, setFormDepth] = useState("");
  const [formHeight, setFormHeight] = useState("");
  const [formInnerWidth, setFormInnerWidth] = useState("");
  const [formInnerDepth, setFormInnerDepth] = useState("");
  const [formInnerHeight, setFormInnerHeight] = useState("");

  const setPendingFurniture = useSimulatorStore((state) => state.setPendingFurniture);
  const setPendingDoor = useSimulatorStore((state) => state.setPendingDoor);
  const setPendingWindow = useSimulatorStore((state) => state.setPendingWindow);

  // Persist custom items
  useEffect(() => {
    saveCustomItems(customItems);
  }, [customItems]);

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

  const handleSelectCustomItem = (item: CustomItemDefinition) => {
    setPendingFurniture(item.type, {
      name: item.name,
      category: item.category,
      width: item.width,
      depth: item.depth,
      height: item.height,
    });
  };

  const handleDeleteCustomItem = (id: string) => {
    setCustomItems((prev) => prev.filter((item) => item.id !== id));
  };

  const resetForm = () => {
    setFormName("");
    setFormCategory("furniture");
    setFormType("bed");
    setFormWidth("");
    setFormDepth("");
    setFormHeight("");
    setFormInnerWidth("");
    setFormInnerDepth("");
    setFormInnerHeight("");
  };

  const handleSaveCustomItem = () => {
    const width = Number(formWidth);
    const depth = Number(formDepth);
    const height = Number(formHeight);

    if (!formName.trim() || !width || !depth || !height) return;

    const newItem: CustomItemDefinition = {
      id: `custom_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      name: formName.trim(),
      category: formCategory,
      type: formType,
      width,
      depth,
      height,
    };

    const innerW = Number(formInnerWidth);
    const innerD = Number(formInnerDepth);
    const innerH = Number(formInnerHeight);
    if (innerW > 0) newItem.innerWidth = innerW;
    if (innerD > 0) newItem.innerDepth = innerD;
    if (innerH > 0) newItem.innerHeight = innerH;

    setCustomItems((prev) => [...prev, newItem]);
    resetForm();
    setShowCustomForm(false);
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((fav) => fav !== id) : [...prev, id]
    );
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.5rem",
    border: "1px solid #ccc",
    borderRadius: "4px",
    fontSize: "13px",
    boxSizing: "border-box",
  };

  return (
    <div className="palette-panel">
      {/* My Furniture Section - Always at top */}
      <div>
        <p className="panel-kicker">나의 가구</p>
        <h2 className="panel-title">나의 가구들</h2>
        <p className="panel-subtitle">직접 추가한 커스텀 가구</p>
      </div>

      {customItems.length > 0 && (
        <div style={{ marginBottom: "1rem", maxHeight: "200px", overflowY: "auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {customItems.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "0.5rem",
                  border: "1px solid #d0c4f7",
                  borderRadius: "4px",
                  background: "#f5f0ff",
                }}
              >
                <button
                  onClick={() => handleSelectCustomItem(item)}
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
                  <div style={{ fontWeight: 500 }}>{item.name}</div>
                  <div style={{ fontSize: "11px", color: "#666" }}>
                    {CATEGORY_LABELS[item.category] || item.category} &gt; {FURNITURE_CATALOG[item.type]?.label || item.type} | {item.width}x{item.depth}x{item.height}mm
                  </div>
                </button>
                <button
                  onClick={() => handleDeleteCustomItem(item.id)}
                  style={{
                    padding: "0.25rem 0.5rem",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "14px",
                    color: "#999",
                  }}
                  title="삭제"
                >
                  X
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setShowCustomForm((v) => !v)}
        style={{
          width: "100%",
          padding: "0.6rem",
          background: showCustomForm ? "#e0e0e0" : "#7c5cbf",
          color: showCustomForm ? "#333" : "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontWeight: 500,
          fontSize: "13px",
          marginBottom: "1rem",
        }}
      >
        {showCustomForm ? "접기" : "+ 수동 추가"}
      </button>

      {showCustomForm && (
        <div
          style={{
            padding: "0.75rem",
            border: "1px solid #d0c4f7",
            borderRadius: "6px",
            background: "#faf8ff",
            marginBottom: "1.5rem",
          }}
        >
          {/* Name */}
          <div style={{ marginBottom: "0.5rem" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "0.25rem" }}>
              이름 *
            </label>
            <input
              type="text"
              placeholder="예: 내 책상"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Category */}
          <div style={{ marginBottom: "0.5rem" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "0.25rem" }}>
              카테고리
            </label>
            <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
              {categoryOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setFormCategory(opt.value);
                    setFormType(CATEGORY_TYPES[opt.value][0].type);
                  }}
                  style={{
                    padding: "0.35rem 0.5rem",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    background: formCategory === opt.value ? "#7c5cbf" : "white",
                    color: formCategory === opt.value ? "white" : "#333",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sub-type */}
          <div style={{ marginBottom: "0.5rem" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "0.25rem" }}>
              세부 종류
            </label>
            <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
              {CATEGORY_TYPES[formCategory].map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => setFormType(opt.type)}
                  style={{
                    padding: "0.35rem 0.5rem",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    background: formType === opt.type ? "#5a9e6f" : "white",
                    color: formType === opt.type ? "white" : "#333",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Outer dimensions */}
          <div style={{ marginBottom: "0.5rem" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "0.25rem" }}>
              외부 크기 (mm) *
            </label>
            <div style={{ display: "flex", gap: "0.25rem" }}>
              <input
                type="number"
                placeholder="가로(W)"
                value={formWidth}
                onChange={(e) => setFormWidth(e.target.value)}
                style={{ ...inputStyle, width: "33%" }}
                min={1}
              />
              <input
                type="number"
                placeholder="세로(D)"
                value={formDepth}
                onChange={(e) => setFormDepth(e.target.value)}
                style={{ ...inputStyle, width: "33%" }}
                min={1}
              />
              <input
                type="number"
                placeholder="높이(H)"
                value={formHeight}
                onChange={(e) => setFormHeight(e.target.value)}
                style={{ ...inputStyle, width: "33%" }}
                min={1}
              />
            </div>
          </div>

          {/* Inner dimensions */}
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 500, marginBottom: "0.25rem", color: "#888" }}>
              내부 크기 (mm) - 선택사항
            </label>
            <div style={{ display: "flex", gap: "0.25rem" }}>
              <input
                type="number"
                placeholder="가로"
                value={formInnerWidth}
                onChange={(e) => setFormInnerWidth(e.target.value)}
                style={{ ...inputStyle, width: "33%" }}
                min={1}
              />
              <input
                type="number"
                placeholder="세로"
                value={formInnerDepth}
                onChange={(e) => setFormInnerDepth(e.target.value)}
                style={{ ...inputStyle, width: "33%" }}
                min={1}
              />
              <input
                type="number"
                placeholder="높이"
                value={formInnerHeight}
                onChange={(e) => setFormInnerHeight(e.target.value)}
                style={{ ...inputStyle, width: "33%" }}
                min={1}
              />
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={handleSaveCustomItem}
            disabled={!formName.trim() || !Number(formWidth) || !Number(formDepth) || !Number(formHeight)}
            style={{
              width: "100%",
              padding: "0.6rem",
              background:
                formName.trim() && Number(formWidth) && Number(formDepth) && Number(formHeight)
                  ? "#7c5cbf"
                  : "#ccc",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor:
                formName.trim() && Number(formWidth) && Number(formDepth) && Number(formHeight)
                  ? "pointer"
                  : "not-allowed",
              fontWeight: 500,
              fontSize: "13px",
            }}
          >
            저장
          </button>
        </div>
      )}

      {/* Divider */}
      <hr style={{ border: "none", borderTop: "1px solid #e0e0e0", margin: "0.5rem 0 1rem" }} />

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
