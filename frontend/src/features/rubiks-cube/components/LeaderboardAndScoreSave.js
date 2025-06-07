import React, { useState, useEffect, useRef } from 'react';
// Firebase Firestoreの関数をインポート
import { collection, query, orderBy, limit, getDocs, addDoc, deleteDoc, doc, where, onSnapshot } from 'firebase/firestore';
// Firebase設定ファイルからdb, appId, authインスタンスをインポートする代わりに、Propsとして受け取る
// import { db, appId, auth } from '../../../firebaseConfig'; // この行は削除

// MemberCardコンポーネントをインポート（選択されたメンバー表示用）
import MemberCard from "../../member-list/components/MemberCard"; 

// リーダーボードのコレクション名を環境変数に応じて設定
const leaderboardCollectionName = (process.env.REACT_APP_DEBUG === 'true')
  ? 'rubiks_cube_leaderboard_debug' // デバッグ用コレクション名
  : 'rubiks_cube_leaderboard';    // 本番用コレクション名

// 時間表示のヘルパー関数
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
 * - db: Firebase Firestoreのdbインスタンス (Firebaseの初期化後にRubiksCubeから渡される)
 * - auth: Firebase Authのauthインスタンス (Firebaseの初期化後にRubiksCubeから渡される)
 * - appId: FirebaseのアプリID (Firebaseの初期化後にRubiksCubeから渡される)
 */
