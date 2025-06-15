import React, { useEffect, useState, useMemo } from "react";
import Layout from "../../../styles/Layout";
import MemberCard from "../../member-list/components/MemberCard";
import './Home.css';
import { useSakamichiMasterDataContext } from "../../common/SakamichiMasterDataContext";

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

  // 誕生日メンバーの抽出
  const [birthdayMembersToday, setBirthdayMembersToday] = useState([]);
  const [birthdayMembersThisMonth, setBirthdayMembersThisMonth] = useState([]);

  useEffect(() => {
    if (!allMembers.length) return;

    const today = new Date();
    const currentMonth = today.getMonth(); // 0-11
    const currentDay = today.getDate(); // 1-31

    // デバッグ用
    // const currentMonth = 5;
    // const currentDay = 8;

    const todayBirthdays = [];
    const thisMonthBirthdays = [];

    allMembers.forEach(member => {
      const birthDate = new Date(member.生年月日);
      if (isNaN(birthDate.getTime())) return;

      const memberMonth = birthDate.getMonth();
      const memberDay = birthDate.getDate();

      if (memberMonth === currentMonth) {
        thisMonthBirthdays.push(member);
        if (memberDay === currentDay) {
          todayBirthdays.push(member);
        }
      }
    });

    thisMonthBirthdays.sort((a, b) => {
      const dateA = new Date(a.生年月日);
      const dateB = new Date(b.生年月日);
      return dateA.getDate() - dateB.getDate();
    });

    setBirthdayMembersToday(todayBirthdays);
    setBirthdayMembersThisMonth(thisMonthBirthdays);

  }, [allMembers]);

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
                  displayGroupName={member.getCorrectGroupName(new Date())}
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
                  displayGroupName={member.getCorrectGroupName(new Date())} 
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
