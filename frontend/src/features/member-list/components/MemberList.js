import React from "react";
import MemberCard from "./MemberCard"; // MemberCardを正しくインポートしているか確認
import { getMemberDisplayGroupName, parseDate } from "../../common/utils/memberUtils"; // 追加

const GroupList = ({ members, groupName, filters, groupMap }) => { // groupMapを追加
  return (
    <ul style={{ listStyle: "none", padding: 0, flex: 1, margin: "0 4px" }}>
      {members
        .filter((member) => {
          // GroupListに渡されるmembersは既に年度でグループ化されているが、
          // ここでさらにフィルターを適用する

          const joinPeriod = member.加入期?.match(/\d+/)?.[0] || "1";
          const graduationDate = parseDate(member["卒業・辞退・契約終了日"]); // parseDateを使用
          const isActive = member["卒業・辞退・契約終了日"] === "-" || (graduationDate && graduationDate > new Date());

          return (
            member.グループ名 === groupName &&
            filters[joinPeriod] &&
            ((filters.active && isActive) || (filters.graduated && !isActive))
          );
        })
        .map((member, index) => (
          <MemberCard key={member.key} member={member} displayGroupName={getMemberDisplayGroupName(member, groupMap, new Date())}/> // keyをmember.keyに、displayGroupNameをgetMemberDisplayGroupNameで設定
        ))}
    </ul>
  );
};

export default GroupList;