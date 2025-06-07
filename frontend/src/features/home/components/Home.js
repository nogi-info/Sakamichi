import React, { useEffect, useState } from "react";
import Papa from "papaparse";
import Layout from "../../../styles/Layout";
import MemberCard from "../../member-list/components/MemberCard"; // MemberCardコンポーネントをインポート
import './Home.css'; // 新しいCSSファイルをインポート

const CSV_COMBINED_PATH = "/Sakamichi/data/sakamichi_combined.csv";
const CSV_LINK_PATH = "/Sakamichi/data/sakamichi_link.csv";
const GROUP_CSV_FILE_PATH = "/Sakamichi/data/sakamichi_group.csv"; // グループCSVパスを追加

const Home = () => {
  const [allMembers, setAllMembers] = useState([]);
  const [links, setLinks] = useState([]);
  const [groupData, setGroupData] = useState([]); // groupDataのstateを追加
  const [birthdayMembersToday, setBirthdayMembersToday] = useState([]);
  const [birthdayMembersThisMonth, setBirthdayMembersThisMonth] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMemberData = async () => {
      try {
        // メンバー情報を読み込む
        const combinedResponse = await fetch(CSV_COMBINED_PATH);
        const combinedText = await combinedResponse.text();
        const combinedResult = Papa.parse(combinedText, { header: true, skipEmptyLines: true });
        const parsedMembers = combinedResult.data.filter(member => member.名前 && member.グループ名 && member.生年月日);

        // リンク情報を読み込む
        const linkResponse = await fetch(CSV_LINK_PATH);
        const linkText = await linkResponse.text();
        const linkResult = Papa.parse(linkText, { header: true, skipEmptyLines: true });

        // グループ情報を読み込む
        const groupResponse = await fetch(GROUP_CSV_FILE_PATH);
        const groupText = await groupResponse.text();
        const groupResult = Papa.parse(groupText, { header: true, skipEmptyLines: true });
        
        setAllMembers(parsedMembers);
        setLinks(linkResult.data);
        setGroupData(groupResult.data); // groupDataをstateにセット
        setLoading(false);
      } catch (error) {
        console.error("CSVファイルの読み込み中にエラーが発生しました:", error);
        setLoading(false);
      }
    };

    fetchMemberData();
  }, []);

  useEffect(() => {
    if (allMembers.length === 0) return;

    const today = new Date();
    const currentMonth = today.getMonth(); // 0-11
    const currentDay = today.getDate(); // 1-31

    const todayBirthdays = [];
    const thisMonthBirthdays = [];

    allMembers.forEach(member => {
      const birthDate = new Date(member.生年月日);
      if (isNaN(birthDate.getTime())) return;

      const memberMonth = birthDate.getMonth();
      const memberDay = birthDate.getDate();

      // 現役・元メンバー問わず、誕生日が今月のメンバーを抽出
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

  }, [allMembers]); // allMembersが更新されたときに再計算

  if (loading) {
    return <Layout><div>Loading...</div></Layout>;
  }

  return (
    <Layout>
      <div className="home-container">
        <div className="home-intro-card">
          <h1 className="home-title">坂道グループ情報サイト</h1>
          <p className="home-description">
            坂道グループの現役メンバー・元メンバーの情報をまとめました。<br />
            上部メニューから各機能ページへ移動できます。
          </p>
          {/* 免責事項の追加 */}
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
              {birthdayMembersToday.map((member, index) => (
                <MemberCard 
                  key={member.名前 + index} 
                  member={member} 
                  groupName={member.グループ名} 
                  links={links} 
                  groupData={groupData} // groupDataを渡す
                  isBirthdayToday={true} // 本日誕生日のフラグを渡す
                  initialExpanded={true} // 初期状態で展開
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
                  key={member.名前 + index} 
                  member={member} 
                  groupName={member.グループ名} 
                  links={links}
                  groupData={groupData} // groupDataを渡す
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
