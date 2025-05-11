import React, { useEffect, useState } from "react";
import Papa from "papaparse";

const groupColors = {
  "乃木坂46": "#F3E5F5", // 薄い紫
  "櫻坂46": "#FCE4EC", // 薄いピンク
  "日向坂46": "#E3F2FD", // 薄い水色
};

const MemberTable = () => {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    // CSVファイルを読み込む
    Papa.parse("/Sakamichi/data/sakamichi_combined.csv", {
      download: true,
      header: true,
      complete: (result) => {
        // 生年月日順にソート
        const sortedData = result.data.sort((a, b) => new Date(a.生年月日) - new Date(b.生年月日));
        setMembers(sortedData);
      },
    });
  }, []);

  return (
    <div>
      <h1>メンバー一覧（生年月日順）</h1>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid black", padding: "5px" }}>グループ名</th>
            <th style={{ border: "1px solid black", padding: "5px" }}>名前</th>
            <th style={{ border: "1px solid black", padding: "5px" }}>生年月日</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member, index) => (
            <tr
              key={index}
              style={{
                backgroundColor: groupColors[member.グループ名],
              }}
            >
              <td style={{ border: "1px solid black", padding: "5px" }}>{member.グループ名}</td>
              <td style={{ border: "1px solid black", padding: "5px" }}>{member.名前}</td>
              <td style={{ border: "1px solid black", padding: "5px" }}>{member.生年月日}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MemberTable;