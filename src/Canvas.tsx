import React, { useState, useEffect, useCallback, useRef } from "react";
//import * as ContextMenu from "@radix-ui/react-context-menu"; // npm install @radix-ui/react-context-menu@latest -Eでダウンロード
import "./Canvas.css"; // npm install @radix-ui/colors@latest -Eでダウンロード
import './Leftsidebar.css';

// foreignobject使用したらsvg内にhtml要素を配置できる（Chrome, FireFoxのみ）
// foreignObjectによるXHTMLの埋め込みできる　https://atmarkit.itmedia.co.jp/ait/articles/1206/01/news143_5.html
// ドラッグアンドドロット https://gist.github.com/hashrock/0e8f10d9a233127c5e33b09ca6883ff4
// svgエディタ作った人 https://hashrock.hatenablog.com/entry/2017/12/04/215559
// svg詳しい基礎解説 https://www.webdesignleaves.com/pr/html/svg_basic.html

// やること
// 矢印で繋ぐ
// 名前と図形紐づけ
// コントローラ計算
// コントローラ出力
// 

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

  //以下Zoom実装
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [viewBox, setViewBox] = useState('0 0 900 500');
  
  const zoomAtCenter = (event: WheelEvent, svg: SVGSVGElement | null, scale: number) => {
    const viewBox = svg?.getAttribute('viewBox');
    const [minX, minY, width, height] = viewBox ? viewBox.split(' ').map(parseFloat) : [0, 0, 100, 100];
    
    if (!svg) return;
    event.preventDefault();

    let x, y;
    if (event.offsetX) {
      x = event.offsetX;
      y = event.offsetY;
    } else {
      x = event.clientX - svg.getBoundingClientRect().left;
      y = event.clientY - svg.getBoundingClientRect().top;
    }

    const sx = x / svg.clientWidth;
    const sy = y / svg.clientHeight;

    const newX = minX + width * sx;
    const newY = minY + height * sy;
    
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;
    const scaledMinX = newX + scale * (minX - newX);
    const scaledMinY = newY + scale * (minY - newY);

    const zoomedViewBox = [scaledMinX, scaledMinY, scaledWidth, scaledHeight].join(' ');
    svg?.setAttribute('viewBox', zoomedViewBox);
    return {newX, newY};
  }

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return; // コントロールキーが押されていない場合は処理しない
      const scale = Math.pow(1.1, event.deltaY < 0 ? -1: 1);
      zoomAtCenter(event, svgRef.current, scale);
    };

    const svgElement = svgRef.current;
    if (svgElement) {
      svgElement.addEventListener('wheel', handleWheel);
    }

    return () => {
      if (svgElement) {
        svgElement.removeEventListener('wheel', handleWheel);
      }
    };
  }, []);



  // サイドバー部分
  const [activeSection, setActiveSection] = useState("");

  const handleSidebarClick = (sectionName: string) => {
    setActiveSection(sectionName);
  };

  // 描画部分
  // プレース
  const [circles, setCircles] = useState<Circle[]>([]);
  const [selectedCircle, setSelectedCircle] = useState<Circle[]>([]);
  const [isCreatingCircle, setIsCreatingCircle] = useState(false);

  const handleCreateCircleClick = () => {
    setIsCreatingCircle(true);
  }


  const handleCreateCircle = (e: React.MouseEvent<SVGSVGElement>, svg: SVGSVGElement | null) => {
    const viewBox = svg?.getAttribute('viewBox');
    const [minX, minY, width, height] = viewBox ? viewBox.split(' ').map(parseFloat) : [0, 0, 100, 100];
    if (!svg) return;
    e.preventDefault();
    let x, y;
    if (e.nativeEvent.offsetX) {
      x = e.nativeEvent.offsetX;
      y = e.nativeEvent.offsetY;
    } else {
      x = e.clientX - svg.getBoundingClientRect().left;
      y = e.clientY - svg.getBoundingClientRect().top;
    }

    const sx = x / svg.clientWidth;
    const sy = y / svg.clientHeight;

    const newX = minX + width * sx;
    const newY = minY + height * sy;
    
    if (isCreatingCircle) {
      const newCircle: Circle = {
        id: circles.length,
        cx: newX,
        cy: newY,
        r: 50,
        stroke: "black",
      };
      setCircles([...circles, newCircle]);
      setIsCreatingCircle(false);
    }
    console.log(circles);
  };
  useEffect(() => {

  })

  const handleSelectCircle = (circle: Circle) => {
    setSelectedCircle([...selectedCircle, circle]);
    const updatedCircles = circles.map(c =>
      c.id === circle.id ? {...c, stroke: 'blue'} : c
    );
    setCircles(updatedCircles);
  };

  const handleDeleteCircle = () => {
    if (selectedCircle) {
      const updatedCircles = circles.filter((circle) => circle.stroke !== "blue");
      setCircles(updatedCircles);
      setSelectedCircle([]);
    }
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

  const svgCircleElemRef = useRef<SVGCircleElement | null>(null);
  const svgRectElemRef = useRef<SVGRectElement | null>(null);

  const startDrag = (
    event: React.MouseEvent,
    draggedElem: SVGCircleElement | SVGRectElement | null,
  ) => {
    event.preventDefault();
    if (svgRef.current === null || draggedElem === null) return;
    const point = svgRef.current.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const cursor = point.matrixTransform(
      svgRef.current.getScreenCTM()?.inverse()
    );
    
    const mousemove = (event: MouseEvent) => {
      event.preventDefault();
      point.x = event.clientX;
      point.y = event.clientY;
      const newCursor = point.matrixTransform(
        svgRef.current?.getScreenCTM()?.inverse()
      );

      const delta = {x: newCursor.x - cursor.x, y: newCursor.y - cursor.y};

      const updatedCircles = circles.map(c =>
        c.stroke === "blue" ? {...c, cx: c.cx + delta.x, cy: c.cy + delta.y} : c
      );
      setCircles(updatedCircles);

      const updatedRects = rects.map(r =>
        r.stroke === "blue" ? {...r, x: r.x + delta.x, y: r.y + delta.y} : r
      );
      setRects(updatedRects);
      
    };

    const mouseup = (event: MouseEvent) => {
      document.removeEventListener("mousemove", mousemove);
      document.removeEventListener("mouseup", mouseup);
    };

    document.addEventListener("mousemove", mousemove);
    document.addEventListener("mouseup", mouseup);
  }


  // トランジション
  const [rects, setRects] = useState<Rect[]>([]);
  const [selectedRect, setSelectedRect] = useState<Rect[]>([]);
  const [isCreatingRect, setIsCreatingRect] = useState(false);

  const handleCreateRectClick = () => {
    setIsCreatingRect(true);
  }

  const handleCreateRect = (e: React.MouseEvent<SVGSVGElement>, svg: SVGSVGElement | null) => {
    const viewBox = svg?.getAttribute('viewBox');
    const [minX, minY, width, height] = viewBox ? viewBox.split(' ').map(parseFloat) : [0, 0, 100, 100];
    if (!svg) return;
    e.preventDefault();
    let x, y;
    if (e.nativeEvent.offsetX) {
      x = e.nativeEvent.offsetX;
      y = e.nativeEvent.offsetY;
    } else {
      x = e.clientX - svg.getBoundingClientRect().left;
      y = e.clientY - svg.getBoundingClientRect().top;
    }

    const sx = x / svg.clientWidth;
    const sy = y / svg.clientHeight;

    const newX = minX + width * sx;
    const newY = minY + height * sy;
    
    if (isCreatingRect) {
      const newRect: Rect = {
        id: rects.length,
        x: newX - 25,
        y: newY - 25,
        width: 50,
        height: 50,
        stroke: "black",
      };
      setRects([...rects, newRect]);
      setIsCreatingRect(false);
    }
  };

  const handleSelectRect = (rect: Rect) => {
    setSelectedRect([...selectedRect, rect]);
    const updatedRects = rects.map(r =>
      r.id === rect.id ? {...r, stroke: 'blue'} : r
    );
    setRects(updatedRects);
  };

  const handleDeleteRect = () => {
    if (selectedRect) {
      const updatedRects = rects.filter((rect) => rect.stroke !== "blue");
      setRects(updatedRects);
      setSelectedRect([]);
    }
  };

  // ここからhandleContextMenuまでcircleとrectは共通処理
  // 選択解除の処理を追加する
  const handleDeselectShape = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest("circle") && !target.closest("rect") && selectedCircle) {
      // 円選択解除
      setSelectedCircle([]);
      const updatedCircles = circles.map((circle) =>
        circle.stroke === "blue" ? { ...circle, stroke: "black" } : circle
      );
      setCircles(updatedCircles);
    }
    if (!target.closest("circle") && !target.closest("rect") && selectedRect) {
      // 四角選択解除
      setSelectedRect([]);
      const updatedRects = rects.map((rect) =>
        rect.stroke === "blue" ? { ...rect, stroke: "black" } : rect
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
  
  const handleContextMenu = (e: React.MouseEvent<SVGElement>, svg: SVGSVGElement | null) => {
    const viewBox = svg?.getAttribute('viewBox');
    const [minX, minY, width, height] = viewBox ? viewBox.split(' ').map(parseFloat) : [0, 0, 100, 100];
    if (!svg) return;
    e.preventDefault();
    let x, y;
    if (e.nativeEvent.offsetX) {
      x = e.nativeEvent.offsetX;
      y = e.nativeEvent.offsetY;
    } else {
      x = e.clientX - svg.getBoundingClientRect().left;
      y = e.clientY - svg.getBoundingClientRect().top;
    }

    const sx = x / svg.clientWidth;
    const sy = y / svg.clientHeight;

    const newX = minX + width * sx;
    const newY = minY + height * sy;
    if (selectedCircle.length > 0 || selectedRect.length > 0) {
      const contextMenu = document.getElementById("context-menu");
      if (contextMenu) {
        contextMenu.style.display = "black";
        contextMenu.style.top = `${newY}px`;
        contextMenu.style.left = `${newX}px`;
      }
    }
  };

  const [isCreatingArc, setIsCreatingArc] = useState(false);

  const handleCreateArcClick = () => {
    setIsCreatingCircle(true);
  }
  const handleCreateArc = () => {
    if (!isCreatingArc) return;
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
      <svg width={900} height={500} onClick={(e) => {
                                      handleCreateCircle(e, svgRef.current);
                                      handleCreateRect(e, svgRef.current);
                                    }} viewBox={viewBox} ref={svgRef}
      >
        <g>
        {[...Array(10)].map((_, index) => (
            <line key={`horizontal-${index}`} x1={0} y1={index * 50} x2="100%" y2={index * 50} stroke="black" />
        ))}
        {[...Array(20)].map((_, index) => (
            <line key={`vertical-${index}`} x1={index * 50} y1={0} x2={index * 50} y2="500" stroke="black" />
        ))}
        <line x1={300} y1={300} x2={400} y2={400} stroke="black"></line>
        {circles.map((circle) => (
            <circle
              key={circle.id}
              cx={circle.cx}
              cy={circle.cy}
              r={circle.r}
              stroke={circle.stroke}
              fill="none"
              strokeWidth="10"
              onClick={() => handleSelectCircle(circle)}
              //onMouseMove={(e) => handleMoveCircle(e)}
              onContextMenu={(e) => handleContextMenu(e, svgRef.current)}
              ref={(e) => (svgCircleElemRef.current = e ? e : null)}
              onMouseDown={(e) => startDrag(e, svgCircleElemRef.current)}
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
              strokeWidth="10"
              onClick={() => handleSelectRect(rect)} 
              onContextMenu={(e) => handleContextMenu(e, svgRef.current)}
              ref={(e) => (svgRectElemRef.current = e ? e: null)}
              onMouseDown={(e) => startDrag(e, svgRectElemRef.current)}
            />
          ))}
            {(selectedCircle.length > 0 || selectedRect.length > 0) && (
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