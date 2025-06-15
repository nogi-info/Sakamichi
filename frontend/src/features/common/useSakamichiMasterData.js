import { useEffect, useState } from "react";
import Papa from "papaparse";

// グローバルキャッシュ
let cachedMasterData = null;
let cachedError = null;
let cachedPromise = null;

// 日付パース関数
function parseDate(str) {
  if (!str || str === "-") return null;
  // 例: "2020/01/01" or "2020-01-01"
  const d = new Date(str.replace(/-/g, "/"));
  return isNaN(d) ? null : d;
}

export function useSakamichiMasterData() {
  const [data, setData] = useState(cachedMasterData);
  const [error, setError] = useState(cachedError);
  const [loading, setLoading] = useState(!cachedMasterData && !cachedError);

  useEffect(() => {
    if (cachedMasterData || cachedError) {
      setData(cachedMasterData);
      setError(cachedError);
      setLoading(false);
      return;
    }
    if (!cachedPromise) {
      cachedPromise = new Promise((resolve, reject) => {
        // 1. combined.csv
        Papa.parse("/Sakamichi/data/sakamichi_combined.csv", {
          download: true,
          header: true,
          complete: (combinedResult) => {
            const combined = combinedResult.data.filter(
              row =>
                row.グループ名 ||
                row.名前 ||
                row.よみ ||
                row.生年月日 ||
                row.出身地 ||
                row.血液型 ||
                row.身長 ||
                row.加入期 ||
                row["卒業・辞退・契約終了日"] ||
                row["現在の所属事務所ほか"]
            );
            // 2. combined_add.csv
            Papa.parse("/Sakamichi/data/sakamichi_combined_add.csv", {
              download: true,
              header: true,
              complete: (addResult) => {
                const addList = addResult.data.filter(
                  row => row.グループ名 && row.名前 && row.加入期
                );
                const addMap = {};
                addList.forEach(row => {
                  addMap[`${row.グループ名}_${row.名前}`] = row.加入期;
                });
                // 3. link.csv
                Papa.parse("/Sakamichi/data/sakamichi_link.csv", {
                  download: true,
                  header: true,
                  complete: (linkResult) => {
                    const linkList = linkResult.data.filter(
                      row => row.グループ名 && row.名前
                    );
                    const linkMap = {};
                    linkList.forEach(row => {
                      linkMap[`${row.グループ名}_${row.名前}`] = row;
                    });

                    // membersに修正加入期とリンク情報を付与
                    const merged = combined.map(m => {
                      const key = `${m.グループ名}_${m.名前}`;
                      const 修正加入期 = addMap[key] || "";
                      const linkInfo = linkMap[key] || {};
                      return {
                        ...m,
                        修正加入期,
                        ...linkInfo,
                      };
                    });

                    // 4. start.csv
                    Papa.parse("/Sakamichi/data/sakamichi_start.csv", {
                      download: true,
                      header: true,
                      complete: (startResult) => {
                        const startList = startResult.data.filter(
                          row => row.グループ名 && row.加入期 && row.加入記念日
                        );
                        // グループ名＋修正加入期で加入記念日を取得できるマップを作成
                        const startMap = {};
                        startList.forEach(row => {
                          const key = `${row.グループ名}_${row.加入期}`;
                          startMap[key] = row.加入記念日;
                        });

                        // 5. group.csv
                        Papa.parse("/Sakamichi/data/sakamichi_group.csv", {
                          download: true,
                          header: true,
                          complete: (groupResult) => {
                            const groupList = groupResult.data.filter(
                              row => row.グループ名 && row.旧グループ名 && row.開始日 && row.終了日
                            );
                            // グループ名をキーに、旧グループ名・開始日・終了日を配列で持つマップ
                            const groupMap = {};
                            groupList.forEach(row => {
                              if (!groupMap[row.グループ名]) groupMap[row.グループ名] = [];
                              groupMap[row.グループ名].push({
                                旧グループ名: row.旧グループ名,
                                開始日: row.開始日,
                                終了日: row.終了日
                              });
                            });

                            // 6. discography
                            Papa.parse("/Sakamichi/data/sakamichi_combined_discography.csv", {
                              download: true,
                              header: true,
                              complete: (discographyResult) => {
                                const discographyList = discographyResult.data.filter(
                                  row => row.グループ名 && row.タイトル && row.リリース日
                                );

                                // --- 年表データ生成 ---
                                // eventMap: 日付文字列をキー、値はイベント配列
                                const eventMap = {};

                                // メンバー加入イベント
                                startList.forEach((row) => {
                                  const dateStr = row.加入記念日;
                                  const parsedDate = parseDate(dateStr);
                                  if (parsedDate) {
                                    if (!eventMap[dateStr]) eventMap[dateStr] = [];
                                    eventMap[dateStr].push({
                                      group: row.グループ名,
                                      period: row.加入期,
                                      date: parsedDate,
                                      type: "member_join",
                                    });
                                  }
                                });

                                // ディスコグラフィーイベント
                                discographyList.forEach((row) => {
                                  const dateStr = row.リリース日;
                                  const parsedDate = parseDate(dateStr);
                                  if (parsedDate) {
                                    if (!eventMap[dateStr]) eventMap[dateStr] = [];
                                    eventMap[dateStr].push({
                                      group: row.グループ名,
                                      date: parsedDate,
                                      title: row.タイトル,
                                      type: "discography_release",
                                    });
                                  }
                                });

                                // グループ名の変換処理も配列に対応
                                Object.entries(eventMap).forEach(([dateStr, events]) => {
                                  events.forEach((val) => {
                                    const eventDate = val.date;
                                    groupList.forEach((period) => {
                                      const start = parseDate(period.開始日);
                                      const end = parseDate(period.終了日);
                                      if (
                                        period.旧グループ名 &&
                                        period.グループ名 === val.group &&
                                        start &&
                                        end &&
                                        eventDate >= start &&
                                        eventDate <= end
                                      ) {
                                        val.group = period.旧グループ名;
                                      }
                                    });
                                  });
                                });

                                // eventMapをMasterDataに追加
                                // members["グループ名"]は乃木坂46/櫻坂46/日向坂46
                                // members["修正加入期"]は合同オーディションの新X期、他特殊加入対応
                                const masterData = {
                                  members: merged.map(m => ({
                                    key : `${m.グループ名}_${m.名前}`,
                                    ...m,
                                    getCorrectGroupName(date) {
                                      // "卒業・辞退・契約終了日"のパース
                                      const gradDateStr = m["卒業・辞退・契約終了日"];
                                      const gradDate = gradDateStr && gradDateStr !== "-" ? parseDate(gradDateStr) : null;

                                      // 引数dateがDate型でなければパース
                                      const targetDate = date instanceof Date ? date : parseDate(date);

                                      // 卒業日が指定されていない場合、既存ロジックでdate時点のグループ名
                                      if (!gradDate) {
                                        return masterData.getCorrectGroupName(m.グループ名, targetDate);
                                      }

                                      // 卒業日が指定されている場合
                                      if (gradDate < targetDate) {
                                        // 卒業日がdateより前 → 卒業日時点のグループ名
                                        return masterData.getCorrectGroupName(m.グループ名, gradDate);
                                      } else {
                                        // 卒業日がdateより後 → date時点のグループ名
                                        return masterData.getCorrectGroupName(m.グループ名, targetDate);
                                      }
                                    }
                                  })),
                                  startMap,
                                  groupMap,
                                  eventMap,
                                  getMemberInfo: (group, name) =>
                                    merged.find(m => m.グループ名 === group && m.名前 === name),
                                  getCorrectGroupName: (group, date) => {
                                    if (!groupMap[group] || !date) return group;
                                    for (const period of groupMap[group]) {
                                      const start = parseDate(period.開始日);
                                      const end = parseDate(period.終了日);
                                      if (start && end && date >= start && date <= end) {
                                        return period.旧グループ名;
                                      }
                                    }
                                    return group;
                                  },
                                  calculateAge : (member) => {
                                    const today = new Date();
                                    const birth = new Date(member.生年月日);
                                    let age = today.getFullYear() - birth.getFullYear();
                                    const monthDiff = today.getMonth() - birth.getMonth();
                                    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
                                      age--;
                                    }
                                    return age;
                                  }
                                };
                                cachedMasterData = masterData;
                                setData(masterData);
                                setLoading(false);
                                resolve(masterData);
                              },
                              error: (err) => {
                                cachedError = err;
                                setError(err);
                                setLoading(false);
                                reject(err);
                              }
                            });
                          },
                          error: (err) => {
                            cachedError = err;
                            setError(err);
                            setLoading(false);
                            reject(err);
                          }
                        });
                      },
                      error: (err) => {
                        cachedError = err;
                        setError(err);
                        setLoading(false);
                        reject(err);
                      }
                    });
                  },
                  error: (err) => {
                    cachedError = err;
                    setError(err);
                    setLoading(false);
                    reject(err);
                  }
                });
              },
              error: (err) => {
                cachedError = err;
                setError(err);
                setLoading(false);
                reject(err);
              }
            });
          },
          error: (err) => {
            cachedError = err;
            setError(err);
            setLoading(false);
            reject(err);
          }
        });
      });
    } else {
      cachedPromise.then(setData).catch(setError).finally(() => setLoading(false));
    }
  }, []);

  return { data, error, loading };
}