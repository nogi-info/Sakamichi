import React, { useEffect, useState } from "react";
import Papa from "papaparse";
import { FaLink } from "react-icons/fa"; // リンクアイコン用

const groupColors = {
  "乃木坂46": "#812990",
  "櫻坂46": "#F19DB5",
  "日向坂46": "#7CC7E8",
};

// 加入期ごとの色を生成する関数
const getJoinPeriodColor = (groupName, joinPeriod) => {
  const baseColor = groupColors[groupName];
  if (!baseColor) return "#ccc"; // デフォルト色
  const opacity = 1 - (parseInt(joinPeriod, 10) - 1) * 0.1; // 加入期ごとに色を薄くする
  return `${baseColor}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`;
};

// 年齢を計算する関数
const calculateAge = (birthDate) => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--; // 誕生日がまだ来ていない場合は年齢を1引く
  }
  return age;
};

// グループごとのリストを生成する関数
const GroupList = ({ members, groupName, filters, links }) => {
  return (
    <ul style={{ listStyle: "none", padding: 0, flex: 1 }}>
      {members
        .filter((member) => {
          // フィルタ条件を適用
          const joinPeriod = member.加入期?.match(/\d+/)?.[0] || "1";
          const isActive = member["卒業・辞退・契約終了日"] === "-" || new Date(member["卒業・辞退・契約終了日"]) > new Date();
          return (
            member.グループ名 === groupName &&
            filters[joinPeriod] &&
            ((filters.active && isActive) || (filters.graduated && !isActive))
          );
        })
        .map((member, index) => {
          const joinPeriod = member.加入期?.match(/\d+/)?.[0] || "1"; // 安全に加入期を取得
          const age = calculateAge(member.生年月日); // 年齢を計算

          // リンク情報を取得
          const memberLinks = links.find((link) => link.名前 === member.名前) || {};
          const profileLink = memberLinks.プロフィール;
          const officialLink = memberLinks.公式HP;

          return (
            <li
              key={index}
              style={{
                marginBottom: "10px",
                padding: "10px",
                borderRadius: "5px",
                backgroundColor: "#fff",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                transition: "transform 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
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
                  color: "white",
                  padding: "5px 10px",
                  borderRadius: "5px",
                  marginRight: "10px",
                  textShadow: "1px 1px 2px rgba(0, 0, 0, 0.5)", 
                }}
              >
                {member.加入期}
              </span>
              <div style={{ marginTop: "5px" }}>
                <strong>{member.名前}</strong>
                <div style={{ fontSize: "0.9em", color: "#666" }}>{member.よみ}</div> {/* よみを追加 */}
                <div style={{ fontSize: "0.8em", color: "#999", marginTop: "5px" }}>
                  生年月日: {member.生年月日}  ({age}歳) {/* 生年月日と年齢 */}
                </div>
                <div style={{ display: "flex", gap: "10px", marginTop: "5px" }}>
                  {profileLink && (
                    <a href={profileLink} target="_blank" rel="noopener noreferrer" style={{ color: "#007bff" }}>
                      <FaLink /> プロフィール
                    </a>
                  )}
                  {officialLink && (
                    <a href={officialLink} target="_blank" rel="noopener noreferrer" style={{ color: "#007bff" }}>
                      <FaLink /> 公式HP
                    </a>
                  )}
                </div>
              </div>
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
  const [links, setLinks] = useState([]); // リンク情報を保存

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
    <div style={{ padding: "20px", backgroundColor: "#f9f9f9", fontFamily: "Roboto, sans-serif" }}>
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
                {/* カスタムチェックボックス */}
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
                    backgroundColor: filters[group]?.active &&
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
            const isActive = member["卒業・辞退・契約終了日"] === "-" || new Date(member["卒業・辞退・契約終了日"]) > new Date();

            return (
              filters[groupName]?.[joinPeriod] &&
              ((filters[groupName]?.active && isActive) || (filters[groupName]?.graduated && !isActive))
            );
          });
          return hasMembers; // メンバーが存在する年度のみ表示
        })
        .sort((a, b) => a - b) // 年度順にソート
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
    </div>
  );
};

export default MemberListByYear;