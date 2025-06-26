import React, { useState } from "react";
import { FaLink } from "react-icons/fa";
import { calculateAge } from "../../common/utils/memberUtils";

const groupColors = {
  "乃木坂46": "#812990",
  "櫻坂46": "#F19DB5",
  "日向坂46": "#7CC7E8",
  "欅坂46": "#5eb954", // 欅坂46を追加
  "けやき坂46": "#5eb954", // けやき坂46を追加
};

const getJoinPeriodColor = (groupName, joinPeriod) => {
  const baseColor = groupColors[groupName];
  if (!baseColor) return "#ccc";
  const opacity = 1 - (parseInt(joinPeriod, 10) - 1) * 0.1;
  return `${baseColor}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`;
};

// isBirthdayToday と groupData プロパティを追加
const MemberCard = ({ member, displayGroupName = member.グループ名, isBirthdayToday = false, initialExpanded = false}) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const joinPeriod = member.加入期?.match(/\d+/)?.[0] || "1";
  const age =  calculateAge(member.生年月日);
  const profileLink = member.プロフィール;
  const officialLink = member.公式HP;
  
  // 置換されたグループ名を使用して最初の文字と色を決定
  const shortGroupName = displayGroupName.charAt(0);
  const displayJoinPeriod = `${shortGroupName}-${joinPeriod}`;

  return (
    <li
      className={`member-card ${isBirthdayToday ? 'birthday-today' : ''}`}
      style={{
        backgroundColor: "#fff",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
        transition: "transform 0.2s",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        padding: "15px", // MemberCardが単独で表示されるためパディングを追加
        borderRadius: "10px", // 角を丸く
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "10px",
          width: "100%",
        }}
      >
        <span
          style={{
            backgroundColor: groupColors[displayGroupName], // 置換されたグループ名で色を決定
            color: "white",
            padding: "5px 10px",
            borderRadius: "5px",
            textShadow: "1px 1px 2px rgba(0, 0, 0, 0.5)",
            flexShrink: 0,
          }}
        >
          {displayJoinPeriod}
        </span>

        <div style={{
          display: "flex",
          flexDirection: "column",
          flexShrink: 1,
          // minWidth: "80px", // 削除またはコメントアウト
        }}>
          <div style={{ fontSize: "0.6em", color: "#666", lineHeight: "0.9em" }}>{member.よみ}</div>
          <strong>{member.名前}</strong>
        </div>

        <div
          style={{
            fontSize: "0.9em",
            color: "#999",
            flexShrink: 1,
            textAlign: "right",
            marginLeft: "auto",
            display: "flex", // flexコンテナにする
            flexWrap: "wrap", // 子要素のspanが折り返せるようにする
            justifyContent: "flex-end", // 右寄せを維持
            gap: "0.2em", // 生年月日と年齢の間の小さな隙間
          }}
        >
          <span style={{ whiteSpace: "nowrap" }}>{member.生年月日}</span>
          <span style={{ whiteSpace: "nowrap" }}>({age}歳)</span>
        </div>
      </div>

      {isExpanded && (
        <>
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
        </>
      )}
    </li>
  );
};

export default MemberCard;
