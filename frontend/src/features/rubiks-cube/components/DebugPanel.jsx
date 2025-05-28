import React, { useState } from "react";
import buttonStyle from "../../../styles/buttonStyle";

/**
 * デバッグ機能を提供するパネルコンポーネント
 */
function DebugPanel({ 
  debugInfo, 
  onRotate, 
  onReset,
  showAxes = false,
  onToggleAxes 
}) {
  const [showDebug, setShowDebug] = useState(false);

  if (!showDebug) {
    return (
      <button
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 2000,
          padding: "8px 16px",
          border: "none",
          borderRadius: "6px",
          background: "#aaa",
          color: "#fff",
          fontWeight: "bold",
          cursor: "pointer"
        }}
        onClick={() => setShowDebug(true)}
      >
        デバッグ表示
      </button>
    );
  }

  return (
    <>
      {/* デバッグ表示切替ボタン */}
      <button
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 2000,
          padding: "8px 16px",
          border: "none",
          borderRadius: "6px",
          background: "#4caf50",
          color: "#fff",
          fontWeight: "bold",
          cursor: "pointer"
        }}
        onClick={() => setShowDebug(false)}
      >
        デバッグ非表示
      </button>

      {/* 軸表示切替ボタン */}
      {onToggleAxes && (
        <button
          style={{
            position: "absolute",
            top: 50,
            left: 10,
            zIndex: 2000,
            padding: "8px 16px",
            border: "none",
            borderRadius: "6px",
            background: showAxes ? "#4caf50" : "#aaa",
            color: "#fff",
            fontWeight: "bold",
            cursor: "pointer"
          }}
          onClick={onToggleAxes}
        >
          {showAxes ? "軸非表示" : "軸表示"}
        </button>
      )}

      {/* デバッグ情報表示 */}
      <div style={{
        position: "absolute",
        top: 10,
        right: 10,
        background: "rgba(0,0,0,0.7)",
        color: "#fff",
        padding: "12px",
        borderRadius: "8px",
        fontSize: "13px",
        zIndex: 1000,
        maxWidth: "320px",
        wordBreak: "break-all"
      }}>
        <b>デバッグ情報</b>
        <pre style={{ margin: 0, fontSize: "12px" }}>
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>

      {/* デバッグ用回転ボタン */}
      <div style={{ 
        position: "absolute",
        bottom: 20,
        left: 20,
        background: "#fff",
        padding: "16px",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        zIndex: 1000,
        maxHeight: "400px",
        overflowY: "auto"
      }}>
        <h3 style={{ margin: "0 0 16px 0", color: '#333' }}>デバッグ用回転ボタン</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* X軸回転 */}
          <div>
            <h4 style={{ margin: "0 0 8px 0", color: '#666' }}>X軸回転 (YZ平面)</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              <button onClick={() => onRotate('x', -1, true)} style={buttonStyle}>
                左面 時計回り
              </button>
              <button onClick={() => onRotate('x', -1, false)} style={buttonStyle}>
                左面 反時計回り
              </button>
              <button onClick={() => onRotate('x', 0, true)} style={buttonStyle}>
                中央X 時計回り
              </button>
              <button onClick={() => onRotate('x', 0, false)} style={buttonStyle}>
                中央X 反時計回り
              </button>
              <button onClick={() => onRotate('x', 1, true)} style={buttonStyle}>
                右面 時計回り
              </button>
              <button onClick={() => onRotate('x', 1, false)} style={buttonStyle}>
                右面 反時計回り
              </button>
            </div>
          </div>

          {/* Y軸回転 */}
          <div>
            <h4 style={{ margin: "0 0 8px 0", color: '#666' }}>Y軸回転 (XZ平面)</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              <button onClick={() => onRotate('y', -1, true)} style={buttonStyle}>
                下面 時計回り
              </button>
              <button onClick={() => onRotate('y', -1, false)} style={buttonStyle}>
                下面 反時計回り
              </button>
              <button onClick={() => onRotate('y', 0, true)} style={buttonStyle}>
                中央Y 時計回り
              </button>
              <button onClick={() => onRotate('y', 0, false)} style={buttonStyle}>
                中央Y 反時計回り
              </button>
              <button onClick={() => onRotate('y', 1, true)} style={buttonStyle}>
                上面 時計回り
              </button>
              <button onClick={() => onRotate('y', 1, false)} style={buttonStyle}>
                上面 反時計回り
              </button>
            </div>
          </div>

          {/* Z軸回転 */}
          <div>
            <h4 style={{ margin: "0 0 8px 0", color: '#666' }}>Z軸回転 (XY平面)</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              <button onClick={() => onRotate('z', -1, true)} style={buttonStyle}>
                奥面 時計回り
              </button>
              <button onClick={() => onRotate('z', -1, false)} style={buttonStyle}>
                奥面 反時計回り
              </button>
              <button onClick={() => onRotate('z', 0, true)} style={buttonStyle}>
                中央Z 時計回り
              </button>
              <button onClick={() => onRotate('z', 0, false)} style={buttonStyle}>
                中央Z 反時計回り
              </button>
              <button onClick={() => onRotate('z', 1, true)} style={buttonStyle}>
                手前面 時計回り
              </button>
              <button onClick={() => onRotate('z', 1, false)} style={buttonStyle}>
                手前面 反時計回り
              </button>
            </div>
          </div>

          {/* リセットボタン */}
          <button
            onClick={onReset}
            style={{ 
              ...buttonStyle, 
              backgroundColor: '#ff6b6b',
              alignSelf: 'flex-start'
            }}
          >
            リセット
          </button>
        </div>
      </div>
    </>
  );
}

export default DebugPanel;