import React, { useEffect, useRef, useState, useMemo } from "react";
import Layout from "../../../styles/Layout";
import './MemberTransition.css';
import { useSakamichiMasterDataContext } from "../../common/SakamichiMasterDataContext";
// Import parseDate and getMemberDisplayGroupName from common utilities
import { parseDate, getMemberDisplayGroupName } from "../../common/utils/memberUtils";

// Define groupColors here as it's used in JSX and logic
const groupColors = {
  "乃木坂46": "#812990",
  "櫻坂46": "#F19DB5",
  "日向坂46": "#7CC7E8",
  "欅坂46": "#5eb954",
  "けやき坂46": "#5eb954",
};

const MemberTransition = ({ setModalOpen }) => {
  // マスターデータをContextから取得
  const { data, loading, error } = useSakamichiMasterDataContext();

  // 既存のstate
  const [isCompositionModalOpen, setIsCompositionModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedEventIndex, setSelectedEventIndex] = useState(0);
  const [filters, setFilters] = useState(() => ({
    "乃木坂46": true,
    "櫻坂46": true,
    "日向坂46": true,
    "欅坂46": true,
    "けやき坂46": true,
    "member_join": true,
    "discography_release": true,
  }));
  const itemRefs = useRef([]);
  // Add states for auto-scrolling logic
  const isUserScrolling = useRef(true);
  const [isNarrowScreen, setIsNarrowScreen] = useState(false);

  // Screen width detection for auto-scrolling
  useEffect(() => {
    const handleResize = () => {
      setIsNarrowScreen(window.innerWidth <= 900); // 900px breakpoint
    };
    handleResize(); // Set initial value
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize); // Corrected: remove 'resize' listener
  }, []);

  // Data derived from master data context
  const members = useMemo(() => (data && data.members) ? data.members : [], [data]);
  const startDates = useMemo(() => {
    // startMap: { "グループ名_加入期": "加入記念日" }
    if (!data || !data.startMap) return [];
    // startDatesは [{グループ名, 加入期, 加入記念日}] の配列として再構成
    return Object.entries(data.startMap).map(([key, value]) => {
      const [group, period] = key.split("_");
      return { グループ名: group, 加入期: period, 加入記念日: value };
    });
  }, [data]);
  const groupPeriods = useMemo(() => {
    // groupMap: { グループ名: [{旧グループ名, 開始日, 終了日}, ...] }
    if (!data || !data.groupMap) return [];
    // groupPeriodsは [{グループ名, 旧グループ名, 開始日, 終了日}] の配列
    return Object.entries(data.groupMap).flatMap(([group, arr]) =>
      arr.map(period => ({
        グループ名: group,
        旧グループ名: period.旧グループ名,
        開始日: period.開始日,
        終了日: period.終了日
      }))
    );
  }, [data]);
  const events = useMemo(() => {
    // eventMap: { 日付文字列: [イベント, ...] }
    if (!data || !data.eventMap) return [];
    // eventListを配列で展開し、dateプロパティをDate型に
    return Object.entries(data.eventMap)
      .flatMap(([dateStr, arr]) =>
        arr.map(e => ({
          ...e,
          date: e.date instanceof Date ? e.date : parseDate(dateStr) // Use imported parseDate
        }))
      )
      .filter(e => e.date)
      .map(e => {
        if (e.type === "member_join") {
          return {
            date: e.date,
            label: `${e.group} ${e.period}加入`, // Changed label to include group name for clarity in timeline
            group: e.group,
            period: e.period,
            type: e.type,
          };
        } else if (e.type === "discography_release") {
          return {
            date: e.date,
            label: `『${e.title}』`,
            group: e.group,
            title: e.title,
            type: e.type,
          };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => a.date - b.date);
  }, [data]);

  // フィルタ適用
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const isGroupEnabled = filters[event.group];
      if (!isGroupEnabled) return false;
      const isTypeEnabled = filters[event.type];
      if (!isTypeEnabled) return false;
      return true;
    });
  }, [events, filters]);

  // Initialize selectedEvent and selectedEventIndex when filteredEvents are loaded
  useEffect(() => {
    if (!selectedEvent && filteredEvents.length > 0) {
      setSelectedEvent(filteredEvents[0]);
      setSelectedEventIndex(0);
    }
  }, [filteredEvents, selectedEvent]);

  // Auto-scrolling logic (similar to original Home.js logic)
  useEffect(() => {
    if (filteredEvents.length === 0) return;
    const onScroll = () => {
      if (isUserScrolling.current && !isNarrowScreen) {
        const center = window.innerHeight / 2;
        let minDiff = Infinity;
        let idx = 0;
        itemRefs.current.forEach((ref, i) => {
          if (ref) {
            const rect = ref.getBoundingClientRect();
            const diff = Math.abs(rect.top + rect.height / 2 - center);
            if (diff < minDiff) {
              minDiff = diff;
              idx = i;
            }
          }
        });
        if (idx !== selectedEventIndex) { // Only update if index changed
          setSelectedEvent(filteredEvents[idx]);
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // Initial run
    return () => window.removeEventListener("scroll", onScroll);
  }, [filteredEvents, isNarrowScreen, selectedEventIndex]);

  // Scroll to selected event when selectedEventIndex changes
  useEffect(() => {
    if (itemRefs.current[selectedEventIndex]) {
      isUserScrolling.current = false; // Programmatic scroll
      itemRefs.current[selectedEventIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
      const timer = setTimeout(() => { isUserScrolling.current = true; }, 500); // smooth scroll duration
      return () => clearTimeout(timer);
    }
  }, [selectedEventIndex]);

  useEffect(() => {
    if (selectedEvent && filteredEvents.length > 0) {
      const index = filteredEvents.findIndex(
        (e) =>
          e.date.toISOString() === selectedEvent.date.toISOString() &&
          e.label === selectedEvent.label
      );
      if (index !== -1) {
        setSelectedEventIndex(index);
      }
    }
  }, [selectedEvent, filteredEvents]);

  const handleFilterChange = (key) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      [key]: !prevFilters[key],
    }));
  };

  // periodごとの開始日を取得する関数 (used in modal for sorting)
  const getPeriodStartDate = (group, period) => {
    const row = startDates.find(
      (row) =>
        row.グループ名 === group &&
        (row.加入期 || "").replace("生", "") === period.replace("生", "")
    );
    return row ? parseDate(row.加入記念日) : new Date(0);
  };

  // getActiveMembersByGroupAndPeriod function
  const getActiveMembersByGroupAndPeriod = (targetDate) => {
    if (!members.length || !data?.groupMap || !startDates.length) return {};
    const groupList = ["乃木坂46", "欅坂46", "櫻坂46", "けやき坂46", "日向坂46"];
    const result = {};
    groupList.forEach((g) => (result[g] = {}));
    members.forEach((m) => {
      const m期 = m.加入期 || ""; // メンバーの加入期
      // Use getMemberDisplayGroupName utility
      const group = getMemberDisplayGroupName(m, data.groupMap, targetDate);
      if (!result[group]) return;
      const startRow = startDates.find(
        (row) =>
          row.グループ名 === m.グループ名 &&
          (row.加入期 || "").replace("生", "") === m期.replace("生", "")
      );
      const joinDate = startRow ? parseDate(startRow.加入記念日) : null;
      if (!joinDate) return; // If joinDate is invalid, skip
      const gradDate = parseDate(m["卒業・辞退・契約終了日"]);
      if (
        targetDate >= joinDate &&
        (!gradDate || targetDate < gradDate) // If gradDate is not set, or targetDate is before gradDate
      ) {
        const period = m.加入期 || "不明";
        if (!result[group][period]) result[group][period] = [];
        result[group][period].push(m.名前);
      }
    });
    return result;
  };

  // Define displayGroups here as it's used in JSX
  const displayGroups = ["乃木坂46", "欅坂46", "櫻坂46", "けやき坂46", "日向坂46"];

  const handleTimelineItemClick = (item) => {
    setSelectedEvent(item);
    setIsCompositionModalOpen(true);
    if (setModalOpen) {
      setModalOpen(true);
    }
  };

  const handlePrevEvent = () => {
    const prevIndex = selectedEventIndex - 1;
    if (prevIndex >= 0) {
      setSelectedEvent(filteredEvents[prevIndex]);
    }
  };

  const handleNextEvent = () => {
    const nextIndex = selectedEventIndex + 1;
    if (nextIndex < filteredEvents.length) {
      setSelectedEvent(filteredEvents[nextIndex]);
    }
  };

  const isPrevDisabled = selectedEventIndex === 0;
  const isNextDisabled = selectedEventIndex === filteredEvents.length - 1;

  if (loading) return <Layout><div>読み込み中...</div></Layout>;
  if (error || !data) {
    return <Layout><div>データの読み込みに失敗しました</div></Layout>;
  }
  // Derive currentEvent and activeByGroupAndPeriod from selectedEvent
  const currentEvent = selectedEvent || filteredEvents[0]; // Ensure currentEvent is set, fallback to first filtered event
  const activeByGroupAndPeriod = currentEvent ? getActiveMembersByGroupAndPeriod(currentEvent.date) : {};


  return (
    <Layout>
      {/* ★フィルターコンテナを一つにまとめる★ */}
      <div className="member-transition-filter-container">
        <div className="filter-options-wrapper">
          <div className="filter-group-section">
            <h4 className="filter-subsection-title">グループ</h4>
            <div className="filter-checkboxes-horizontal">
              {["乃木坂46", "櫻坂46", "日向坂46", "欅坂46", "けやき坂46"].map(group => (
                <div key={group} className="checkbox-group" style={{ '--group-color': groupColors[group] }}>
                  <input
                    type="checkbox"
                    id={`filter-${group}`}
                    checked={filters[group]}
                    onChange={() => handleFilterChange(group)}
                  />
                  <label htmlFor={`filter-${group}`}>{group}</label>
                </div>
              ))}
            </div>
          </div>
          <div className="filter-type-section">
            <h4 className="filter-subsection-title">イベントタイプ</h4>
            <div className="filter-checkboxes-vertical">
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="filter-member-join"
                  checked={filters.member_join}
                  onChange={() => handleFilterChange('member_join')}
                />
                <label htmlFor="filter-member-join">メンバー加入</label>
              </div>
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="filter-discography-release"
                  checked={filters.discography_release}
                  onChange={() => handleFilterChange('discography_release')}
                />
                <label htmlFor="filter-discography-release">リリース情報</label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="member-transition-main-container timeline-full-width">
        <div className="timeline-section">
          <div className="timeline-items-wrapper">
            {filteredEvents.map((item, i) => (
              <div
                key={`${item.date.toISOString()}-${item.label}`}
                ref={el => (itemRefs.current[i] = el)}
                className="timeline-item-row"
                tabIndex={0}
                onClick={() => handleTimelineItemClick(item)}
                style={{
                  padding: "10px",
                  borderLeft: "4px solid #ccc",
                  marginLeft: 30,
                  position: "relative",
                  background: selectedEvent && selectedEvent.date.toISOString() === item.date.toISOString() && selectedEvent.label === item.label ? "#f5f0fa" : "transparent",
                  transition: "background 0.2s",
                  minHeight: 56,
                  display: "flex",
                  flexDirection: "row",
                  flexWrap: "wrap",
                  alignItems: "center",
                  cursor: "pointer",
                  zIndex: 2,
                }}
              >
                <div className="timeline-item-date" style={{
                  minWidth: 90,
                  marginLeft: 16,
                  color: groupColors[item.group] || "#812990",
                  fontWeight: "bold",
                  fontSize: "1.1em",
                  textAlign: "right",
                }}>
                  {item.date.toLocaleDateString()}
                </div>
                <div
                  className="timeline-item-group-frame"
                  style={{
                    border: `2px solid ${groupColors[item.group] || "#812990"}`,
                    borderRadius: "12px",
                    background: "#fff",
                    padding: "16px 20px",
                    minWidth: 180,
                    maxWidth: 340,
                    margin: "0 auto",
                    position: "relative",
                    flex: 1,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      position: "absolute",
                      top: 8,
                      left: 12,
                    }}
                  >
                    <div
                      style={{
                        color: "#fff",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        fontSize: "1.0em",
                        marginRight: 12,
                      }}
                    >
                      {item.type === "member_join" ? "👤 " : "🎵 "}
                    </div>
                    <div
                      className="timeline-item-group-label"
                      style={{
                        display: "flex",
                        position: "relative",
                        color: groupColors[item.group] || "#812990",
                        fontWeight: "bold",
                        fontSize: "0.98em",
                        background: "#f7f6fa",
                        borderRadius: "6px",
                        padding: "2px 10px",
                        alignItems: "center",
                        zIndex: 2,
                      }}
                    >
                      {item.group}
                    </div>
                  </div>
                  <div
                    className="timeline-item-label-content"
                    style={{
                      marginTop: 24,
                      marginBottom: 8,
                      fontSize: "1.1em",
                      fontWeight: "bold",
                      textAlign: "center",
                    }}
                  >
                    {item.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isCompositionModalOpen && selectedEvent && (
        <div className="member-composition-modal-overlay">
          <div className="member-composition-modal">
            <button
              className="modal-close-button"
              onClick={() => {
                setIsCompositionModalOpen(false);
                if (setModalOpen) {
                  setModalOpen(false);
                }
              }}
            >
              &times;
            </button>
            <div className="member-composition-header" style={{ '--group-color': groupColors[selectedEvent.group] || "#812990" }}>
              <div className="member-composition-date-nav-container">
                <button
                  className="nav-button prev-button"
                  onClick={handlePrevEvent}
                  disabled={isPrevDisabled}
                >
                  {"＜"}
                </button>
                <div className="member-composition-date">
                  {selectedEvent.date.toLocaleDateString()}
                </div>
                <button
                  className="nav-button next-button"
                  onClick={handleNextEvent}
                  disabled={isNextDisabled}
                >
                  {"＞"}
                </button>
              </div>
              <div className="member-composition-label">
                {selectedEvent.label}
              </div>
            </div>
            <div
              className="member-composition-body" // Corrected class name from member-composition-card
              style={{
                background: "#fff",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                padding: "32px 40px",
                minWidth: "320px",
                minHeight: "120px",
                textAlign: "center",
                maxWidth: "800px",
                overflow: "hidden",
                pointerEvents: "auto",
                maxHeight: "80vh",
                overflowY: "auto",
              }}
            >
              <div style={{
                display: "flex",
                gap: "16px",
                justifyContent: "center",
                flexWrap: "wrap",
                overflowX: "hidden",
              }}>
                {displayGroups.map((group) =>
                  Object.keys(getActiveMembersByGroupAndPeriod(selectedEvent.date)[group] || {}).length ? (
                    <div key={group} style={{
                      minWidth: 120,
                      maxWidth: 220,
                      background: "#faf7fd",
                      borderRadius: "10px",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                      padding: "8px 6px",
                      margin: "0 4px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center"
                    }}>
                      <div style={{
                        color: groupColors[group],
                        fontWeight: "bold",
                        fontSize: "1.05em",
                        marginBottom: "4px"
                      }}>
                        {group}（{Object.values(getActiveMembersByGroupAndPeriod(selectedEvent.date)[group])
                          .reduce((sum, names) => sum + names.length, 0)}人）
                      </div>
                      {Object.entries(getActiveMembersByGroupAndPeriod(selectedEvent.date)[group]).sort(([a], [b]) => {
                        const dateA = getPeriodStartDate(group, a);
                        const dateB = getPeriodStartDate(group, b);
                        return dateA - dateB;
                      })
                      .map(([period, names]) => (
                        <div
                          key={period}
                          style={{
                            border: `2px solid ${groupColors[group]}`,
                            borderRadius: "8px",
                            marginBottom: "8px",
                            padding: "4px 6px",
                            background: "#fff",
                            width: "100%",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center"
                          }}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              fontWeight: "bold",
                              color: groupColors[group],
                              background: "#f5f5f5",
                              borderRadius: "4px",
                              padding: "2px 8px",
                              marginBottom: "4px",
                              marginRight: "8px",
                              fontSize: "0.95em",
                            }}
                          >
                            {period}（{names.length}人）
                          </span>
                          <div style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "6px",
                            marginTop: "4px",
                            justifyContent: "center"
                          }}>
                            {names.map(name => (
                              <span
                                key={name}
                                style={{
                                  background: groupColors[group],
                                  color: "#fff",
                                  borderRadius: "6px",
                                  padding: "2px 8px",
                                  fontSize: "0.97em",
                                  display: "inline-block",
                                  marginBottom: "2px"
                                }}
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default MemberTransition;
