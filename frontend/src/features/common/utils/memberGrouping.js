import { parseDate } from './memberUtils';

/**
 * メンバーを年度（4月始まり）でグループ化する
 * @param {Array} members - メンバーの配列
 * @returns {Object} 年度をキーとし、その年度生まれのメンバーの配列を値とするオブジェクト
 */
export const groupMembersByFiscalYear = (members) => {
  const groupedData = members.reduce((acc, member) => {
    if (!member.生年月日 || member.生年月日 === "-") return acc;
    const birthDate = parseDate(member.生年月日);
    if (!birthDate) return acc;

    // 4月始まりの年度を計算
    // 例: 1月～3月生まれは前年の年度、4月～12月生まれは今年の年度
    const year = birthDate.getMonth() + 1 >= 4 ? birthDate.getFullYear() : birthDate.getFullYear() - 1;

    if (!acc[year]) acc[year] = [];
    acc[year].push(member);
    return acc;
  }, {});

  // 各年度内のメンバーを誕生日順にソート
  Object.keys(groupedData).forEach((year) => {
    groupedData[year].sort((a, b) => parseDate(a.生年月日).getTime() - parseDate(b.生年月日).getTime());
  });
  return groupedData;
};