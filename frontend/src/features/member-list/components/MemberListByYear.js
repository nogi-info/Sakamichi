import React, { useEffect, useState } from "react";
import Papa from "papaparse";
import GroupList from "./MemberList";
import Layout from "../../../styles/Layout";

const groupColors = {
  "乃木坂46": "#812990",
  "櫻坂46": "#F19DB5",
  "日向坂46": "#7CC7E8",
};

const MemberListByYear = () => {
  const [membersByYear, setMembersByYear] = useState({});
  const [filters, setFilters] = useState({});
  const [joinPeriods, setJoinPeriods] = useState({});
  const [links, setLinks] = useState([]);

  useEffect(() => {
    // メンバー情報を読み込む
    Papa.parse("/Sakamichi/data/sakamichi_combined.csv", {
      download: true,
      header: true,
      complete: (result) => {
        const today = new Date();

        // 加入期リストを動的に生成
        const periods = {};
        result.data.forEach((member) => {
          const groupName = member.グループ名?.trim();
          if (!groupName) return;
          const joinPeriod = member.加入期?.match(/\d+/)?.[0] || "1";
          if (!periods[groupName]) periods[groupName] = new Set();
          periods[groupName].add(joinPeriod);
        });

        // フィルタの初期値を設定
        const initialFilters = {};
        Object.keys(periods).forEach((group) => {
          initialFilters[group] = {
            active: true,
            graduated: true,
          };
          periods[group] = Array.from(periods[group]).sort(
            (a, b) => parseInt(a.match(/\d+/)?.[0] || "1") - parseInt(b.match(/\d+/)?.[0] || "1")
          );
          periods[group].forEach((period) => {
            initialFilters[group][period] = true;
          });
        });

        setJoinPeriods(periods);
        setFilters(initialFilters);

        // 年度ごとにデータをグルーピング（4月始まり3月終わり）
        const groupedData = result.data.reduce((acc, member) => {
          const groupName = member.グループ名?.trim();
          if (!groupName) return acc;
          const birthDate = new Date(member.生年月日);
          if (isNaN(birthDate)) return acc;
          const year = birthDate.getMonth() + 1 >= 4 ? birthDate.getFullYear() : birthDate.getFullYear() - 1;
          if (!acc[year]) acc[year] = [];
          acc[year].push(member);
          return acc;
        }, {});

        Object.keys(groupedData).forEach((year) => {
          groupedData[year].sort((a, b) => new Date(a.生年月日) - new Date(b.生年月日));
        });

        setMembersByYear(groupedData);
      },
    });

    // リンク情報を読み込む
    Papa.parse("/Sakamichi/data/sakamichi_link.csv", {
      download: true,
      header: true,
      complete: (result) => {
        setLinks(result.data);
      },
    });
  }, []);

  const toggleFilter = (group, key) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      [group]: {
        ...prevFilters[group],
        [key]: !prevFilters[group][key],
      },
    }));
  };

  return (
    <Layout>
      <h1 style={{ textAlign: "center", color: "#333" }}>坂道メンバー 生年月日順</h1>
      <div style={{ display: "flex", justifyContent: "center", gap: "20px", flexWrap: "wrap" }}>
        {Object.keys(groupColors).map((group) => (
          <div
            key={group}
            style={{
              backgroundColor: "#fff",
              padding: "15px",
              borderRadius: "10px",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              marginBottom: "20px",
              width: "300px",
            }}
          >
            {/* グループ全体のチェックボックス */}
            <div style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={
                    filters[group]?.active &&
                    filters[group]?.graduated &&
                    joinPeriods[group]?.every((period) => filters[group]?.[period])
                  }
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    setFilters((prevFilters) => ({
                      ...prevFilters,
                      [group]: {
                        active: isChecked,
                        graduated: isChecked,
                        ...Object.fromEntries(joinPeriods[group]?.map((period) => [period, isChecked])),
                      },
                    }));
                  }}
                  style={{
                    appearance: "none",
                    width: "20px",
                    height: "20px",
                    border: "2px solid #ccc",
                    borderRadius: "50%",
                    outline: "none",
                    cursor: "pointer",
                    backgroundColor:
                      filters[group]?.active &&
                      filters[group]?.graduated &&
                      joinPeriods[group]?.every((period) => filters[group]?.[period])
                        ? groupColors[group]
                        : "#fff",
                  }}
                />
                <h3 style={{ color: groupColors[group], margin: 0 }}>{group}</h3>
              </label>
            </div>

            {/* 現役メンバー・元メンバーのフィルター */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <input
                  type="checkbox"
                  checked={filters[group]?.active}
                  onChange={() => toggleFilter(group, "active")}
                />
                現役メンバー
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <input
                  type="checkbox"
                  checked={filters[group]?.graduated}
                  onChange={() => toggleFilter(group, "graduated")}
                />
                元メンバー
              </label>
            </div>

            {/* 加入期フィルター */}
            <div>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>加入期:</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {joinPeriods[group]?.map((period) => (
                  <label
                    key={period}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      backgroundColor: "#f9f9f9",
                      padding: "5px 10px",
                      borderRadius: "5px",
                      border: "1px solid #ccc",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={filters[group]?.[period]}
                      onChange={() => toggleFilter(group, period)}
                    />
                    {period}期生
                  </label>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      {Object.keys(membersByYear)
        .filter((year) => {
          // 年度内に表示するメンバーが存在するか確認
          const hasMembers = membersByYear[year].some((member) => {
            const groupName = member.グループ名?.trim();
            if (!groupName) return false;
            const joinPeriod = member.加入期?.match(/\d+/)?.[0] || "1";
            const isActive =
              member["卒業・辞退・契約終了日"] === "-" ||
              new Date(member["卒業・辞退・契約終了日"]) > new Date();
            return (
              filters[groupName]?.[joinPeriod] &&
              ((filters[groupName]?.active && isActive) || (filters[groupName]?.graduated && !isActive))
            );
          });
          return hasMembers;
        })
        .sort((a, b) => a - b)
        .map((year) => (
          <div key={year} style={{ marginBottom: "20px" }}>
            <h2 style={{ borderBottom: "2px solid #ccc", paddingBottom: "5px" }}>
              {year}年度生まれ
            </h2>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <GroupList members={membersByYear[year]} groupName="乃木坂46" filters={filters["乃木坂46"]} links={links} />
              <GroupList members={membersByYear[year]} groupName="櫻坂46" filters={filters["櫻坂46"]} links={links} />
              <GroupList members={membersByYear[year]} groupName="日向坂46" filters={filters["日向坂46"]} links={links} />
            </div>
          </div>
        ))}
    </Layout>
  );
};

export default MemberListByYear;