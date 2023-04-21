import React, { useState, useEffect, useCallback } from "react";
import * as ContextMenu from "@radix-ui/react-context-menu"; // npm install @radix-ui/react-context-menu@latest -Eでダウンロード
import "./Canvas.css"; // npm install @radix-ui/colors@latest -Eでダウンロード
import './Leftsidebar.css';

// foreignobject使用したらsvg内にhtml要素を配置できる（Chrome, FireFoxのみ）
// 四角も追加する（LeftSidebar.tsxのコメントアウトにヒントあり）

interface Circle {
  id: number;
  cx: number;
  cy: number;
  r: number;
  stroke: string;
}

function Canvas() {

  // サイドバー部分
  const [activeSection, setActiveSection] = useState("");

  const handleSidebarClick = (sectionName: string) => {
    setActiveSection(sectionName);
  };

  const handleCreatePlace = () => {};
  const handleCreateTransition = () => {};
  const handleCreateArc = () => {};

  // 描画部分
  const [circles, setCircles] = useState<Circle[]>([]);
  const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null);
  const [isCreatingCircle, setIsCreatingCircle] = useState(false);


  const handleCreateCircleClick = () => {
    setIsCreatingCircle(true);
  }

  const handleCreateCircle = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isCreatingCircle) {
      const newCircle: Circle = {
        id: circles.length,
        cx: e.nativeEvent.offsetX,
        cy: e.nativeEvent.offsetY,
        r: 50,
        stroke: "black",
      };
      setCircles([...circles, newCircle]);
      setIsCreatingCircle(false);
    }
    
  };

  const handleSelectCircle = (circle: Circle) => {
    setSelectedCircle(circle);
    const updatedCircles = circles.map(c =>
      c.id === circle.id ? {...c, stroke: 'blue'} : c
    );
    setCircles(updatedCircles);
  };

  /*
  // ドラッグアンドドロップできるようにしたい
  const handleMoveCircle = (e: React.MouseEvent<SVGCircleElement>) => {
    if (selectedCircle) {
      const newCx = e.nativeEvent.offsetX;
      const newCy = e.nativeEvent.offsetY;
      const updatedCircles = circles.map((circle) =>
        circle.id === selectedCircle.id ? { ...circle, cx: newCx, cy: newCy } : circle
      );
      setCircles(updatedCircles);
    }
  };*/

  const handleDeleteCircle = () => {
    if (selectedCircle) {
      const updatedCircles = circles.filter((circle) => circle.stroke !== "blue");
      setCircles(updatedCircles);
      setSelectedCircle(null);
    }
  };

  const handleContextMenu = (e: React.MouseEvent<SVGCircleElement>) => {
    e.preventDefault();
    if (selectedCircle) {
      const contextMenu = document.getElementById("context-menu");
      if (contextMenu) {
        contextMenu.style.display = "block";
        contextMenu.style.top = `${e.clientY}px`;
        contextMenu.style.left = `${e.clientX}px`;
      }
    }
  };

  // 選択解除の処理を追加する
  const handleDeselectCircle = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest("circle") && selectedCircle) {
      setSelectedCircle(null);
      const updatedCircles = circles.map((circle) =>
        circle.id === selectedCircle.id ? { ...circle, stroke: "black" } : circle
      );
      setCircles(updatedCircles);
    }
  }, [circles, selectedCircle]);
  

  // 選択解除の処理を監視するためのuseEffectを追加する
  useEffect(() => {
    window.addEventListener('click', handleDeselectCircle);
    return () => {
      window.removeEventListener('click', handleDeselectCircle);
    };
  }, [handleDeselectCircle]);

  return (
  
    <div>

      {/* サイドバー部分 */}
      <div className="Leftsidebar">
        <ul className="LeftsidebarList">
          <li className={activeSection === "model" ? "active" : ""} onClick={() => handleSidebarClick("model")}>モデル作成</li>
          <li className={activeSection === "conflict" ? "active" : ""} onClick={() => handleSidebarClick("conflict")}>競合を選択</li>
          <li className={activeSection === "controller" ? "active" : ""} onClick={() => handleSidebarClick("controller")}>コントローラ生成</li>
          <li className={activeSection === "ladder" ? "active" : ""} onClick={() => handleSidebarClick("ladder")}>ラダー図へ変換</li>
          <li className={activeSection === "file" ? "active" : ""} onClick={() => handleSidebarClick("file")}>ファイル操作</li>
        </ul>
        <div className="Rightsidebar">
          {activeSection === "model" && (
            <div className='CreateModel'>
              <h3>プレース作成</h3>
              <input type="text" name="PlaceName" />
              <button name="CreatePlace" onClick={handleCreatePlace}>作成</button>
              <br />
              <h3>トランジション作成</h3>
              <input type="text" name="TransitionName" />
              <button name="CreateTransition" onClick={handleCreateTransition}>作成</button>
              <br />
              <h3>アーク作成</h3>
              <button name="CreateArc" onClick={handleCreateArc}>作成</button>
            </div>
          )}
          {activeSection === "conflict" && (
            <div className='SelectConflict'>
              <h3>競合するプレースを選択してください</h3>
            </div>
          )}
          {activeSection === "controller" && (
            <div className='CreateController'>
              <button name='CreateController'>コントローラを生成</button>
            </div>
          )}
          {activeSection === "ladder" && (
            <div className='ChangeLadder'>
              <button name='ChangeLadder'>ラダー図へ変換</button>
            </div>
          )}
          {activeSection === "file" && (
            <div className='FileOperation'>
              <button name='FileDownload'>ファイルをダウンロード</button>
              <button name='FileUpload'>ファイルをアップロード</button>
            </div>
          )}
        </div>
      </div>

      {/* 描画部分 */}
      <svg width="900" height="500" onClick={handleCreateCircle}>
        <g>
        {[...Array(10)].map((_, index) => (
            <line key={`horizontal-${index}`} x1={0} y1={index * 50} x2="100%" y2={index * 50} stroke="black" />
        ))}
        {[...Array(20)].map((_, index) => (
            <line key={`vertical-${index}`} x1={index * 50} y1={0} x2={index * 50} y2="500" stroke="black" />
        ))}
          {circles.map((circle) => (
            <circle
              key={circle.id}
              cx={circle.cx}
              cy={circle.cy}
              r={circle.r}
              stroke={circle.stroke}
              fill="none"
              strokeWidth="5"
              onClick={() => handleSelectCircle(circle)}
              //onMouseMove={(e) => handleMoveCircle(e)}
              onContextMenu={(e) => handleContextMenu(e)}
            />
          ))}
            {selectedCircle && (
              <foreignObject className="DeleteButton" id="context-menu" style={{position: "relative"}}>
                <ul>
                  <li onClick={handleDeleteCircle}>削除</li>
                </ul>
              </foreignObject>
            )}
        </g>
      </svg>
      <button onClick={handleCreateCircleClick}>円作成</button>

    </div>
    
  );
};

export default Canvas;