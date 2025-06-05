import React, { useState, useEffect } from 'react';
// Firebase Firestoreの関数をインポート
import { collection, query, orderBy, limit, getDocs, addDoc, deleteDoc, doc, where, onSnapshot } from 'firebase/firestore';
// Firebase設定ファイルからdb, appId, authインスタンスをインポート
import { db, appId, auth } from '../../../firebaseConfig'; // 相対パスを調整

// MemberCardコンポーネントをインポート（選択されたメンバー表示用）
import MemberCard from "../../member-list/components/MemberCard"; 

// 時間表示のヘルパー関数 (ここに移動)
const formatTime = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60; // 小数点以下を含む秒数

  // 秒を小数点以下2桁の文字列にフォーマット
  let formattedSecondsString = remainingSeconds.toFixed(2);

  // 整数部分と小数部分を分割
  const parts = formattedSecondsString.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1] || '00'; // 小数部分がない場合は '00'

  if (minutes === 0) {
    // 5秒67 の形式
    return `${integerPart}秒${decimalPart}`;
  } else {
    // 1分05秒67 の形式
    const paddedIntegerPart = integerPart.padStart(2, '0'); // 秒の整数部を2桁にパディング
    return `${minutes}分${paddedIntegerPart}秒${decimalPart}`;
  }
};

/**
 * リーダーボードの表示とスコア保存モーダルを管理するコンポーネント。
 * RubiksCubeコンポーネントから以下のPropsを受け取ります:
 * - isCleared: ゲームがクリアされたかどうか (boolean)
 * - time: クリアタイム (number)
 * - difficulty: 現在の難易度 (number)
 * - selectedMember: ルービックキューブの面に表示されたメンバー情報 (object, optional)
 * - groupData: グループデータ (array)
 * - links: リンクデータ (array)
 * - onRetry: 「もう一度プレイ」ボタンがクリックされたときに呼び出す関数 (function)
 */
