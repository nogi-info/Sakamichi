import React, { useEffect, useState } from "react";
import Papa from "papaparse";
import Layout from "../components/Layout";

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
  const [minDate, setMinDate] = useState(null);
  const [maxDate, setMaxDate] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [groupPeriods, setGroupPeriods] = useState([]);

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

                    // シークバーの範囲決定
                    const allDates = [
                      ...startList.map((row) => parseDate(row.加入記念日)).filter(Boolean),
                      ...merged.map((m) => parseDate(m["卒業・辞退・契約終了日"])).filter(Boolean),
                    ].map(date => date.getTime());

                    const min = new Date(Math.min(...allDates));
                    const max = new Date(Math.max(...allDates));
                    setMinDate(min);
                    setMaxDate(max);
                    setCurrentDate(max);
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

  // 指定時点で現役のメンバーをグループごとに抽出（表示名も判定）
  const getActiveMembersByGroup = () => {
    if (!members.length || !startDates.length) return {};
    // グループ名リスト
    const groupList = ["乃木坂46", "櫻坂46", "日向坂46", "欅坂46", "けやき坂46"];
    const result = {};
    groupList.forEach((g) => (result[g] = []));
    members.forEach((m) => {
      const m期 = m.加入期 || "";
      let group = m.グループ名;
      // グループ名の表示を期間で置き換え
      let displayGroup = group;
      for (const period of groupPeriods) {
        if (
          period.旧グループ名 &&
          period.グループ名 === group &&
          parseDate(period.開始日) &&
          parseDate(period.終了日) &&
          currentDate >= parseDate(period.開始日) &&
          currentDate <= parseDate(period.終了日)
        ) {
          displayGroup = period.旧グループ名;
          break;
        }
      }
      if (!result[displayGroup]) return;
      const startRow = startDates.find(
        (row) =>
          row.グループ名 === group &&
          (row.加入期 || "").replace("生", "") === m期.replace("生", "")
      );
      const joinDate = startRow ? parseDate(startRow.加入記念日) : null;
      if (!joinDate) return;
      const gradDate = parseDate(m["卒業・辞退・契約終了日"]);
      if (
        currentDate >= joinDate &&
        (!gradDate || currentDate < gradDate)
      ) {
        result[displayGroup].push(m.名前);
      }
    });
    return result;
  };

  if (loading) {
    return <Layout><div>読み込み中...</div></Layout>;
  }

  const sliderMin = minDate ? minDate.getTime() : 0;
  const sliderMax = maxDate ? maxDate.getTime() : 0;
  const sliderValue = currentDate ? currentDate.getTime() : sliderMax;

  const activeByGroup = getActiveMembersByGroup();

  // 表示するグループ順
  const displayGroups = ["乃木坂46", "欅坂46", "櫻坂46", "けやき坂46", "日向坂46"];

  return (
    <Layout>
      <h1 style={{ color: "#812990", marginBottom: "16px" }}>メンバー構成の遷移</h1>
      <div style={{ margin: "32px 0" }}>
        <input
          type="range"
          min={sliderMin}
          max={sliderMax}
          value={sliderValue}
          step={24 * 60 * 60 * 1000}
          style={{ width: "100%" }}
          onChange={(e) => setCurrentDate(new Date(Number(e.target.value)))}
        />
        <div style={{ textAlign: "center", marginTop: "8px", fontWeight: "bold" }}>
          {currentDate.toLocaleDateString()}
        </div>
      </div>
      <div style={{
        display: "flex",
        gap: "16px",
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexWrap: "wrap"
      }}>
        {displayGroups.map((group) =>
          activeByGroup[group]?.length ? (
            <div
              key={group}
              style={{
                flex: "1 1 0",
                minWidth: "0",
                background: "#faf7fd",
                borderRadius: "10px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                padding: "12px 8px",
                margin: "0 4px",
                maxHeight: "60vh",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                alignItems: "center"
              }}
            >
              <div style={{
                color: groupColors[group],
                fontWeight: "bold",
                fontSize: "1.15rem",
                marginBottom: "8px"
              }}>
                {group}（{activeByGroup[group]?.length || 0}名）
              </div>
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
                justifyContent: "center"
              }}>
                {activeByGroup[group]?.map((name) => (
                  <span
                    key={name}
                    style={{
                      background: groupColors[group],
                      color: "#fff",
                      borderRadius: "6px",
                      padding: "2px 8px",
                      fontSize: "0.97em",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          ) : null
        )}
      </div>
    </Layout>
  );
};

export default MemberTransition;