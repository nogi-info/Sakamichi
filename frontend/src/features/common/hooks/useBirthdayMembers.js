import { useState, useEffect, useMemo } from 'react';
import { getBirthdayMembers } from '../utils/memberUtils';

/**
 * メンバーリストから誕生日メンバーを計算するカスタムフック
 * @param {Array} members - 全メンバーのリスト
 * @returns {{birthdayMembersToday: Array, birthdayMembersThisMonth: Array}}
 */
export const useBirthdayMembers = (members) => {
  // useMemoを使って、このフックの再レンダリングでDateオブジェクトが再生成されないようにする
  const today = useMemo(() => new Date(), []);
  // デバッグ用: new Date() の引数を変更することで、特定の日付でテストできます
  // const today = useMemo(() => new Date('2024-06-08T12:00:00'), []);

  const [birthdayMembersToday, setBirthdayMembersToday] = useState([]);
  const [birthdayMembersThisMonth, setBirthdayMembersThisMonth] = useState([]);

  useEffect(() => {
    if (members && members.length > 0) {
      const { today: todayBdays, thisMonth: thisMonthBdays } = getBirthdayMembers(members, today);
      setBirthdayMembersToday(todayBdays);
      setBirthdayMembersThisMonth(thisMonthBdays);
    }
  }, [members, today]);

  return { birthdayMembersToday, birthdayMembersThisMonth };
};