import React from "react";
import MemberCard from "./MemberCard"; // MemberCardを正しくインポートしているか確認

const GroupList = ({ members, groupName, filters}) => {
  return (
    <ul style={{ listStyle: "none", padding: 0, flex: 1, margin: "0 4px" }}>
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
        .map((member, index) => (
          <MemberCard key={`${member.key}_${index}`} member={member} displayGroupName={groupName}/>
        ))}
    </ul>
  );
};

export default GroupList;