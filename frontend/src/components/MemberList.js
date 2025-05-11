import React, { useEffect, useState } from "react";
import Papa from "papaparse";

const groupColors = {
  "乃木坂46": "#812990",
  "櫻坂46": "#F19DB5",
  "日向坂46": "#7CC7E8",
};

const MemberListByYear = () => {
  const [membersByYear, setMembersByYear] = useState({});
  const [showActiveOnly, setShowActiveOnly] = useState(true); // 現役メンバーのみ表示するかの切り替え

  useEffect(() => {
    // CSVファイルを読み込む
    Papa.parse("/Sakamichi/data/sakamichi_combined.csv", {
      download: true,
      header: true,
      complete: (result) => {
        const today = new Date(); // 現在日時

        // 年度ごとにデータをグルーピング（4月始まり3月終わり）
        const groupedData = result.data.reduce((acc, member) => {
          const birthDate = new Date(member.生年月日);
          const graduationDate = member["卒業・辞退・契約終了日"]
            ? new Date(member["卒業・辞退・契約終了日"])
            : null;

          // 現役メンバーのみ表示する場合のフィルタリング
          if (
            showActiveOnly &&
            graduationDate &&
            graduationDate <= today // 卒業日が現在日時より前の場合はスキップ
          ) {
            return acc;
          }

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
  }, [showActiveOnly]); // showActiveOnlyが変更されたら再実行

  return (
    <div>
      <h1>メンバー一覧（年度別・生年月日順）</h1>
      <div style={{ marginBottom: "20px" }}>
        <label>
          <input
            type="checkbox"
            checked={showActiveOnly}
            onChange={() => setShowActiveOnly(!showActiveOnly)}
          />
          現役メンバーのみ表示
        </label>
      </div>
      {Object.keys(membersByYear)
        .sort((a, b) => a - b) // 年度順にソート
        .map((year) => (
          <div key={year} style={{ marginBottom: "20px" }}>
            <h2 style={{ borderBottom: "2px solid #ccc", paddingBottom: "5px" }}>
              {year}年度生まれ
            </h2>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {membersByYear[year].map((member, index) => (
                <li key={index} style={{ marginBottom: "10px" }}>
                  <span
                    style={{
                      backgroundColor: groupColors[member.グループ名],
                      color: "white",
                      padding: "5px 10px",
                      borderRadius: "5px",
                      marginRight: "10px",
                    }}
                  >
                    {member.グループ名}
                  </span>
                  {member.名前}（{member.生年月日}）
                </li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
};

export default MemberListByYear;