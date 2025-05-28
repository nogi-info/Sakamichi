import React, { useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import Layout from "../../../styles/Layout";

const csvBase = "/Sakamichi/data/";

const groupColors = {
  "乃木坂46": "#812990",
  "櫻坂46": "#F19DB5",
  "日向坂46": "#7CC7E8",
  "欅坂46": "#5eb954",
  "けやき坂46": "#5eb954",
};

const parseDate = (str) => {
  if (!str || str === "-") return null;
  const [y, m, d] = str.split("/").map(Number);
  return new Date(y, m - 1, d);
};

const MemberTransition = () => {
  const [members, setMembers] = useState([]);
  const [startDates, setStartDates] = useState([]);
  const [events, setEvents] = useState([]);
  const [groupPeriods, setGroupPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const itemRefs = useRef([]);

  useEffect(() => {
    let baseMembers = [];
    let addMembers = [];
    let startList = [];
    let groupPeriodList = [];

    Papa.parse(csvBase + "sakamichi_combined.csv", {
      download: true,
      header: true,
      complete: (baseResult) => {
        baseMembers = baseResult.data;
        Papa.parse(csvBase + "sakamichi_combined_add.csv", {
          download: true,
          header: true,
          complete: (addResult) => {
            addMembers = addResult.data;
            Papa.parse(csvBase + "sakamichi_start.csv", {
              download: true,
              header: true,
              complete: (startResult) => {
                startList = startResult.data;
                Papa.parse(csvBase + "sakamichi_group.csv", {
                  download: true,
                  header: true,
                  complete: (groupResult) => {
                    groupPeriodList = groupResult.data;
                    setGroupPeriods(groupPeriodList);

                    // 加入期上書き
                    const addMap = {};
                    addMembers.forEach((row) => {
                      addMap[`${row.グループ名}_${row.名前}`] = row.加入期;
                    });
                    const merged = baseMembers.map((m) => {
                      const key = `${m.グループ名}_${m.名前}`;
                      return addMap[key]
                        ? { ...m, 加入期: addMap[key] }
                        : m;
                    });

                    setMembers(merged);
                    setStartDates(startList);

                    // --- 年表情報の作り方を修正 ---
                    // 1. ベースとなるマップを作成（キー: 加入記念日, バリュー: {グループ名, 加入期}）
                    const eventMap = {};
                    startList.forEach((row) => {
                      const dateStr = row.加入記念日;
                      eventMap[dateStr] = {
                        group: row.グループ名,
                        period: row.加入期,
                        date: parseDate(dateStr),
                      };
                    });

                    // 2. sakamichi_group.csvでグループ名を書き換え
                    Object.entries(eventMap).forEach(([dateStr, val]) => {
                      const eventDate = val.date;
                      groupPeriodList.forEach((period) => {
                        const start = parseDate(period.開始日);
                        const end = parseDate(period.終了日);
                        if (
                          period.旧グループ名 &&
                          period.グループ名 === val.group &&
                          start &&
                          end &&
                          eventDate >= start &&
                          eventDate <= end
                        ) {
                          val.group = period.旧グループ名;
                        }
                      });
                    });

                    // 3. マップから年表リストを生成
                    const eventList = Object.values(eventMap)
                      .filter((e) => e.date)
                      .map((e) => ({
                        date: e.date,
                        label: `${e.group} ${e.period}加入`,
                        group: e.group,
                        period: e.period,
                      }))
                      .sort((a, b) => a.date - b.date);

                    setEvents(eventList);
                    setLoading(false);
                  },
                });
              },
            });
          },
        });
      },
    });
  }, []);

  // スクロールで中央に近い出来事を検出
  useEffect(() => {
    if (events.length === 0) return;
    const onScroll = () => {
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
      setCurrentIdx(idx);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [events]);

  // 指定時点で現役のメンバーをグループごと・加入期ごとに抽出
  const getActiveMembersByGroupAndPeriod = (targetDate) => {
    if (!members.length || !startDates.length) return {};
    const groupList = ["乃木坂46", "欅坂46", "櫻坂46", "けやき坂46", "日向坂46"];
    const result = {};
    groupList.forEach((g) => (result[g] = {}));
    members.forEach((m) => {
      const m期 = m.加入期 || "";
      let group = m.グループ名;
      // グループ名の表示を期間で置き換え
      for (const period of groupPeriods) {
        if (
          period.旧グループ名 &&
          period.グループ名 === group &&
          parseDate(period.開始日) &&
          parseDate(period.終了日) &&
          targetDate >= parseDate(period.開始日) &&
          targetDate <= parseDate(period.終了日)
        ) {
          group = period.旧グループ名;
          break;
        }
      }
      if (!result[group]) return;
      const startRow = startDates.find(
        (row) =>
          row.グループ名 === m.グループ名 &&
          (row.加入期 || "").replace("生", "") === m期.replace("生", "")
      );
      const joinDate = startRow ? parseDate(startRow.加入記念日) : null;
      if (!joinDate) return;
      const gradDate = parseDate(m["卒業・辞退・契約終了日"]);
      if (
        targetDate >= joinDate &&
        (!gradDate || targetDate < gradDate)
      ) {
        const period = m.加入期 || "不明";
        if (!result[group][period]) result[group][period] = [];
        result[group][period].push(m.名前);
      }
    });
    return result;
  };

  if (loading) {
    return <Layout><div>読み込み中...</div></Layout>;
  }

  const currentEvent = events[currentIdx] || events[0];
  const activeByGroupAndPeriod = getActiveMembersByGroupAndPeriod(currentEvent.date);

  // 表示するグループ順
  const displayGroups = ["乃木坂46", "欅坂46", "櫻坂46", "けやき坂46", "日向坂46"];

  return (
    <Layout>
      <h1 style={{ color: "#812990", marginBottom: "16px" }}>メンバー構成の遷移</h1>
      <div style={{ display: "flex", alignItems: "flex-start", minHeight: "120vh" }}>
        {/* 年表（タイムライン）を左端に固定幅で表示 */}
        <div style={{
          marginRight: 32,
          position: "relative",
          zIndex: 1,
        }}>
          {events.map((item, i) => (
            <div
              key={item.date.toISOString()}
              ref={el => (itemRefs.current[i] = el)}
              style={{
                padding: "32px 0",
                borderLeft: "4px solid #ccc",
                marginLeft: 30,
                position: "relative",
                background: i === currentIdx ? "#f5f0fa" : "transparent",
                transition: "background 0.2s",
                minHeight: 56,
                display: "flex",
                alignItems: "center",
                cursor: i === currentIdx ? "default" : "pointer",
                zIndex: 2
              }}
              tabIndex={i === 0 ? 0 : -1}
              onClick={() => setCurrentIdx(i)}
            >
              <div
                style={{
                  minWidth: 90,
                  position: "relative",
                  left: -30,
                  background: "#fff",
                  color: groupColors[item.group] || "#812990",
                  fontWeight: "bold",
                  borderRadius: "8px",
                  padding: "4px 12px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  fontSize: "1.1em",
                  marginRight: 12,
                  textAlign: "right",
                  zIndex: 2,
                  pointerEvents: "auto"
                }}
              >
                {item.date.toLocaleDateString()}
              </div>
              <div style={{
                marginLeft: 8,
                fontSize: "1.1em",
                flex: 1,
                wordBreak: "keep-all",
                zIndex: 1,
                pointerEvents: "auto"
              }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>
        {/* メンバー構成ブロック（中央固定・横並び・スクロール可） */}
        <div style={{
          flex: 1,
          position: "relative",
          minHeight: "80vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center"
        }}>
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 10,
              background: "#fff",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
              padding: "32px 40px",
              minWidth: "320px",
              minHeight: "120px",
              textAlign: "center",
              pointerEvents: "none",
              maxWidth: "60vw",
              overflow: "visible"
            }}
          >
            <div style={{ color: "#812990", fontWeight: "bold", fontSize: "1.2em", pointerEvents: "auto" }}>
              {currentEvent.date.toLocaleDateString()}
            </div>
            <div style={{ marginTop: 8, marginBottom: 12, fontWeight: "bold", pointerEvents: "auto" }}>
              {currentEvent.label}
            </div>
            <div style={{
              display: "flex",
              gap: "16px",
              justifyContent: "center",
              flexWrap: "nowrap",
              overflowX: "auto",
              maxWidth: "55vw",
              maxHeight: "50vh",
              pointerEvents: "auto"
            }}>
              {displayGroups.map((group) =>
                Object.keys(activeByGroupAndPeriod[group] || {}).length ? (
                  <div key={group} style={{
                    minWidth: 120,
                    maxWidth: 220,
                    overflowY: "auto",
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
                      {group}
                    </div>
                    {Object.entries(activeByGroupAndPeriod[group]).map(([period, names]) => (
                      <div
                        key={period}
                        style={{
                          border: `2px solid ${groupColors[group]}`,
                          borderRadius: "8px",
                          marginBottom: "8px",
                          padding: "4px 6px",
                          background: "#fff",
                          width: "100%",
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
                          {period}
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
    </Layout>
  );
};

export default MemberTransition;