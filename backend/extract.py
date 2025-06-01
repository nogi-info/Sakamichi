import requests
from bs4 import BeautifulSoup
import pandas as pd
import os
import io # 追加: StringIOを使用する場合

# WikipediaのURLリスト (変更なし)
urls = {
    "乃木坂46": "https://ja.wikipedia.org/wiki/%E4%B9%83%E6%9C%A8%E5%9D%8246",
    "櫻坂46": "https://ja.wikipedia.org/wiki/%E6%AB%BB%E5%9D%8246",
    "日向坂46": "https://ja.wikipedia.org/wiki/%E6%97%A5%E5%90%91%E5%9D%8246"
}

# 抽出したいタイトル文字列 (変更なし)
target_titles = ["現メンバー", "元メンバー"]

# 出力ディレクトリが存在しない場合は作成
# run_all.pyによってbackendディレクトリがcwdになるので、"tables"でOK
output_dir = "tables"
os.makedirs(output_dir, exist_ok=True)

# 各URLを処理 (変更なし)
for group_name, url in urls.items():
    print(f"Processing: {group_name} ({url})")

    response = requests.get(url)
    response.encoding = response.apparent_encoding
    soup = BeautifulSoup(response.text, 'html.parser')

    for title in target_titles:
        header = soup.find('h3', {'id': title})
        if header:
            current_element = header
            table = None
            while current_element:
                current_element = current_element.find_next()
                if current_element and current_element.name == 'table' and 'wikitable' in current_element.get('class', []):
                    table = current_element
                    break

            if table:
                # pandasでHTMLテーブルをデータフレームに変換
                # FutureWarningを抑制
                df = pd.read_html(io.StringIO(str(table)))[0]

                # CSVとして保存
                csv_filename = f"{group_name}_{title}_table.csv"
                output_path = os.path.join(output_dir, csv_filename)
                df.to_csv(output_path, index=False, encoding='utf-8')
                print(f"Saved: {output_path}")
            else:
                print(f"No table found for title '{title}' in {group_name}")
        else:
            print(f"Title '{title}' not found in {group_name}")