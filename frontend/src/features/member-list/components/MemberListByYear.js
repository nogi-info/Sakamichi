import React, { useEffect, useState, useMemo } from "react";
import Papa from "papaparse";
import GroupList from "./MemberList";
import MemberCard from "./MemberCard";
import Layout from "../../../styles/Layout";
import './MemberListByYear.css'; // 新しいCSSファイルをインポート

const groupColors = {
  "乃木坂46": "#812990",
  "櫻坂46": "#F19DB5",
  "日向坂46": "#7CC7E8",
};

const MemberListByYear = () => {
  const [membersByYear, setMembersByYear] = useState({});
  const [allMembers, setAllMembers] = useState([]); // 全メンバーを保持する新しいstate
  const [filters, setFilters] = useState({});
  const [joinPeriods, setJoinPeriods] = useState({});
  const [links, setLinks] = useState([]);
  const [displayMode, setDisplayMode] = useState("multi-column"); // 'multi-column' または 'single-column'

  useEffect(() => {
    // メンバー情報を読み込む
    Papa.parse("/Sakamichi/data/sakamichi_combined.csv", {
      download: true,
      header: true,
      complete: (result) => {
        const today = new Date();
        const parsedMembers = result.data.filter(member => member.名前 && member.グループ名 && member.生年月日); // 不完全なデータをフィルタリング

        // 全メンバーを保持
        setAllMembers(parsedMembers);

        // 加入期リストを動的に生成
        const periods = {};
        parsedMembers.forEach((member) => {
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
        const groupedData = parsedMembers.reduce((acc, member) => {
          const groupName = member.グループ名?.trim();
          if (!groupName) return acc;
          const birthDate = new Date(member.生年月日);
          if (isNaN(birthDate.getTime())) return acc; // 無効な日付をスキップ
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

  // 全グループをまとめて生年月日順にソートし、フィルターを適用するMemoizedリスト
  // 今回は、年度ごとにグループ化する必要があるので、ここでのソートは生年月日にのみ絞り込みます。
  const sortedAndFilteredAllMembers = useMemo(() => {
    let filteredMembers = allMembers.filter((member) => {
      const groupName = member.グループ名?.trim();
      // filters[groupName] が undefined の場合でも安全にアクセスできるように修正
      if (!groupName || !filters[groupName]) return false;

      const joinPeriod = member.加入期?.match(/\d+/)?.[0] || "1";
      const isActive =
        member["卒業・辞退・契約終了日"] === "-" ||
        new Date(member["卒業・辞退・契約終了日"]) > new Date();

      return (
        // filters[groupName]?.[joinPeriod] が undefined の場合でも false を返すように修正
        (filters[groupName]?.[joinPeriod] ?? false) &&
        (
          ((filters[groupName]?.active ?? false) && isActive) || 
          ((filters[groupName]?.graduated ?? false) && !isActive)
        )
      );
    });

    // 生年月日順にソート
    filteredMembers.sort((a, b) => new Date(a.生年月日) - new Date(b.生年月日));
    return filteredMembers;
  }, [allMembers, filters]);

  // 全メンバーを年度ごとにグループ化するMemoizedオブジェクト
  const groupedAllMembersByYear = useMemo(() => {
    return sortedAndFilteredAllMembers.reduce((acc, member) => {
      const birthDate = new Date(member.生年月日);
      // 4月始まり3月終わりの年度を計算
      const year = birthDate.getMonth() + 1 >= 4 ? birthDate.getFullYear() : birthDate.getFullYear() - 1;
      if (!acc[year]) {
        acc[year] = [];
      }
      acc[year].push(member);
      return acc;
    }, {});
  }, [sortedAndFilteredAllMembers]);


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
            style={{ '--group-color': groupColors[group] }} // CSS変数としてグループカラーを渡す
          >
            {/* グループ全体のチェックボックス */}
            <div className="group-filter-header">
              <label>
                <input
                  type="checkbox"
                  className="custom-checkbox" // カスタムチェックボックス用のクラス
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
                  className="custom-checkbox" // カスタムチェックボックス用のクラス
                  checked={filters[group]?.active ?? false}
                  onChange={() => toggleFilter(group, "active")}
                />
                現役メンバー
              </label>
              <label>
                <input
                  type="checkbox"
                  className="custom-checkbox" // カスタムチェックボックス用のクラス
                  checked={filters[group]?.graduated ?? false}
                  onChange={() => toggleFilter(group, "graduated")}
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
                      className="custom-checkbox" // カスタムチェックボックス用のクラス
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
        // グループ別表示（現状と同様）
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
            <div key={year} style={{ marginBottom: "20px", maxWidth:"1000px", margin: "0 auto" }}>
              <h2 style={{ borderBottom: "2px solid #ccc", paddingBottom: "5px" }}>
                {year}年度生まれ
              </h2>
              <div style={{ display: "flex", justifyContent: "space-between"}}>
                <GroupList members={membersByYear[year]} groupName="乃木坂46" filters={filters["乃木坂46"] || {}} links={links} />
                <GroupList members={membersByYear[year]} groupName="櫻坂46" filters={filters["櫻坂46"] || {}} links={links} />
                <GroupList members={membersByYear[year]} groupName="日向坂46" filters={filters["日向坂46"] || {}} links={links} />
              </div>
            </div>
          ))
      ) : (
        // 全メンバー一括表示（生年月日順、年度別区切り）
        <div style={{ width: "100%", maxWidth: "600px", margin: "0 auto" }}>
          {Object.keys(groupedAllMembersByYear)
            .sort((a, b) => a - b) // 年度でソート
            .map((year) => (
              <div key={year} style={{ marginBottom: "20px" }}>
                <h2 style={{ borderBottom: "2px solid #ccc", paddingBottom: "5px" }}>
                  {year}年度生まれ
                </h2>
                <ul style={{ listStyle: "none", padding: 0 }}>
                  {groupedAllMembersByYear[year].map((member, index) => (
                    <MemberCard
                      key={`${member.名前}-${index}`}
                      member={member}
                      groupName={member.グループ名}
                      links={links}
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
