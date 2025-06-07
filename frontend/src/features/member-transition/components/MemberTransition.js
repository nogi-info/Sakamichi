import React, { useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import Layout from "../../../styles/Layout";
import './MemberTransition.css'; // CSSファイルをインポート

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

// setModalOpen プロップスを受け取るように変更
const MemberTransition = ({ setModalOpen }) => {
  const [members, setMembers] = useState([]);
  const [startDates, setStartDates] = useState([]);
  const [events, setEvents] = useState([]);
  const [groupPeriods, setGroupPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const itemRefs = useRef([]); // 年表アイテムへの参照を保持

  const [isCompositionModalOpen, setIsCompositionModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedEventIndex, setSelectedEventIndex] = useState(0); // 選択されたイベントのインデックス

  useEffect(() => {
    let baseMembers = [];
    let addMembers = [];
    let startList = [];
    let groupPeriodList = [];

    // CSVファイルの読み込みとデータ結合
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

                    // 加入期上書きロジック
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

                    // 年表情報の生成とグループ名上書き
                    const eventMap = {};
                    startList.forEach((row) => {
                      const dateStr = row.加入記念日;
                      eventMap[dateStr] = {
                        group: row.グループ名,
                        period: row.加入期,
                        date: parseDate(dateStr),
                      };
                    });

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

  // selectedEventが変更されたときにselectedEventIndexを更新
  useEffect(() => {
    if (selectedEvent && events.length > 0) {
      const index = events.findIndex(
        (e) => e.date.toISOString() === selectedEvent.date.toISOString()
      );
      if (index !== -1) {
        setSelectedEventIndex(index);
      }
    }
  }, [selectedEvent, events]);


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

  // currentEvent は、選択されたイベント（モーダル表示用）または最初のイベントを初期値として設定
  const currentEvent = selectedEvent || events[0];
  const activeByGroupAndPeriod = getActiveMembersByGroupAndPeriod(currentEvent.date);

  // 表示するグループ順
  const displayGroups = ["乃木坂46", "欅坂46", "櫻坂46", "けやき坂46", "日向坂46"];

  // 年表項目がクリックされたときのハンドラー
  const handleTimelineItemClick = (item) => {
    setSelectedEvent(item); // 選択されたイベントをstateに保存
    setIsCompositionModalOpen(true); // モーダルを開く
    if (setModalOpen) {
      setModalOpen(true); // App.jsにモーダルが開いたことを通知
    }
  };

  // 前のイベントに移動
  const handlePrevEvent = () => {
    const prevIndex = selectedEventIndex - 1;
    if (prevIndex >= 0) {
      setSelectedEvent(events[prevIndex]);
      // setSelectedEventIndex(prevIndex); // useEffectで更新されるため不要
    }
  };

  // 次のイベントに移動
  const handleNextEvent = () => {
    const nextIndex = selectedEventIndex + 1;
    if (nextIndex < events.length) {
      setSelectedEvent(events[nextIndex]);
      // setSelectedEventIndex(nextIndex); // useEffectで更新されるため不要
    }
  };

  const isPrevDisabled = selectedEventIndex === 0;
  const isNextDisabled = selectedEventIndex === events.length - 1;

  return (
    <Layout>
      {/* メインコンテンツコンテナ：年表が常に全画面表示 */}
      <div className="member-transition-main-container timeline-full-width">

        {/* 年表（タイムライン）コンテナ */}
        <div className="timeline-section">
          {/* 年表アイテムのラッパー */}
          <div className="timeline-items-wrapper">
            {events.map((item, i) => (
              <div
                key={item.date.toISOString()}
                ref={el => (itemRefs.current[i] = el)}
                style={{
                  padding: "32px 0",
                  borderLeft: "4px solid #ccc",
                  marginLeft: 30,
                  position: "relative",
                  // 選択された項目を強調表示するスタイルは維持
                  background: selectedEvent && selectedEvent.date.toISOString() === item.date.toISOString() ? "#f5f0fa" : "transparent",
                  transition: "background 0.2s",
                  minHeight: 56,
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer", // クリック可能にする
                  zIndex: 2,
                }}
                tabIndex={0} // キーボード操作可能にする
                onClick={() => handleTimelineItemClick(item)} // クリックハンドラーを設定
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
                <div
                  style={{
                    marginLeft: 8,
                    fontSize: "1.1em",
                    flex: 1,
                    wordBreak: "keep-all",
                    zIndex: 1,
                    pointerEvents: "auto"
                  }}
                >
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* メンバー構成モーダル */}
      {isCompositionModalOpen && selectedEvent && (
        <div className="member-composition-modal-overlay">
          <div className="member-composition-modal">
            <button
              className="modal-close-button"
              onClick={() => {
                setIsCompositionModalOpen(false); // モーダルを閉じる
                if (setModalOpen) {
                  setModalOpen(false); // App.jsにモーダルが閉じたことを通知
                }
              }}
            >
              &times;
            </button>
            {/* 日付と年表の内容の表示部分を新しい構造とクラスで囲む */}
            <div className="member-composition-header" style={{ '--group-color': groupColors[selectedEvent.group] || "#812990" }}>
              {/* 日付とナビゲーションボタンをまとめるコンテナ */}
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
              className="member-composition-card"
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
                maxHeight: "80vh", // モーダル内のカードの高さ調整
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
                        {group}
                      </div>
                      {Object.entries(getActiveMembersByGroupAndPeriod(selectedEvent.date)[group]).map(([period, names]) => (
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
      )}
    </Layout>
  );
};

export default MemberTransition;
