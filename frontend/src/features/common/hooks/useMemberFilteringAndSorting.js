import { useState, useMemo } from 'react';
import { getMemberDisplayGroupName, parseDate } from '../utils/memberUtils';

/**
 * メンバーリストのフィルタリングとソートロジックを管理するカスタムフック
 * @param {Array} allMembers - 全メンバーのリスト
 * @param {Object} groupMap - グループの変遷情報
 * @param {Object} initialFilters - 初期フィルター設定
 * @returns {{
 *   filters: Object,
 *   setFilters: Function,
 *   toggleFilter: Function,
 *   filteredMembers: Array
 * }}
 */
export const useMemberFilteringAndSorting = (allMembers, groupMap, initialFilters) => {
  const [filters, setFilters] = useState(initialFilters);

  const toggleFilter = (group, key) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      [group]: {
        ...prevFilters[group],
        [key]: !prevFilters[group][key],
      },
    }));
  };

  const filteredMembers = useMemo(() => {
    let currentFilteredMembers = allMembers.filter((member) => {
      const groupName = member.グループ名?.trim();
      if (!groupName || !filters[groupName]) return false;

      const joinPeriod = member.加入期?.match(/\d+/)?.[0] || "1";
      const isActive =
        member["卒業・辞退・契約終了日"] === "-" ||
        (parseDate(member["卒業・辞退・契約終了日"]) && parseDate(member["卒業・辞退・契約終了日"]) > new Date());

      // 加入期フィルター
      const isPeriodFiltered = filters[groupName]?.[joinPeriod] ?? false;
      if (!isPeriodFiltered) return false;

      // 現役・卒業フィルター
      const isActiveFiltered = (filters[groupName]?.active ?? false) && isActive;
      const isGraduatedFiltered = (filters[groupName]?.graduated ?? false) && !isActive;

      return isActiveFiltered || isGraduatedFiltered;
    });

    // ソートはMemberListByYear.jsのmembersByYearとsortedAndFilteredAllMembersで別々に適用されているため、
    // ここではフィルタリングのみに集中し、ソートは呼び出し元で行う。
    // ただし、MemberListByYear.jsのsortedAndFilteredAllMembersはここでソートされているので、
    // そのロジックをここに含める。
    currentFilteredMembers.sort((a, b) => {
      const dateA = parseDate(a.生年月日);
      const dateB = parseDate(b.生年月日);
      if (!dateA || !dateB) return 0; // 無効な日付はソートしない
      return dateA.getTime() - dateB.getTime();
    });

    return currentFilteredMembers;

  }, [allMembers, groupMap, filters]); // groupMapはgetMemberDisplayGroupNameで使われる可能性があるので依存に含める

  // allMembersが更新されたときにinitialFiltersを再適用する
  // (useMemberFilterOptionsがallMembersに依存しているため、initialFiltersもallMembersに依存する)
  // ただし、useStateの初期値は初回レンダリング時のみ適用されるため、
  // フィルターオプションが動的に変わりうる場合は、useEffectでfiltersを更新する必要がある。
  // 今回はinitialFiltersがuseMemoでallMembersに依存しているので、
  // allMembersが変わればinitialFiltersも変わり、それがuseStateの初期値として使われる。
  // しかし、filters state自体はallMembersの変更では自動的に更新されない。
  // ユーザーがフィルターを操作した後にallMembersが変わった場合、フィルター状態がリセットされるのが望ましいか、
  // それとも維持されるのが望ましいかによって実装が変わる。
  // 現状はallMembersが変わってもfiltersは維持される。
  // もしallMembersが変わったらフィルターをリセットしたい場合は、useEffectでsetFilters(initialFilters)を呼ぶ。

  return { filters, setFilters, toggleFilter, filteredMembers };
};