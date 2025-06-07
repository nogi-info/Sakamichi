import pandas as pd
import glob
import re
import os

# スクリプトの現在のディレクトリを取得し、そこに移動
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(CURRENT_DIR)

# 処理対象のCSVファイルを取得
csv_files = glob.glob("tables/discography/*.csv")

# 結合用のリスト
processed_data = []

# 各CSVファイルを読み込み、必要な情報を抽出
for file_path in csv_files:
    # ファイル名からグループ名を取得
    # 例: "乃木坂46_シングル_table.csv" から "乃木坂46" を取得
    file_name = os.path.basename(file_path)
    group_name_match = re.match(r'(.+?)_', file_name)
    if group_name_match:
        group_name = group_name_match.group(1)
    else:
        group_name = "不明" # マッチしない場合のデフォルト値

    try:
        # CSVファイルを読み込む
        # 1行目が列タイトルなのでheader=0
        df = pd.read_csv(file_path, header=0)

        # リリース日列とタイトル列の存在を確認
        # 'リリース日'と'タイトル'が直接列名として存在することを前提とする
        if 'リリース日' not in df.columns:
            print(f"Warning: 'リリース日'列が見つかりませんでした - {file_path}. スキップします。")
            continue
        if 'タイトル' not in df.columns:
            print(f"Warning: 'タイトル'列が見つかりませんでした - {file_path}. スキップします。")
            continue

        # リリース日とタイトル列を抽出し、グループ名を追加
        # NaN値を含む行は除外
        temp_df = df[['リリース日', 'タイトル']].dropna()
        temp_df['グループ名'] = group_name
        
        # 抽出したデータをリストに追加
        processed_data.append(temp_df)

    except Exception as e:
        print(f"Error processing {file_path}: {e}")

# 全てのデータを結合
if processed_data:
    combined_df = pd.concat(processed_data, ignore_index=True)

    # リリース日を文字列型に変換し、不要な部分を削除
    combined_df['リリース日'] = combined_df['リリース日'].astype(str).str.replace(r'\[.+?\]', '', regex=True).str.strip()

    # リリース日を一時的に日付型に変換してソート
    combined_df_sorted = combined_df.copy()
    combined_df_sorted['リリース日_dt'] = pd.to_datetime(combined_df_sorted['リリース日'], errors='coerce', format='%Y年%m月%d日') # 一時的な列を作成
    combined_df_sorted = combined_df_sorted.sort_values(by='リリース日_dt', ascending=True).reset_index(drop=True)

    # 重複行を削除 (タイトルが同一の行)
    # 重複判定の基準となる列を'タイトル'に指定し、先頭要素を採用
    final_df = combined_df_sorted.drop_duplicates(subset=['タイトル'], keep='first').copy()
    # リリース日の形式を 'YYYY/M/D' に統一
    # ここで文字列に変換することで、ソートは日付型で行われ、出力は指定フォーマットになる
    final_df['リリース日'] = final_df['リリース日_dt'].dt.strftime('%Y/%#m/%#d').fillna('').copy()
    
    # 最終的な列順を 'グループ名', 'リリース日', 'タイトル' に設定
    final_df = final_df[['グループ名', 'リリース日', 'タイトル']]

    # 出力ディレクトリが存在しない場合は作成
    output_dir = "data"
    os.makedirs(output_dir, exist_ok=True)

    # 結果をCSVファイルに出力
    output_csv_path = os.path.join(output_dir, "sakamichi_combined_discography.csv")
    final_df.to_csv(output_csv_path, index=False, encoding='utf-8')
    print(f"\n結合されたディスクグラフィー情報を '{output_csv_path}' に保存しました。")
    print(f"合計 {len(final_df)} 件のユニークなレコードを保存しました。")
else:
    print("処理対象のCSVファイルが見つからないか、データが抽出されませんでした。")