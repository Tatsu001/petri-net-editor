import React, { useState, useEffect, useCallback } from "react";
import * as ContextMenu from "@radix-ui/react-context-menu"; // npm install @radix-ui/react-context-menu@latest -Eでダウンロード
import "./Canvas.css"; // npm install @radix-ui/colors@latest -Eでダウンロード
// contextmenu作るの面倒なので円をクリックしたらRIghtsidebarに「削除」ボタンが表示されるようにする
// ↑今表示してるとこの位置を変えるだけ

interface Circle {
  id: number;
  cx: number;
  cy: number;
  r: number;
  stroke: string;
}

const App: React.FC = () => {
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
      const updatedCircles = circles.filter((circle) => circle.id !== selectedCircle.id);
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
      <svg width="600" height="400" onClick={handleCreateCircle}>
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
        </g>
      </svg>
      <button onClick={handleCreateCircleClick}>円作成</button>
      {selectedCircle && (
        <div id="context-menu" style={{ display: "none" }}>
          <ul>
            <li onClick={handleDeleteCircle}>削除</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default App;