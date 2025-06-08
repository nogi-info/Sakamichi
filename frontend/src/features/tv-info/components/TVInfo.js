import React from "react";
import Layout from "../../../styles/Layout"; // Layoutコンポーネントをインポート

const TVInfo = () => {
  return (
    <Layout>
      <div style={{
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        textAlign: "center",
        alignItems: "center",
        justifyContent: "center",
        marginTop: -60,
      }}>
        <iframe
          src="https://calendar.google.com/calendar/embed?src=d65265f1172f7450623d467006b3e65814c4629246a26b6f73e904bf03329ff4%40group.calendar.google.com&color=%23812990&src=4ecaabf07ba91d7ab6b11ce4b4585f452f261363caa4a1fbb2c5db58bbd90cca%40group.calendar.google.com&color=%23f19db5&src=01a93c482257457d4f2b32cb933d5b9260bee658b3880ac0c11d9abc7780dd7e%40group.calendar.google.com&color=%237cc7e8&ctz=Asia%2FTokyo&mode=AGENDA"
          style={{
            width: "100%",
            height: "70vh",
            maxWidth: "800px",
            border: 0,
            borderRadius: "8px",
            boxShadow: "0 1px 6px rgba(0,0,0,0.06)"
          }}
          title="坂道TVカレンダー"
        />
        <div style={{ margin: 32 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "24px", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: "bold", marginBottom: 8 }}>坂道出演情報　関東　MC陣含む</div>
              <iframe
                width="360"
                height="202"
                src="https://www.youtube.com/embed/videoseries?list=PLVdawDeqKE9MjvG5wQm178VC6B5_0RrE-"
                title="坂道出演情報 関東 MC陣含む"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ borderRadius: "8px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}
              />
            </div>
            <div>
              <div style={{ fontWeight: "bold", marginBottom: 8 }}>坂道出演情報　全国　MC陣無し</div>
              <iframe
                width="360"
                height="202"
                src="https://www.youtube.com/embed/videoseries?list=PLVdawDeqKE9NgTpw1ZhSZ9sV3HwLZN1AH"
                title="坂道出演情報 全国 MC陣無し"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ borderRadius: "8px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}
              />
            </div>
          </div>
          <div style={{ marginTop: 32 }}>
            <a
              href="https://www.youtube.com/@nogi_tv_info/featured"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                  display: "inline-flex",
                  alignItems: "center",
                  background: "#812990",
                  color: "#fff",
                  borderRadius: "6px",
                  padding: "8px 18px",
                  textDecoration: "none",
                  fontSize: "1.1em",
                  gap: "8px",
                  margin: "16px 0"
              }}
              >
              チャンネル登録はこちら
            </a>
          </div>
          <div className="filter-note">
            <p>※ 掲載内容には誤りや抜け漏れが含まれる場合があります。</p>
            <p>※ 最新かつ正確な情報は各公式サイト等でご確認ください。</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TVInfo;