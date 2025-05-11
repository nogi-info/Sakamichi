import pandas as pd
import glob
import re

# 処理対象のCSVファイルを取得
csv_files = glob.glob("backend/tables/*.csv")

# 結合用のリスト
processed_data = []

# 列タイトルの定義
columns = ["グループ名", "名前", "よみ", "生年月日", "出身地", "血液型", "身長", "加入期", "卒業・辞退・契約終了日", "現在の所属事務所ほか"]

# 漢数字をアラビア数字に変換する関数
def convert_kanji_to_number(text):
    kanji_to_number = {
        "一": "1",
        "二": "2",
        "三": "3",
        "四": "4",
        "五": "5",
        "六": "6",
        "七": "7",
        "八": "8",
        "九": "9",
        "十": "10"
    }
    for kanji, number in kanji_to_number.items():
        text = text.replace(kanji, number)
    return text

# 各CSVファイルを処理
for file in csv_files:
    # グループ名をファイル名から取得
    if "乃木坂46" in file:
        group_name = "乃木坂46"
    elif "櫻坂46" in file:
        group_name = "櫻坂46"
    elif "日向坂46" in file:
        group_name = "日向坂46"
    else:
        group_name = "不明"

    # CSVを読み込む
    df = pd.read_csv(file)

    # 列名の表記ゆれを統一
    df = df.rename(columns={
        "現在の所属事務所": "現在の所属事務所ほか"
    })
    df = df.rename(columns={
        "最終在籍日": "卒業・辞退・契約終了日"
    })

    # 列構造に応じて処理を分岐
    if "卒業・辞退・契約終了日" in df.columns:  # 元メンバーの場合
        df = df[["名前", "よみ", "生年月日", "出身地", "血液型", "身長", "加入期", "卒業・辞退・契約終了日", "現在の所属事務所ほか"]]
    else:  # 現メンバーの場合
        df = df[["名前", "よみ", "生年月日", "出身地", "血液型", "身長", "加入期"]]
        df["卒業・辞退・契約終了日"] = "-"  # 現メンバーは「-」を設定
        df["現在の所属事務所ほか"] = "-"  # 現メンバーは「-」を設定

    # グループ名列を追加
    df.insert(0, "グループ名", group_name)

    # 生年月日列をyyyy/MM/dd形式に変換
    df["生年月日"] = df["生年月日"].apply(lambda x: re.search(r"\d{4}年\d{1,2}月\d{1,2}日", str(x)))
    df["生年月日"] = df["生年月日"].apply(lambda x: x.group(0).replace("年", "/").replace("月", "/").replace("日", "") if x else "-")

    # 卒業・辞退・契約終了日列をyyyy/MM/dd形式に変換
    df["卒業・辞退・契約終了日"] = df["卒業・辞退・契約終了日"].apply(
        lambda x: re.search(r"\d{4}年\d{1,2}月\d{1,2}日", str(x))
    )
    df["卒業・辞退・契約終了日"] = df["卒業・辞退・契約終了日"].apply(
        lambda x: x.group(0).replace("年", "/").replace("月", "/").replace("日", "") if x else "-"
    )

    # 身長列を数値（小数点含む）に変換
    df["身長"] = df["身長"].apply(lambda x: re.search(r"\d+(\.\d+)?", str(x)))
    df["身長"] = df["身長"].apply(lambda x: x.group(0) if x else "-")

    # 加入期列の漢数字をアラビア数字に変換
    df["加入期"] = df["加入期"].apply(lambda x: convert_kanji_to_number(str(x)))

    # 空欄を半角ハイフンに置き換え
    df = df.fillna("-")

    # 注釈文字列（[.*]）を削除
    df = df.applymap(lambda x: re.sub(r"\[.*?\]", "", str(x)) if isinstance(x, str) else x)

    # 必要な列のみを選択
    df = df[columns]

    # 処理済みデータをリストに追加
    processed_data.append(df)

# すべてのデータを結合
final_df = pd.concat(processed_data, ignore_index=True)

# 結合したデータをCSVに出力
final_df.to_csv("sakamichi_combined.csv", index=False, encoding="utf-8-sig")

print("処理が完了しました。結合されたCSVファイルは 'sakamichi_combined.csv' に保存されました。")