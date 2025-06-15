import React, { useMemo, useState } from "react";
import GroupList from "./MemberList";
import MemberCard from "./MemberCard";
import Layout from "../../../styles/Layout";
import './MemberListByYear.css';
import { useSakamichiMasterDataContext } from "../../common/SakamichiMasterDataContext";

const groupColors = {
  "乃木坂46": "#812990",
  "櫻坂46": "#F19DB5",
  "日向坂46": "#7CC7E8",
};

const MemberListByYear = () => {
  const { data, loading, error } = useSakamichiMasterDataContext();
  const [displayMode, setDisplayMode] = useState("multi-column");

  // Hooksは必ずコンポーネントの先頭で呼び出す
  const allMembers = useMemo(() => (data && data.members) ? data.members : [], [data]);
  const links = allMembers;

  const joinPeriods = useMemo(() => {
    const periods = {};
    allMembers.forEach((member) => {
      const groupName = member.グループ名?.trim();
      if (!groupName) return;
      const joinPeriod = member.加入期?.match(/\d+/)?.[0] || "1";
      if (!periods[groupName]) periods[groupName] = new Set();
      periods[groupName].add(joinPeriod);
    });
    Object.keys(periods).forEach((group) => {
      periods[group] = Array.from(periods[group]).sort(
        (a, b) => parseInt(a.match(/\d+/)?.[0] || "1") - parseInt(b.match(/\d+/)?.[0] || "1")
      );
    });
    return periods;
  }, [allMembers]);

  const initialFilters = useMemo(() => {
    const filters = {};
    Object.keys(joinPeriods).forEach((group) => {
      filters[group] = {
        active: true,
        graduated: true,
      };
      joinPeriods[group].forEach((period) => {
        filters[group][period] = true;
      });
    });
    return filters;
  }, [joinPeriods]);

  const [filters, setFilters] = useState(initialFilters);

  const toggleFilter = (group, key) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      [group]: {
        ...prevFilters[group],
        [key]: !prevFilters[group][key],
      },
    }));
  };

  const membersByYear = useMemo(() => {
    const groupedData = allMembers.reduce((acc, member) => {
      const groupName = member.グループ名?.trim();
      if (!groupName) return acc;
      const birthDate = new Date(member.生年月日);
      if (isNaN(birthDate.getTime())) return acc;
      const year = birthDate.getMonth() + 1 >= 4 ? birthDate.getFullYear() : birthDate.getFullYear() - 1;
      if (!acc[year]) acc[year] = [];
      acc[year].push(member);
      return acc;
    }, {});
    Object.keys(groupedData).forEach((year) => {
      groupedData[year].sort((a, b) => new Date(a.生年月日) - new Date(b.生年月日));
    });
    return groupedData;
  }, [allMembers]);

  const sortedAndFilteredAllMembers = useMemo(() => {
    let filteredMembers = allMembers.filter((member) => {
      const groupName = member.グループ名?.trim();
      if (!groupName || !filters[groupName]) return false;
      const joinPeriod = member.加入期?.match(/\d+/)?.[0] || "1";
      const isActive =
        member["卒業・辞退・契約終了日"] === "-" ||
        new Date(member["卒業・辞退・契約終了日"]) > new Date();
      return (
        (filters[groupName]?.[joinPeriod] ?? false) &&
        (
          ((filters[groupName]?.active ?? false) && isActive) ||
          ((filters[groupName]?.graduated ?? false) && !isActive)
        )
      );
    });
    filteredMembers.sort((a, b) => new Date(a.生年月日) - new Date(b.生年月日));
    return filteredMembers;
  }, [allMembers, filters]);

  const groupedAllMembersByYear = useMemo(() => {
    return sortedAndFilteredAllMembers.reduce((acc, member) => {
      const birthDate = new Date(member.生年月日);
      const year = birthDate.getMonth() + 1 >= 4 ? birthDate.getFullYear() : birthDate.getFullYear() - 1;
      if (!acc[year]) acc[year] = [];
      acc[year].push(member);
      return acc;
    }, {});
  }, [sortedAndFilteredAllMembers]);

  // ここより下は既存のまま
  if (loading) return <div>読み込み中...</div>;
  if (error || !data) return <div>データの読み込みに失敗しました</div>;

  return (
    <Layout>
      {/* 表示方法切り替えボタン */}
      <div className="display-mode-buttons">
        <button
          onClick={() => setDisplayMode("multi-column")}
          className={displayMode === "multi-column" ? "active" : ""}
        >
          グループ別表示
        </button>
        <button
          onClick={() => setDisplayMode("single-column")}
          className={displayMode === "single-column" ? "active" : ""}
        >
          全グループ一括表示
        </button>
      </div>

      {/* フィルターコントロールコンテナ */}
      <div className="filter-controls-container">
        {/* 注記の追加 */}
        <div className="filter-note">
          <p>※ 欅坂46メンバーは櫻坂46として表示されます。</p>
          <p>※ けやき坂46メンバーは日向坂46として表示されます。</p>
        </div>

        {Object.keys(groupColors).map((group) => (
          <div
            key={group}
            className="group-filter-card"
            style={{ '--group-color': groupColors[group] }}
          >
            {/* グループ全体のチェックボックス */}
            <div className="group-filter-header">
              <label>
                <input
                  type="checkbox"
                  className="custom-checkbox"
                  checked={
                    (filters[group]?.active ?? false) &&
                    (filters[group]?.graduated ?? false) &&
                    (joinPeriods[group] || []).every((period) => (filters[group]?.[period] ?? false))
                  }
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    setFilters((prevFilters) => ({
                      ...prevFilters,
                      [group]: {
                        active: isChecked,
                        graduated: isChecked,
                        ...Object.fromEntries((joinPeriods[group] || []).map((period) => [period, isChecked])),
                      },
                    }));
                  }}
                />
                <h3 style={{ color: groupColors[group] }}>{group}</h3>
              </label>
            </div>

            {/* 現役メンバー・元メンバーのフィルター */}
            <div className="status-filter-section">
              <label>
                <input
                  type="checkbox"
                  className="custom-checkbox"
                  checked={filters[group]?.active ?? false}
                  onChange={() => {
                    toggleFilter(group, "active");
                  }}
                />
                現役メンバー
              </label>
              <label>
                <input
                  type="checkbox"
                  className="custom-checkbox"
                  checked={filters[group]?.graduated ?? false}
                  onChange={() => {
                    toggleFilter(group, "graduated");
                  }}
                />
                元メンバー
              </label>
            </div>

            {/* 加入期フィルター */}
            <div className="period-filter-section">
              <label>加入期:</label>
              <div className="period-checkbox-group">
                {(joinPeriods[group] || []).map((period) => (
                  <label key={period}>
                    <input
                      type="checkbox"
                      className="custom-checkbox"
                      checked={filters[group]?.[period] ?? false}
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

      {displayMode === "multi-column" ? (
        // グループ別表示
        Object.keys(membersByYear)
          .filter((year) => {
            const hasMembers = membersByYear[year].some((member) => {
              const groupName = member.グループ名?.trim();
              if (!groupName || !filters[groupName]) return false;
              const joinPeriod = member.加入期?.match(/\d+/)?.[0] || "1";
              const isActive =
                member["卒業・辞退・契約終了日"] === "-" ||
                new Date(member["卒業・辞退・契約終了日"]) > new Date();
              return (
                (filters[groupName]?.[joinPeriod] ?? false) &&
                (
                  ((filters[groupName]?.active ?? false) && isActive) ||
                  ((filters[groupName]?.graduated ?? false) && !isActive)
                )
              );
            });
            return hasMembers;
          })
          .sort((a, b) => a - b)
          .map((year) => (
            <div key={year} style={{ marginBottom: "20px", maxWidth: "1000px", margin: "0 auto" }}>
              <h2 style={{ borderBottom: "2px solid #ccc", paddingBottom: "5px" }}>
                {year}年度生まれ
              </h2>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <GroupList members={membersByYear[year]} groupName="乃木坂46" filters={filters["乃木坂46"] || {}} />
                <GroupList members={membersByYear[year]} groupName="櫻坂46" filters={filters["櫻坂46"] || {}} />
                <GroupList members={membersByYear[year]} groupName="日向坂46" filters={filters["日向坂46"] || {}} />
              </div>
            </div>
          ))
      ) : (
        // 全メンバー一括表示
        <div style={{ width: "100%", maxWidth: "600px", margin: "0 auto" }}>
          {Object.keys(groupedAllMembersByYear)
            .sort((a, b) => a - b)
            .map((year) => (
              <div key={year} style={{ marginBottom: "20px" }}>
                <h2 style={{ borderBottom: "2px solid #ccc", paddingBottom: "5px" }}>
                  {year}年度生まれ
                </h2>
                <ul style={{ listStyle: "none", padding: 0 }}>
                  {groupedAllMembersByYear[year].map((member, index) => (
                    <MemberCard
                      key={member.key}
                      member={member}
                      displayGroupName={member.グループ名}
                    />
                  ))}
                </ul>
              </div>
            ))}
        </div>
      )}
    </Layout>
  );
};

export default MemberListByYear;