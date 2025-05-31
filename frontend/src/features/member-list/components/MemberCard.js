import React, { useState } from "react";
import { FaLink } from "react-icons/fa";

const groupColors = {
  "乃木坂46": "#812990",
  "櫻坂46": "#F19DB5",
  "日向坂46": "#7CC7E8",
};

const getJoinPeriodColor = (groupName, joinPeriod) => {
  const baseColor = groupColors[groupName];
  if (!baseColor) return "#ccc";
  const opacity = 1 - (parseInt(joinPeriod, 10) - 1) * 0.1;
  return `${baseColor}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`;
};

const calculateAge = (birthDate) => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

const MemberCard = ({ member, groupName, links }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const joinPeriod = member.加入期?.match(/\d+/)?.[0] || "1";
  const age = calculateAge(member.生年月日);
  const memberLinks = links.find((link) => link.名前 === member.名前) || {};
  const profileLink = memberLinks.プロフィール;
  const officialLink = memberLinks.公式HP;

  const shortGroupName = groupName.charAt(0);
  const displayJoinPeriod = `${shortGroupName}-${joinPeriod}`;

  return (
    <li
      style={{
        marginBottom: "10px",
        padding: "10px",
        borderRadius: "5px",
        backgroundColor: "#fff",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
        transition: "transform 0.2s",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "10px", // アイテム間の隙間
          width: "100%",
        }}
      >
        <span
          style={{
            backgroundColor: groupColors[groupName],
            color: "white",
            padding: "5px 10px",
            borderRadius: "5px",
            textShadow: "1px 1px 2px rgba(0, 0, 0, 0.5)",
            flexShrink: 0,
          }}
        >
          {displayJoinPeriod}
        </span>

        {/* 名前とよみをまとめる新しいdiv */}
        <div style={{
          display: "flex",
          flexDirection: "column", // 縦に並べる
          flexShrink: 1, // スペースが足りない時に縮む
          minWidth: "80px", // 最低限の幅
        }}>
          <div style={{ fontSize: "0.7em", color: "#666", lineHeight: "1.0em" }}>{member.よみ}</div> {/* よみを名前の真上に追加 */}
          <strong>{member.名前}</strong>
        </div>

        <div
          style={{
            fontSize: "1.0em",
            color: "#999",
            flexShrink: 1,
            minWidth: "130px",
            textAlign: "right",
            marginLeft: "auto",
          }}
        >
          {member.生年月日} ({age}歳)
        </div>
      </div>

      {isExpanded && ( // クリックされた場合に表示される情報
        <>
          {/* よみは常に表示になったため、ここから削除 */}
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