function LeaderboardAndScoreSave({ isCleared, time, difficulty, selectedMember, groupData, links, onRetry }) {
  // Firestore関連のState
  const [leaderboardTimes, setLeaderboardTimes] = useState([]); // Firestoreから取得したベストタイム
  const [showSaveScoreModal, setShowSaveScoreModal] = useState(false); // スコア保存モーダルの表示状態
  const [inputUsername, setInputUsername] = useState(''); // ユーザー名入力用
  const [scoreToSave, setScoreToSave] = useState(null); // 保存するスコア（タイムと難易度を含むオブジェクト）
  const [saveScoreMessage, setSaveScoreMessage] = useState(''); // スコア保存時のメッセージ

  // ベストタイムをFirestoreからリアルタイムで読み込むuseEffect (onSnapshotを使用)
  useEffect(() => {
    // dbが初期化されていない場合は処理しない
    if (!db || !appId) {
      console.log("Firestore database or appId not initialized yet. Skipping leaderboard fetch.");
      return;
    }

    // 現在選択されている難易度に応じてリーダーボードをフィルタリング
    const difficultyToFetch = difficulty; 

    const leaderboardRef = collection(db, `/artifacts/${appId}/public/data/rubiks_cube_leaderboard`);
    const q = query(
      leaderboardRef,
      where("difficulty", "==", difficultyToFetch), // 現在の難易度でフィルタリング
      orderBy("time", "asc"), // タイムが短い順にソート
      orderBy("timestamp", "desc"), // 同じタイムの場合は新しい記録を優先
      limit(20) // 上位20件のみ取得 (要件に合わせ20件に増量)
    );

    // onSnapshotでリアルタイムリスナーを設定
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const times = [];
      snapshot.forEach((doc) => {
        times.push({ id: doc.id, ...doc.data() });
      });
      setLeaderboardTimes(times);
    }, (error) => {
      console.error("Error fetching leaderboard in real-time:", error);
      // エラーハンドリング (例: ユーザーにメッセージを表示)
    });

    // コンポーネントのアンマウント時にリスナーを解除
    return () => unsubscribe();
  }, [db, appId, difficulty]); // db, appId, difficultyが変更されたときに再購読

  // ゲームクリア時にスコア保存モーダルを表示するuseEffect
  useEffect(() => {
    if (isCleared && time > 0) { // isClearedがtrueになり、かつタイムが0より大きい場合
      setScoreToSave({ time: time, difficulty: difficulty }); // 保存するスコアと難易度を設定
      setShowSaveScoreModal(true); // モーダルを表示
      setInputUsername(''); // ユーザー名をリセット
      setSaveScoreMessage(''); // メッセージをリセット
    } else if (!isCleared && showSaveScoreModal) {
      // ゲームがクリア状態ではなくなった場合（例: リトライ時）はモーダルを非表示にする
      setShowSaveScoreModal(false);
    }
  }, [isCleared, time, difficulty]); // isCleared, time, difficultyが変更されたときに実行

  // スコアをFirestoreに保存する関数
  const handleSaveScore = async () => {
    if (!inputUsername.trim()) {
      setSaveScoreMessage("ユーザー名を入力してください。");
      return;
    }
    // dbが利用可能であり、かつauth.currentUserが存在することを確認
    if (!db || !auth.currentUser) { 
      setSaveScoreMessage("エラー: スコアを保存できません。Firebase接続を確認してください。");
      console.error("Firestore DB or authenticated user not available.");
      return;
    }
    if (!scoreToSave) {
      setSaveScoreMessage("保存するスコアがありません。");
      return;
    }

    setSaveScoreMessage("スコアを保存中...");

    try {
      const leaderboardRef = collection(db, `/artifacts/${appId}/public/data/rubiks_cube_leaderboard`);
      
      // 現在の難易度で既存のベストタイムを取得
      const q = query(
        leaderboardRef,
        where("difficulty", "==", scoreToSave.difficulty),
        orderBy("time", "asc") // タイムが短い順
      );
      const snapshot = await getDocs(q);
      let existingScores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // 新しいスコアを追加
      const newScoreData = {
        username: inputUsername.trim(),
        time: scoreToSave.time,
        difficulty: scoreToSave.difficulty,
        timestamp: new Date(), // 現在時刻をFirestoreのTimestampとして保存
        userId: auth.currentUser.uid, // 匿名認証ユーザーのIDを保存（誰が記録したか）
      };
      existingScores.push(newScoreData);

      // タイムでソート
      existingScores.sort((a, b) => {
        if (a.time === b.time) {
          // タイムが同じ場合は新しい記録を優先 (timestamp降順)
          // FirestoreのTimestampオブジェクトはtoDate()でDateオブジェクトに変換可能
          const tsA = a.timestamp && a.timestamp.toDate ? a.timestamp.toDate().getTime() : 0;
          const tsB = b.timestamp && b.timestamp.toDate ? b.timestamp.toDate().getTime() : 0;
          return tsB - tsA; 
        }
        return a.time - b.time; // タイムが短い順
      });

      // 20件を超える古いスコアを削除
      if (existingScores.length > 20) {
        const scoresToDelete = existingScores.slice(20); // 21番目以降のドキュメント
        // Promise.allで複数の削除操作を並行して実行
        await Promise.all(scoresToDelete.map(score => {
          if (score.id) { // idが存在するドキュメントのみ削除
            return deleteDoc(doc(db, `/artifacts/${appId}/public/data/rubiks_cube_leaderboard`, score.id));
          }
          return Promise.resolve(); // idがない場合は何もしない
        }));
      }
      
      // 新しいスコアをFirestoreに追加 (addDocで新しいドキュメントとして保存)
      // 注意: addDocは常に新しいドキュメントIDを生成します。
      // ここでは「古いものを削除し、新しいものを追加」というロジックを採用しています。
      await addDoc(leaderboardRef, newScoreData);

      setSaveScoreMessage("スコアを保存しました！");
      // setShowSaveScoreModal(false); // 保存後はモーダルを閉じる
      // setInputUsername(''); // 入力フィールドをクリア
      // setScoreToSave(null); // 保存済みスコアをクリア
    } catch (error) {
      console.error("Error saving score to Firestore:", error);
      setSaveScoreMessage("スコアの保存に失敗しました。詳細: " + error.message);
    }
  };

  return (
    <>
      {/* ゲームクリア表示パネル */}
      {isCleared && (
        <div className="game-clear-panel game-overlay-card">
          <div className="clear-message">クリア！</div>
          <div className="clear-time">{formatTime(time)}</div>
          
          {selectedMember && difficulty !== 1 && ( // 選択されたメンバーが存在し、difficultyが1でない場合のみ表示
            <div className="selected-member-info">
              {/* MemberCard コンポーネントを直接使用 */}
              <MemberCard 
                member={selectedMember} 
                groupName={selectedMember['グループ名']} // メンバーオブジェクトからグループ名を取得
                links={links} // linksはRubiksCubeコンポーネントのstateから渡す
                groupData={groupData} // groupDataもRubiksCubeコンポーネントのstateから渡す
              />
            </div>
          )}

          {/* ベストタイム表示 */}
          {leaderboardTimes.length > 0 && (
            <div className="best-times-section">
              <h3>ベストタイム (難易度 {difficulty})</h3>
              <ol className="best-times-list">
                {leaderboardTimes.map((score, index) => (
                  // FirestoreドキュメントのIDをkeyに使用 (idは既存のFirestoreドキュメントに存在)
                  <li key={score.id || index}> 
                    <span className="rank">{index + 1}.</span> 
                    <span className="name">{score.username}</span> - 
                    <span className="time">{formatTime(score.time)}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <button onClick={onRetry} className="game-button game-button-primary">
            もう一度プレイ
          </button>
        </div>
      )}

      {/* スコア保存モーダル */}
      {showSaveScoreModal && (
        <div className="save-score-modal game-overlay-card">
          <h3>スコアを登録</h3>
          <p>
            タイム: <span className="score-value">{formatTime(scoreToSave?.time || 0)}</span> {' '}
            (難易度: <span className="score-value">{scoreToSave?.difficulty}</span>)
          </p>
          <input
            type="text"
            placeholder="ユーザー名を入力してください"
            value={inputUsername}
            onChange={(e) => setInputUsername(e.target.value)}
            maxLength={20} // 名前入力の最大長
            className="username-input"
          />
          {saveScoreMessage && <p className="save-message">{saveScoreMessage}</p>}
          <div className="modal-actions">
            <button onClick={handleSaveScore} className="game-button game-button-primary">
              保存する
            </button>
            <button onClick={() => setShowSaveScoreModal(false)} className="game-button game-button-secondary">
              キャンセル
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default LeaderboardAndScoreSave;
