import React, { useMemo } from "react";
import Layout from "../../../styles/Layout";
import MemberCard from "../../member-list/components/MemberCard";
import './Home.css';
import { useSakamichiMasterDataContext } from "../../common/SakamichiMasterDataContext";
import { useBirthdayMembers } from "../../common/hooks/useBirthdayMembers";
import { getMemberDisplayGroupName } from "../../common/utils/memberUtils"; // 追加

const Home = () => {
  // マスターデータをContextから取得
  const { data, loading, error } = useSakamichiMasterDataContext();

  // members, links, groupDataをマスターデータから取得
  const allMembers = useMemo(() => (data && data.members) ? data.members : [], [data]);
  const links = allMembers; // 各メンバーのリンク情報はmembersに含まれているため
  const groupData = useMemo(() => {
    // groupMap: { グループ名: [{旧グループ名, 開始日, 終了日}, ...] }
    if (!data || !data.groupMap) return [];
    return Object.entries(data.groupMap).flatMap(([group, arr]) =>
      arr.map(period => ({
        グループ名: group,
        旧グループ名: period.旧グループ名,
        開始日: period.開始日,
        終了日: period.終了日
      }))
    );
  }, [data]);

  // 誕生日メンバーをカスタムフックで取得
  const { birthdayMembersToday, birthdayMembersThisMonth } = useBirthdayMembers(allMembers);

  if (loading) {
    return <Layout><div>Loading...</div></Layout>;
  }
  if (error || !data) {
    return <Layout><div>データの読み込みに失敗しました</div></Layout>;
  }

  return (
    <Layout>
      <div className="home-container">
        <div className="home-intro-card">
          <h1 className="home-title">坂道グループ情報サイト</h1>
          <p className="home-description">
            坂道ファンが趣味で作りました<br />
          </p>
          <p className="home-disclaimer">
            ※ 本サイトはファンサイトであり、掲載されている情報が必ずしも正確であるとは限りません。<br />
            予めご了承ください。
          </p>
        </div>

        {/* 本日誕生日のメンバー表示 */}
        {birthdayMembersToday.length > 0 && (
          <div className="birthday-section today-birthday-section">
            <h2 className="section-title">本日誕生日！おめでとう！</h2>
            <ul className="member-card-list">
              {birthdayMembersToday.map((member) => (
                <MemberCard
                  key={member.key}
                  member={member} 
                  displayGroupName={getMemberDisplayGroupName(member, data.groupMap, new Date())} // 変更
                  isBirthdayToday={true}
                  initialExpanded={true}
                />
              ))}
            </ul>
          </div>
        )}

        {/* 今月誕生月のメンバー表示 */}
        {birthdayMembersThisMonth.length > 0 && (
          <div className="birthday-section this-month-birthday-section">
            <h2 className="section-title">今月誕生日（{new Date().getMonth() + 1}月）</h2>
            <ul className="member-card-list">
              {birthdayMembersThisMonth.map((member, index) => (
                <MemberCard
                  key={member.key}
                  member={member} 
                  displayGroupName={getMemberDisplayGroupName(member, data.groupMap, new Date())} // 変更
                />
              ))}
            </ul>
          </div>
        )}

        {/* 誕生日メンバーがいない場合のメッセージ */}
        {birthdayMembersToday.length === 0 && birthdayMembersThisMonth.length === 0 && (
          <div className="birthday-section no-birthday-section">
            <p className="no-birthday-message">今月誕生日を迎えるメンバーはいません。</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Home;
