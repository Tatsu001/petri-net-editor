import React, { useState, useEffect, useCallback } from "react";
import * as ContextMenu from "@radix-ui/react-context-menu"; // npm install @radix-ui/react-context-menu@latest -Eでダウンロード
import "./Canvas.css"; // npm install @radix-ui/colors@latest -Eでダウンロード
import './Leftsidebar.css';

// foreignobject使用したらsvg内にhtml要素を配置できる（Chrome, FireFoxのみ）
// foreignObjectによるXHTMLの埋め込みできる　https://atmarkit.itmedia.co.jp/ait/articles/1206/01/news143_5.html
// ドラッグアンドドロット https://gist.github.com/hashrock/0e8f10d9a233127c5e33b09ca6883ff4
// svgエディタ作った人 https://hashrock.hatenablog.com/entry/2017/12/04/215559
// svg詳しい基礎解説 https://www.webdesignleaves.com/pr/html/svg_basic.html

interface Circle {
  id: number;
  cx: number;
  cy: number;
  r: number;
  stroke: string;
}

interface Rect {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
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
  // プレース
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


  // トランジション
  const [rects, setRects] = useState<Rect[]>([]);
  const [selectedRect, setSelectedRect] = useState<Rect | null>(null);
  const [isCreatingRect, setIsCreatingRect] = useState(false);

  const handleCreateRectClick = () => {
    setIsCreatingRect(true);
  }

  const handleCreateRect = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isCreatingRect) {
      const newRect: Rect = {
        id: rects.length,
        x: e.nativeEvent.offsetX,
        y: e.nativeEvent.offsetY,
        width: 50,
        height: 50,
        stroke: "black",
      };
      setRects([...rects, newRect]);
      setIsCreatingRect(false);
    }
    
  };

  const handleSelectRect = (rect: Rect) => {
    setSelectedRect(rect);
    const updatedRects = rects.map(r =>
      r.id === rect.id ? {...r, stroke: 'blue'} : r
    );
    setRects(updatedRects);
  };

  const handleDeleteRect = () => {
    if (selectedRect) {
      const updatedRects = rects.filter((rect) => rect.stroke !== "blue");
      setRects(updatedRects);
      setSelectedRect(null);
    }
  };


  // ここからhandleContextMenuまでcircleとrectは共通処理
  // 選択解除の処理を追加する
  const handleDeselectShape = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if ((!target.closest("circle") && selectedCircle)  && (!target.closest("rect") && selectedRect)) {
      // 円選択解除
      setSelectedCircle(null);
      const updatedCircles = circles.map((circle) =>
        circle.id === selectedCircle.id ? { ...circle, stroke: "black" } : circle
      );
      setCircles(updatedCircles);
      // 四角選択解除
      setSelectedRect(null);
      const updatedRects = rects.map((rect) =>
        rect.id === selectedRect.id ? { ...rect, stroke: "black" } : rect
      );
      setRects(updatedRects);
    }
  }, [circles, selectedCircle, rects, selectedRect]);

  // 選択解除の処理を監視するためのuseEffectを追加する
  useEffect(() => {
    window.addEventListener('click', handleDeselectShape);
    return () => {
      window.removeEventListener('click', handleDeselectShape);
    };
  }, [handleDeselectShape]);
  
  const handleContextMenu = (e: React.MouseEvent<SVGElement>) => {
    e.preventDefault();
    if (selectedCircle || selectedRect) {
      const contextMenu = document.getElementById("context-menu");
      if (contextMenu) {
        contextMenu.style.display = "block";
        contextMenu.style.top = `${e.clientY}px`;
        contextMenu.style.left = `${e.clientX}px`;
      }
    }
  };

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
              <button name="CreatePlace" onClick={handleCreateCircleClick}>作成</button>
              <br />
              <h3>トランジション作成</h3>
              <input type="text" name="TransitionName" />
              <button name="CreateTransition" onClick={handleCreateRectClick}>作成</button>
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
      <svg width="900" height="500" onClick={(e) => {
                                      handleCreateCircle(e);
                                      handleCreateRect(e);
                                    }}
      >
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
          {rects.map((rect) => (
            <rect
              key={rect.id}
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              stroke={rect.stroke}
              fill="none"
              strokeWidth="5"
              onClick={() => handleSelectRect(rect)} 
              onContextMenu={(e) => handleContextMenu(e)}
            />
          ))}
            {(selectedCircle || selectedRect) && (
              <foreignObject className="DeleteButton" id="context-menu" style={{position: "relative"}}>
                <ul>
                  <li onClick={() => {
                        handleDeleteCircle();
                        handleDeleteRect();
                      }}>削除</li>
                </ul>
              </foreignObject>
            )}
        </g>
      </svg>

    </div>
    
  );
};

export default Canvas;