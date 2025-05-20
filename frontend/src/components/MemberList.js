import React from "react";
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

// ★ GroupListのみをエクスポート
const GroupList = ({ members, groupName, filters, links }) => {
  return (
    <ul style={{ listStyle: "none", padding: 0, flex: 1 }}>
      {members
        .filter((member) => {
          const joinPeriod = member.加入期?.match(/\d+/)?.[0] || "1";
          const isActive = member["卒業・辞退・契約終了日"] === "-" || new Date(member["卒業・辞退・契約終了日"]) > new Date();
          return (
            member.グループ名 === groupName &&
            filters[joinPeriod] &&
            ((filters.active && isActive) || (filters.graduated && !isActive))
          );
        })
        .map((member, index) => {
          const joinPeriod = member.加入期?.match(/\d+/)?.[0] || "1";
          const age = calculateAge(member.生年月日);
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
                <div style={{ fontSize: "0.9em", color: "#666" }}>{member.よみ}</div>
                <div style={{ fontSize: "0.8em", color: "#999", marginTop: "5px" }}>
                  生年月日: {member.生年月日}  ({age}歳)
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

export default GroupList;