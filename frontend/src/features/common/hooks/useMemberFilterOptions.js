import { useMemo } from 'react';

/**
 * メンバーリストから加入期と初期フィルター設定を生成するカスタムフック
 * @param {Array} allMembers - 全メンバーのリスト
 * @returns {{joinPeriods: Object, initialFilters: Object}}
 */
export const useMemberFilterOptions = (allMembers) => {
  const joinPeriods = useMemo(() => {
    const periods = {};
    allMembers.forEach((member) => {
      const groupName = member.グループ名?.trim();
      if (!groupName) return;
      const joinPeriod = member.加入期?.match(/\d+/)?.[0] || "1";
      if (!periods[groupName]) periods[groupName] = new Set();
      periods[groupName].add(joinPeriod);
    });
    Object.keys(periods).forEach((group) => {
      periods[group] = Array.from(periods[group]).sort(
        (a, b) => parseInt(a.match(/\d+/)?.[0] || "1") - parseInt(b.match(/\d+/)?.[0] || "1")
      );
    });
    return periods;
  }, [allMembers]);

  const initialFilters = useMemo(() => {
    const filters = {};
    Object.keys(joinPeriods).forEach((group) => {
      filters[group] = {
        active: true,
        graduated: true,
      };
      joinPeriods[group].forEach((period) => {
        filters[group][period] = true;
      });
    });
    return filters;
  }, [joinPeriods]);

  return { joinPeriods, initialFilters };
};