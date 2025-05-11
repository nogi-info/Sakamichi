import React, { useEffect, useState } from "react";
import Papa from "papaparse";

const groupColors = {
  "乃木坂46": "#812990",
  "櫻坂46": "#F19DB5",
  "日向坂46": "#7CC7E8",
};

// 加入期ごとの色を生成する関数
const getJoinPeriodColor = (groupName, joinPeriod) => {
  const baseColor = groupColors[groupName];
  if (!baseColor) return "#ccc"; // デフォルト色
  const opacity = 1 - (parseInt(joinPeriod, 10) - 1) * 0.2; // 加入期ごとに色を薄くする
  return `${baseColor}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`;
};

// グループごとのリストを生成する関数
const GroupList = ({ members, groupName, filters }) => {
  return (
    <ul style={{ listStyle: "none", padding: 0, flex: 1 }}>
      {members
        .filter((member) => {
          // フィルタ条件を適用
          const joinPeriod = member.加入期?.match(/\d+/)?.[0] || "1"; // 安全に加入期を取得
          const isActive = member["卒業・辞退・契約終了日"] === "-" || new Date(member["卒業・辞退・契約終了日"]) > new Date();
          return (
            member.グループ名 === groupName &&
            filters[joinPeriod] &&
            ((filters.active && isActive) || (filters.graduated && !isActive))
          );
        })
        .map((member, index) => {
          const joinPeriod = member.加入期?.match(/\d+/)?.[0] || "1"; // 安全に加入期を取得
          return (
            <li key={index} style={{ marginBottom: "10px" }}>
              <span
                style={{
                  backgroundColor: groupColors[groupName],
                  color: "white",
                  padding: "5px 10px",
                  borderRadius: "5px",
                  marginRight: "10px",
                }}
              >
                {groupName}
              </span>
              <span
                style={{
                  backgroundColor: getJoinPeriodColor(groupName, joinPeriod),
                  color: "black",
                  padding: "5px 10px",
                  borderRadius: "5px",
                  marginRight: "10px",
                }}
              >
                {member.加入期}
              </span>
              {member.名前}（{member.生年月日}）
            </li>
          );
        })}
    </ul>
  );
};

const MemberListByYear = () => {
  const [membersByYear, setMembersByYear] = useState({});
  const [filters, setFilters] = useState({});
  const [joinPeriods, setJoinPeriods] = useState({}); // 各グループの加入期リスト

  useEffect(() => {
    // CSVファイルを読み込む
    Papa.parse("/Sakamichi/data/sakamichi_combined.csv", {
      download: true,
      header: true,
      complete: (result) => {
        const today = new Date(); // 現在日時

        // 加入期リストを動的に生成
        const periods = {};
        result.data.forEach((member) => {
          const groupName = member.グループ名?.trim(); // グループ名をトリムして空白を除去
          if (!groupName) {
            console.warn("Skipping member with empty group name:", member); // デバッグ用
            return; // グループ名が空の場合はスキップ
          }

          const joinPeriod = member.加入期?.match(/\d+/)?.[0] || "1"; // 安全に加入期を取得
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
          periods[group] = Array.from(periods[group]).sort((a, b) => parseInt(a.match(/\d+/)?.[0] || "1") - parseInt(b.match(/\d+/)?.[0] || "1")); // 加入期を昇順にソート
          periods[group].forEach((period) => {
            initialFilters[group][period] = true;
          });
        });

        // デバッグ用ログ
        console.log("Generated Filters:", initialFilters);

        setJoinPeriods(periods);
        setFilters(initialFilters);

        // 年度ごとにデータをグルーピング（4月始まり3月終わり）
        const groupedData = result.data.reduce((acc, member) => {
          const groupName = member.グループ名?.trim();
          if (!groupName) return acc; // グループ名が空の場合はスキップ

          const birthDate = new Date(member.生年月日);

          // 無効な日付をスキップ
          if (isNaN(birthDate)) {
            console.warn("Invalid Date:", member.生年月日, member); // デバッグ用
            return acc;
          }

          const year = birthDate.getMonth() + 1 >= 4 ? birthDate.getFullYear() : birthDate.getFullYear() - 1; // 4月以降はその年、3月以前は前年
          if (!acc[year]) acc[year] = [];
          acc[year].push(member);
          return acc;
        }, {});

        // 各年度内を生年月日順にソート
        Object.keys(groupedData).forEach((year) => {
          groupedData[year].sort((a, b) => new Date(a.生年月日) - new Date(b.生年月日));
        });

        setMembersByYear(groupedData);
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
    <div>
      <h1>メンバー一覧（年度別・生年月日順）</h1>
      <div style={{ marginBottom: "20px" }}>
        {Object.keys(groupColors).map((group) => ( // groupColorsのキー順でグループを表示
          <div key={group} style={{ marginBottom: "10px" }}>
            <h3>{group}</h3>
            <label>
              <input
                type="checkbox"
                checked={filters[group]?.active}
                onChange={() => toggleFilter(group, "active")}
              />
              現役メンバー
            </label>
            <label>
              <input
                type="checkbox"
                checked={filters[group]?.graduated}
                onChange={() => toggleFilter(group, "graduated")}
              />
              元メンバー
            </label>
            {joinPeriods[group]?.map((period) => ( // 昇順にソートされた加入期を表示
              <label key={period}>
                <input
                  type="checkbox"
                  checked={filters[group]?.[period]}
                  onChange={() => toggleFilter(group, period)}
                />
                {period}期生
              </label>
            ))}
          </div>
        ))}
      </div>
      {Object.keys(membersByYear)
        .sort((a, b) => a - b) // 年度順にソート
        .map((year) => (
          <div key={year} style={{ marginBottom: "20px" }}>
            <h2 style={{ borderBottom: "2px solid #ccc", paddingBottom: "5px" }}>
              {year}年度生まれ
            </h2>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <GroupList members={membersByYear[year]} groupName="乃木坂46" filters={filters["乃木坂46"]} />
              <GroupList members={membersByYear[year]} groupName="櫻坂46" filters={filters["櫻坂46"]} />
              <GroupList members={membersByYear[year]} groupName="日向坂46" filters={filters["日向坂46"]} />
            </div>
          </div>
        ))}
    </div>
  );
};

export default MemberListByYear;