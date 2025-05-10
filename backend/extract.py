import requests
from bs4 import BeautifulSoup
import pandas as pd

# WikipediaのURLリスト
urls = {
    "乃木坂46": "https://ja.wikipedia.org/wiki/%E4%B9%83%E6%9C%A8%E5%9D%8246",
    "櫻坂46": "https://ja.wikipedia.org/wiki/%E6%AB%BB%E5%9D%8246",
    "日向坂46": "https://ja.wikipedia.org/wiki/%E6%97%A5%E5%90%91%E5%9D%8246"
}

# 抽出したいタイトル文字列
target_titles = ["現メンバー", "元メンバー"]

# 各URLを処理
for group_name, url in urls.items():
    print(f"Processing: {group_name} ({url})")
    
    # ページを取得
    response = requests.get(url)
    response.encoding = response.apparent_encoding  # 文字コードを自動検出
    soup = BeautifulSoup(response.text, 'html.parser')

    # 各タイトル文字列に対応するテーブルを抽出
    for title in target_titles:
        # タイトル文字列を検索
        header = soup.find('h3', {'id': title})
        if header:
            # タイトル文字列の次の要素を探索
            current_element = header
            table = None
            while current_element:
                # 次の要素を取得
                current_element = current_element.find_next()
                # テーブルが見つかった場合
                if current_element and current_element.name == 'table' and 'wikitable' in current_element.get('class', []):
                    table = current_element
                    break
            
            if table:
                # pandasでHTMLテーブルをデータフレームに変換
                df = pd.read_html(str(table))[0]

                # CSVとして保存
                csv_filename = f"{group_name}_{title}_table.csv"
                df.to_csv(csv_filename, index=False, encoding='utf-8')
                print(f"Saved: {csv_filename}")
            else:
                print(f"No table found for title '{title}' in {group_name}")
        else:
            print(f"Title '{title}' not found in {group_name}")