function LeaderboardAndScoreSave({ isCleared, time, difficulty, selectedMember, groupData, links, onRetry, db, auth, appId }) { // db, auth, appIdをPropsとして受け取る
  // Firestore関連のState
  const [leaderboardTimes, setLeaderboardTimes] = useState([]); // Firestoreから取得したベストタイム (常に上位20件)
  const [showSaveScoreModal, setShowSaveScoreModal] = useState(false); // スコア保存モーダルの表示状態
  const [inputUsername, setInputUsername] = useState(''); // ユーザー名入力用
  const [scoreToSave, setScoreToSave] = useState(null); // 保存するスコア（タイムと難易度を含むオブジェクト）
  const [saveScoreMessage, setSaveScoreMessage] = useState(''); // スコア保存時のメッセージ
  const [highlightedScoreId, setHighlightedScoreId] = useState(null); // 新しく保存されたスコアのIDを保持
  const [latestUserScoreAfterGame, setLatestUserScoreAfterGame] = useState(null); // ユーザーが達成した最新スコア（圏外でも表示用）
  const [potentialRank, setPotentialRank] = useState(null); // スコア保存モーダルに表示する順位

  const listRef = useRef(null); // ベストタイムリストのコンテナ (ul) への参照
  const scoreRefs = useRef({}); // 個々のリストアイテム (li) への参照を保持するオブジェクト

  // ベストタイム (上位20件) をFirestoreからリアルタイムで読み込むuseEffect
  useEffect(() => {
    // db, appId, auth がpropsとして渡されるので、それらが存在するかチェック
    if (!db || !appId || !auth) { 
      console.log("Firestore database, appId, or auth not initialized yet. Skipping leaderboard fetch.");
      return;
    }

    const leaderboardRef = collection(db, `/artifacts/${appId}/public/data/${leaderboardCollectionName}`);
    const q = query(
      leaderboardRef,
      where("difficulty", "==", difficulty),
      orderBy("time", "asc"),
      orderBy("timestamp", "desc"),
      limit(20)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const times = [];
      snapshot.forEach((doc) => times.push({ id: doc.id, ...doc.data() }));
      setLeaderboardTimes(times);
    }, (error) => {
      console.error("Error fetching top 20 leaderboard in real-time:", error);
    });
    return () => unsubscribe();
  }, [db, appId, auth, difficulty]); // 依存配列にdb, auth, appIdを追加

  // ゲームクリア時にスコア保存モーダルの表示と最新スコアの保存を管理するuseEffect
  useEffect(() => {
    if (isCleared && time > 0) { // クリア状態であり、タイムが0より大きい場合
      setScoreToSave({ time: time, difficulty: difficulty }); // 保存するスコアを設定
      setInputUsername(''); // ユーザー名をリセット
      setSaveScoreMessage(''); // メッセージをリセット
      setHighlightedScoreId(null); // ハイライトをリセット
      setLatestUserScoreAfterGame(null); // ユーザーの最新スコアをリセット
      setPotentialRank(null); // 潜在的な順位もリセット

      const currentLeaderboardLength = leaderboardTimes.length;
      let rank = null;

      // ベスト20圏内に入るかチェック
      const qualifiesForLeaderboard = 
        currentLeaderboardLength < 20 || 
        (leaderboardTimes.length > 0 && time < leaderboardTimes[currentLeaderboardLength - 1].time); 
      
      if (qualifiesForLeaderboard) {
        // 圏内に入る場合、その時点での潜在的な順位を計算
        // 現在のリーダーボードに新しいスコア（仮のIDとタイムスタンプ）を追加し、ソートして順位を特定
        const newTempLeaderboard = [...leaderboardTimes];
        const dummyNewScore = { time: time, username: 'temp', id: 'temp-id', timestamp: new Date() };
        newTempLeaderboard.push(dummyNewScore);
        
        newTempLeaderboard.sort((a, b) => {
          if (a.time === b.time) {
            // Firebase TimestampオブジェクトとDateオブジェクトの両方に対応
            const tsA = a.timestamp ? (a.timestamp.toDate ? a.timestamp.toDate().getTime() : a.timestamp.getTime()) : 0;
            const tsB = b.timestamp ? (b.timestamp.toDate ? b.timestamp.toDate().getTime() : b.timestamp.getTime()) : 0;
            return tsB - tsA; // タイムが同じなら新しい記録を優先 (降順)
          }
          return a.time - b.time; // タイムが短い順 (昇順)
        });

        const potentialRankObject = newTempLeaderboard.find(score => score.id === 'temp-id');
        if (potentialRankObject) {
          rank = newTempLeaderboard.indexOf(potentialRankObject) + 1;
        }

        // 計算された順位が本当にトップ20以内であるか最終確認
        if (rank && rank <= 20) {
          setPotentialRank(rank);
          setShowSaveScoreModal(true); // 資格があればモーダルを表示
        } else {
          // 万が一、計算結果が20位以下になった場合のフォールバック（通常は起こらないはず）
          setShowSaveScoreModal(false);
          setLatestUserScoreAfterGame({ // 圏外スコアとして表示
            time: time, 
            difficulty: difficulty,
            username: '', 
            id: 'user-latest-score-id-' + Date.now() 
          });
          setHighlightedScoreId('user-latest-score-id-' + Date.now()); 
        }

      } else {
        // 圏外なのでモーダルは表示しない
        setShowSaveScoreModal(false); 
        // ユーザーの最新スコアを保存して、リーダーボードの下に表示できるようにする
        setLatestUserScoreAfterGame({ 
          time: time, 
          difficulty: difficulty,
          username: '', // 圏外スコアの場合、ユーザー名入力は行わないので空文字列
          // 一時的なIDを割り当ててスクロール可能にする
          id: 'user-latest-score-id-' + Date.now() 
        });
        // この一時的なIDをハイライト対象として設定
        setHighlightedScoreId('user-latest-score-id-' + Date.now()); 
      }
    } else if (!isCleared) { // ゲームがクリア状態ではなくなった場合（例: リトライ時）
      setShowSaveScoreModal(false); // モーダルを非表示
      setScoreToSave(null); // 保存するスコアをクリア
      setInputUsername(''); // ユーザー名をリセット
      setSaveScoreMessage(''); // メッセージをリセット
      setHighlightedScoreId(null); // ハイライトをリセット
      setLatestUserScoreAfterGame(null); // ユーザーの最新スコアをクリア
      setPotentialRank(null); // 潜在的な順位もリセット
    }
  }, [isCleared, time, difficulty, leaderboardTimes]); // leaderboardTimesも依存配列に追加

  // highlightedScoreIdが設定されたら、そのスコアまでスクロールするuseEffect
  useEffect(() => {
    if (highlightedScoreId && listRef.current) {
      const element = scoreRefs.current[highlightedScoreId];
      if (element) {
        // レンダリングが完了し、要素がDOMに存在することを保証するため、setTimeoutで遅延
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100); // 100msの遅延
      }
    }
  }, [highlightedScoreId]); // highlightedScoreIdが変更されたときに実行

  // スコアをFirestoreに保存する関数
  const handleSaveScore = async () => {
    if (!inputUsername.trim()) {
      setSaveScoreMessage("ユーザー名を入力してください。");
      return;
    }
    // dbとauthがpropsとして渡されるので、それらが利用可能かチェック
    if (!db || !auth || !auth.currentUser) { 
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
      const leaderboardRef = collection(db, `/artifacts/${appId}/public/data/${leaderboardCollectionName}`);
      
      // 新しいスコアデータを作成
      const newScoreData = {
        username: inputUsername.trim(),
        time: scoreToSave.time,
        difficulty: scoreToSave.difficulty,
        timestamp: new Date(), // 現在時刻をFirestoreのTimestampとして保存
        userId: auth.currentUser.uid, // 匿名認証ユーザーのIDを保存（誰が記録したか）
      };
      
      // 新しいスコアをFirestoreに追加
      const docRef = await addDoc(leaderboardRef, newScoreData);
      setHighlightedScoreId(docRef.id); // 新しく保存されたスコアのIDをハイライト対象として設定

      setSaveScoreMessage("スコアを保存しました！");
      setShowSaveScoreModal(false); // 保存後はモーダルを閉じる
      setInputUsername(''); // 入力フィールドをクリア
      setScoreToSave(null); // 保存済みスコアをクリア
      setLatestUserScoreAfterGame(null); // トップ20入りしたので、個別表示の必要はない
      setPotentialRank(null); // 登録後は潜在的な順位をクリア
    } catch (error) {
      console.error("Error saving score to Firestore:", error);
      setSaveScoreMessage("スコアの保存に失敗しました。詳細: " + error.message);
    }
  };

  // スコア登録をキャンセルする関数
  const handleCancelSaveScore = () => {
    setShowSaveScoreModal(false); // モーダルを閉じる
    setInputUsername(''); // 入力フィールドをクリア
    setScoreToSave(null); // 保存済みスコアをクリア
    setSaveScoreMessage(''); // メッセージをリセット
    setHighlightedScoreId(null); // キャンセル時もハイライトをリセット
    setLatestUserScoreAfterGame(null); // キャンセル時も最新スコア表示をクリア
    setPotentialRank(null); // 潜在的な順位もリセット
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
                initialExpanded={true} // 初期状態で展開
              />
            </div>
          )}

          {/* ベストタイム表示セクション */}
          <div className="best-times-section">
            <h3>ベストタイム (Level {difficulty})</h3>
            {leaderboardTimes.length > 0 || (isCleared && latestUserScoreAfterGame) ? ( // クリア済みで圏外スコアがある場合もリスト表示
              <ul className="best-times-list" ref={listRef}> {/* Refをul要素に設定 */}
                {leaderboardTimes.map((score, index) => (
                  <li 
                    key={score.id || index} 
                    className={score.id === highlightedScoreId ? 'new-score' : ''}
                    ref={el => scoreRefs.current[score.id] = el} // 各li要素にRefを設定
                  > 
                    <span className="rank">{index + 1}.</span> 
                    <span className="name">{score.username}</span>
                    <span className="time">{formatTime(score.time)}</span>
                  </li>
                ))}
                {/* ユーザーのスコアがトップ20圏外の場合に、リストの最後に「あなたの記録」として表示 */}
                {latestUserScoreAfterGame && 
                 highlightedScoreId === latestUserScoreAfterGame.id && (
                  <li 
                    key={latestUserScoreAfterGame.id} 
                    className="new-score user-non-top20-score" // 圏外スコア用の特別なクラス
                    ref={el => scoreRefs.current[latestUserScoreAfterGame.id] = el}
                  >
                    <span className="rank">-</span> {/* 順位を「-」に変更 */}
                    <span className="name">あなたの記録</span> {/* 名前を「あなたの記録」に変更 */}
                    <span className="time">{formatTime(latestUserScoreAfterGame.time)}</span>
                  </li>
                )}
              </ul>
            ) : (
              // リーダーボードにまだスコアがない場合のメッセージ
              <p className="no-score-message">
                この難易度での記録はまだありません。
                {/* 圏外スコアの場合のメッセージは削除されたため、条件から外す */}
              </p>
            )}
          </div>

          <button onClick={onRetry} className="game-button game-button-primary">
            もう一度プレイ
          </button>
        </div>
      )}

      {/* スコア保存モーダル */}
      {showSaveScoreModal && (
        <div className="save-score-modal game-overlay-card">
          {/* potentialRankが存在すれば順位を表示、そうでなければ一般的なタイトル */}
          <h3>{potentialRank ? `${potentialRank}位にランクイン！` : 'スコアを登録'}</h3>
          <p>
            タイム: <span className="score-value">{formatTime(scoreToSave?.time || 0)}</span> {' '}
            (Level: <span className="score-value">{scoreToSave?.difficulty}</span>)
          </p>
          <input
            type="text"
            placeholder="ニックネームを入力してください"
            value={inputUsername}
            onChange={(e) => setInputUsername(e.target.value)}
            maxLength={20} // 名前入力の最大長
            className="username-input"
          />
          {saveScoreMessage && <p className="save-message">{saveScoreMessage}</p>}
          <div className="modal-actions">
            <button onClick={handleSaveScore} className="game-button game-button-primary">
              登録する
            </button>
            <button onClick={handleCancelSaveScore} className="game-button game-button-secondary">
              キャンセル
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default LeaderboardAndScoreSave;
