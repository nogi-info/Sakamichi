import pandas as pd
import glob
import re
import os

# スクリプトの現在のディレクトリを取得し、そこに移動
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(CURRENT_DIR)

# 処理対象のCSVファイルを取得
# run_all.pyによってbackendディレクトリがcwdになるので、"tables/*.csv"でOK
csv_files = glob.glob("tables/member/*.csv")

# 結合用のリスト (変更なし)
processed_data = []

# 列タイトルの定義 (変更なし)
columns = ["グループ名", "名前", "よみ", "生年月日", "出身地", "血液型", "身長", "加入期", "卒業・辞退・契約終了日", "現在の所属事務所ほか"]

# 漢数字をアラビア数字に変換する関数 (変更なし)
def convert_kanji_to_number(text):
    kanji_to_number = {
        "一": "1", "二": "2", "三": "3", "四": "4", "五": "5",
        "六": "6", "七": "7", "八": "8", "九": "9", "十": "10"
    }
    for kanji, number in kanji_to_number.items():
        text = text.replace(kanji, number)
    return text

# 除外メンバーリストの読み込み
# run_all.pyによってbackendディレクトリがcwdになるので、"handmade/sakamichi_exclusion.csv"でOK
try:
    with open("handmade/sakamichi_exclusion.csv", "r", encoding="utf-8") as f:
        excluded_members = [line.strip() for line in f if line.strip()]
except FileNotFoundError:
    excluded_members = []
    print("除外メンバーリスト 'handmade/sakamichi_exclusion.csv' が見つかりませんでした。") # メッセージも変更
except Exception as e:
    excluded_members = []
    print(f"除外メンバーリストの読み込み中にエラーが発生しました: {e}")

# 各CSVファイルを処理 (変更なし)
for file in csv_files:
    if "乃木坂46" in file:
        group_name = "乃木坂46"
    elif "櫻坂46" in file:
        group_name = "櫻坂46"
    elif "日向坂46" in file:
        group_name = "日向坂46"
    else:
        group_name = "不明"

    df = pd.read_csv(file)
    
    # 列名の統一化：複数のパターンを対応
    # 「現在の所属事務所」「卒業後の所属」などを「現在の所属事務所ほか」に統一
    if "現在の所属事務所" in df.columns:
        df = df.rename(columns={"現在の所属事務所": "現在の所属事務所ほか"})
    elif "卒業後の所属" in df.columns:
        df = df.rename(columns={"卒業後の所属": "現在の所属事務所ほか"})
    
    if "最終在籍日" in df.columns:
        df = df.rename(columns={"最終在籍日": "卒業・辞退・契約終了日"})

    # 必要な列を選択（存在する列のみ）
    required_columns = ["名前", "よみ", "生年月日", "出身地", "血液型", "身長", "加入期", "卒業・辞退・契約終了日", "現在の所属事務所ほか"]
    existing_columns = [col for col in required_columns if col in df.columns]
    
    # 不足している列を追加
    for col in required_columns:
        if col not in df.columns:
            df[col] = "-"
    
    df = df[existing_columns + [col for col in required_columns if col not in existing_columns]]

    df.insert(0, "グループ名", group_name)
    df["生年月日"] = df["生年月日"].apply(lambda x: re.search(r"\d{4}年\d{1,2}月\d{1,2}日", str(x)))
    df["生年月日"] = df["生年月日"].apply(lambda x: x.group(0).replace("年", "/").replace("月", "/").replace("日", "") if x else "-")
    df["卒業・辞退・契約終了日"] = df["卒業・辞退・契約終了日"].apply(lambda x: re.search(r"\d{4}年\d{1,2}月\d{1,2}日", str(x)))
    df["卒業・辞退・契約終了日"] = df["卒業・辞退・契約終了日"].apply(lambda x: x.group(0).replace("年", "/").replace("月", "/").replace("日", "") if x else "-")
    df["身長"] = df["身長"].apply(lambda x: re.search(r"\d+(\.\d+)?", str(x)))
    df["身長"] = df["身長"].apply(lambda x: x.group(0) if x else "-")
    df["加入期"] = df["加入期"].apply(lambda x: convert_kanji_to_number(str(x)))
    df = df.fillna("-")

    # FutureWarningを抑制:
    df = df.map(lambda x: re.sub(r"\[.*?\]", "", str(x)) if isinstance(x, str) else x)

    df = df[columns]
    processed_data.append(df)

final_df = pd.concat(processed_data, ignore_index=True)

if excluded_members:
    final_df = final_df[~final_df["名前"].isin(excluded_members)]
    print(f"以下のメンバーは除外されました: {', '.join(excluded_members)}")

# 出力ディレクトリが存在しない場合は作成
# run_all.pyによってbackendディレクトリがcwdになるので、"data"でOK
output_dir = "data"
os.makedirs(output_dir, exist_ok=True)

# 結合したデータをCSVに出力
output_path = os.path.join(output_dir, "sakamichi_combined.csv")
final_df.to_csv(output_path, index=False, encoding="utf-8-sig")

print(f"処理が完了しました。結合されたCSVファイルは '{output_path}' に保存されました。")