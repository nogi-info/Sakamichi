/**
 * 日付文字列をパースする
 * @param {string} str - "YYYY/MM/DD" または "YYYY-MM-DD" 形式の日付文字列
 * @returns {Date | null} パースされたDateオブジェクト、または無効な場合はnull
 */
export function parseDate(str) {
  if (!str || str === "-") return null;
  const d = new Date(str.replace(/-/g, "/"));
  return isNaN(d.getTime()) ? null : d;
}

/**
 * 生年月日文字列から年齢を計算する
 * @param {string} birthDate - "YYYY/MM/DD" 形式の生年月日
 * @returns {number | string} 年齢、または計算できない場合は '?'
 */
export const calculateAge = (birthDate) => {
  if (!birthDate || birthDate === "-") return '?';
  const today = new Date();
  const birth = parseDate(birthDate); // parseDateを使用
  if (isNaN(birth.getTime())) return '?';

  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

/**
 * 指定された日付における誕生日メンバーを抽出する
 * @param {Array} members - メンバーの配列
 * @param {Date} date - 基準日
 * @returns {{today: Array, thisMonth: Array}} - 今日の誕生日メンバーと今月の誕生日メンバー
 */
export const getBirthdayMembers = (members, date) => {
  if (!members || members.length === 0) {
    return { today: [], thisMonth: [] };
  }

  const currentMonth = date.getMonth(); // 0-11
  const currentDay = date.getDate(); // 1-31

  const todayBirthdays = [];
  const thisMonthBirthdays = [];

  members.forEach(member => {
    if (!member.生年月日 || member.生年月日 === "-") return;
    const birthDate = parseDate(member.生年月日); // parseDateを使用
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
    const dateA = parseDate(a.生年月日); // parseDateを使用
    const dateB = parseDate(b.生年月日); // parseDateを使用
    return dateA.getDate() - dateB.getDate();
  });

  return { today: todayBirthdays, thisMonth: thisMonthBirthdays };
};

/**
 * メンバーの在籍期間とグループの変遷を考慮し、指定された日付時点での正しいグループ名を返す。
 *
 * @param {Object} member - メンバーデータオブジェクト。`グループ名`, `加入日`, `卒業・辞退・契約終了日` プロパティを持つことを想定。
 * @param {Object} groupMap - グループの変遷情報を含むマップ。`useSakamichiMasterData`から取得される`groupMap`を想定。
 *   例: { "櫻坂46": [{ 旧グループ名: "欅坂46", 開始日: "YYYY/MM/DD", 終了日: "YYYY/MM/DD" }] }
 * @param {Date} targetDate - 基準となる日付オブジェクト。
 * @returns {string} 指定日付時点でのメンバーのグループ名。
 *
 * この関数は、`useSakamichiMasterData`内でメンバーオブジェクトに付与される`getCorrectGroupName`メソッドのロジックを
 * 外部化し、再利用可能にしたものです。
 */
export const getMemberDisplayGroupName = (member, groupMap, targetDate) => {
  const gradDateStr = member["卒業・辞退・契約終了日"];
  const gradDate = parseDate(gradDateStr);

  // 引数targetDateがDate型でなければパース
  const actualTargetDate = targetDate instanceof Date ? targetDate : parseDate(targetDate);
  if (!actualTargetDate) return member.グループ名; // 無効な日付なら現在のグループ名を返す

  let effectiveDateForGroupCheck = actualTargetDate;

  // 卒業日が指定されており、かつ対象日付が卒業日より後の場合、卒業日を基準とする
  // これにより、卒業後のメンバーのグループ名は卒業時点のグループ名が適用される
  if (gradDate && actualTargetDate > gradDate) {
    effectiveDateForGroupCheck = gradDate;
  }

  // グループ変遷ロジック
  const getGroupAtDate = (groupName, date) => {
    if (!groupMap[groupName] || !date) return groupName;
    for (const period of groupMap[groupName]) {
      const start = parseDate(period.開始日);
      const end = parseDate(period.終了日);
      if (start && end && date >= start && date <= end) {
        return period.旧グループ名;
      }
    }
    return groupName;
  };

  return getGroupAtDate(member.グループ名, effectiveDateForGroupCheck);
};