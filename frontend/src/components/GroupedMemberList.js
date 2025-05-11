import React, { useEffect, useState } from "react";
import Papa from "papaparse";

const groupColors = {
  "乃木坂46": "#812990", // 紫
  "櫻坂46": "#F19DB5", // ピンク
  "日向坂46": "#7CC7E8", // 水色
};

const GroupedMemberList = () => {
  const [groupedMembers, setGroupedMembers] = useState({});

  useEffect(() => {
    // CSVファイルを読み込む
    Papa.parse("/Sakamichi/data/sakamichi_combined.csv", {
      download: true,
      header: true,
      complete: (result) => {
        // グループごとにデータを分ける
        const groupedData = result.data.reduce((acc, member) => {
          if (!acc[member.グループ名]) acc[member.グループ名] = [];
          acc[member.グループ名].push(member);
          return acc;
        }, {});

        // 各グループ内を生年月日順にソート
        Object.keys(groupedData).forEach((group) => {
          groupedData[group].sort((a, b) => new Date(a.生年月日) - new Date(b.生年月日));
        });

        setGroupedMembers(groupedData);
      },
    });
  }, []);

  return (
    <div>
      <h1>メンバー一覧（グループ別・生年月日順）</h1>
      {Object.keys(groupedMembers).map((group) => (
        <div key={group} style={{ marginBottom: "20px" }}>
          <h2 style={{ backgroundColor: groupColors[group], color: "white", padding: "10px" }}>{group}</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {groupedMembers[group].map((member, index) => (
              <li key={index} style={{ marginBottom: "5px" }}>
                {member.名前}（{member.生年月日}）
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default GroupedMemberList;