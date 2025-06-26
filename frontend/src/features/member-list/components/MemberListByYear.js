import React, { useMemo, useState } from "react";
import GroupList from "./MemberList";
import MemberCard from "./MemberCard";
import Layout from "../../../styles/Layout"; // Layoutは共通なのでそのまま
import './MemberListByYear.css';
import { useSakamichiMasterDataContext } from "../../common/SakamichiMasterDataContext";
import { useMemberFilterOptions } from "../../common/hooks/useMemberFilterOptions"; // 新しいフック
import { useMemberFilteringAndSorting } from "../../common/hooks/useMemberFilteringAndSorting"; // 新しいフック
import { groupMembersByFiscalYear } from "../../common/utils/memberGrouping"; // 新しいユーティリティ
import { getMemberDisplayGroupName } from "../../common/utils/memberUtils"; // getMemberDisplayGroupNameをインポート

const groupColors = {
  "乃木坂46": "#812990",
  "櫻坂46": "#F19DB5",
  "日向坂46": "#7CC7E8",
};

const MemberListByYear = () => {
  const { data, loading, error } = useSakamichiMasterDataContext();
  const [displayMode, setDisplayMode] = useState("multi-column");

  const allMembers = useMemo(() => (data && data.members) ? data.members : [], [data]);
  const groupMap = data?.groupMap || {}; // groupMapも取得

  // フィルターオプションを生成するフック
  const { joinPeriods, initialFilters } = useMemberFilterOptions(allMembers);

  // フィルターとソートロジックを管理するフック
  const { filters, setFilters, toggleFilter, filteredMembers } = useMemberFilteringAndSorting(
    allMembers,
    groupMap,
    initialFilters
  );

  // フィルタリングされたメンバーを年度別にグループ化
  // membersByYear は GroupList に渡すための、全メンバーからフィルタリングされたものを年度別にグループ化したもの
  const membersByYear = useMemo(() => { // allMembersから直接グループ化
    return groupMembersByFiscalYear(allMembers);
  }, [allMembers]);

  // sortedAndFilteredAllMembers は全グループ一括表示用
  // useMemberFilteringAndSorting から返される filteredMembers をそのまま使用
  const sortedAndFilteredAllMembers = filteredMembers;

  // 全グループ一括表示用に、フィルタリングされたメンバーを年度別にグループ化
  const groupedAllMembersByYear = useMemo(() => {
    return groupMembersByFiscalYear(sortedAndFilteredAllMembers);
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
          // membersByYearは全メンバーを年度別にグループ化したものなので、
          // ここでフィルターを適用して表示する年度を決定する
          .filter(year => {
            // その年度のメンバーが、現在のフィルター条件で一人でも表示されるかチェック
            return membersByYear[year].some(member =>
              filteredMembers.includes(member) // filteredMembersに含まれているか
            );
          })
          .sort((a, b) => a - b)
          .map((year) => (
            <div key={year} style={{ marginBottom: "20px", maxWidth: "1000px", margin: "0 auto" }}>
              <h2 style={{ borderBottom: "2px solid #ccc", paddingBottom: "5px" }}>
                {year}年度生まれ
              </h2>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <GroupList members={membersByYear[year]} groupName="乃木坂46" filters={filters["乃木坂46"] || {}} groupMap={groupMap} />
                <GroupList members={membersByYear[year]} groupName="櫻坂46" filters={filters["櫻坂46"] || {}} groupMap={groupMap} />
                <GroupList members={membersByYear[year]} groupName="日向坂46" filters={filters["日向坂46"] || {}} groupMap={groupMap} />
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
                      displayGroupName={getMemberDisplayGroupName(member, groupMap, new Date())} // 変更
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