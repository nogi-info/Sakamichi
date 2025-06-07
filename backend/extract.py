import requests
from bs4 import BeautifulSoup
import pandas as pd
import os
import io # 追加: StringIOを使用する場合
import re # reモジュールを追加

# スクリプトの現在のディレクトリを取得し、そこに移動
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(CURRENT_DIR)

# WikipediaのURLリスト
urls = {
    "乃木坂46": "https://ja.wikipedia.org/wiki/%E4%B9%83%E6%9C%A8%E5%9D%8246",
    "乃木坂46作品": "https://ja.wikipedia.org/wiki/%E4%B9%83%E6%9C%A8%E5%9D%8246%E3%81%AE%E4%BD%9C%E5%93%81",
    "櫻坂46": "https://ja.wikipedia.org/wiki/%E6%AB%BB%E5%9D%8246",
    "日向坂46": "https://ja.wikipedia.org/wiki/%E6%97%A5%E5%90%91%E5%9D%8246"
}
# 抽出したいタイトル文字列
target_titles = {
    "member": [
        "現メンバー",
        "元メンバー",
    ],
    "discography": [
        "シングル",
        "CDシングル",
        "配信限定シングル",
        "アルバム",
        "オリジナルアルバム",
        "オリジナル・アルバム",
        "コンピレーション・アルバム",
        "ベストアルバム",
        "ベスト・アルバム"
    ]
}

# 出力ディレクトリが存在しない場合は作成
# run_all.pyによってbackendディレクトリがcwdになるので、"tables"でOK
output_dir = "tables"
os.makedirs(output_dir, exist_ok=True)
# 出力ディレクトリの下にtarget_titlesのキー名のサブディレクトリを作成
for key in target_titles.keys():
    sub_dir = os.path.join(output_dir, key)
    os.makedirs(sub_dir, exist_ok=True)

# 各URLを処理 (変更なし)
for page_title, url in urls.items():
    print(f"Processing: {page_title} ({url})")

    response = requests.get(url)
    response.encoding = response.apparent_encoding
    soup = BeautifulSoup(response.text, 'html.parser')

    for key, titles in target_titles.items():
        output_subdir = os.path.join(output_dir, key)
        # 各タイトルに対して処理
        for title in titles:
            header = soup.find('h3', {'id': title})
            if header:
                current_element = header
                # 複数テーブルに対応
                tables = []
                while current_element:
                    current_element = current_element.find_next()
                    # ページ末尾に到達したらループを抜ける
                    if current_element is None:
                        break
                    # 次の見出しに到達したらループを抜ける
                    if (re.match(r'h[1-3]', current_element.name)):
                        break
                    # テーブル要素を見つけたらリストに追加
                    if current_element.name == 'table' and 'wikitable' in current_element.get('class', []):
                        tables.append(current_element)

                if tables:
                    for table in tables:
                        # pandasでHTMLテーブルをデータフレームに変換
                        # FutureWarningを抑制
                        df = pd.read_html(io.StringIO(str(table)))[0]

                        # CSVとして保存
                        
                        # page_titleをgroup_nameに変換する
                        # *46をグループ名として正規表現で取得(例: "乃木坂46作品" -> "乃木坂46")
                        group_name = re.search(r'((.+?)46)', page_title)
                        if group_name:
                            group_name = group_name.group(0)
                        else:
                            group_name = "不明"

                        table_index = tables.index(table) + 1
                        csv_filename = f"{group_name}_{title}_table_{table_index}.csv"
                        output_path = os.path.join(output_subdir, csv_filename)
                        df.to_csv(output_path, index=False, encoding='utf-8')
                        print(f"Saved: {output_path}")
                else:
                    print(f"No tables found for title '{title}' in {page_title}")
            else:
                print(f"Title '{title}' not found in {page_title}")
                