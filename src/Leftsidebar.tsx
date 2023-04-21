// 使ってない！！！！

import React, { useState } from 'react';
import './Leftsidebar.css';
//import { useSelectedCircleContext } from './Canvas';

function Leftsidebar() {
  const [activeSection, setActiveSection] = useState("");

  const handleSidebarClick = (sectionName: string) => {
    setActiveSection(sectionName);
  };

  const handleCreatePlace = () => {};
  const handleCreateTransition = () => {};
  const handleCreateArc = () => {};

  return (
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
  );
};

export default Leftsidebar;

/*
type ShapeType = 'circle' | 'square';

interface Shape {
  id: number;
  type: ShapeType;
  x: number;
  y: number;
  size: number;
}

const Canvas: React.FC = () => {
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [currentShape, setCurrentShape] = useState<ShapeType | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const handleShapeClick = (id: number) => {
    setDragging(id);
  };

  const handleShapeDrag = (event: React.MouseEvent<SVGElement>) => {
    if (dragging !== null) {
      const shapeIndex = shapes.findIndex((shape) => shape.id === dragging);
      const { x, y } = event.currentTarget.getBoundingClientRect();
      const offsetX = event.clientX - x;
      const offsetY = event.clientY - y;
      setShapes((prevShapes) =>
        prevShapes.map((shape, index) =>
          index === shapeIndex
            ? {
                ...shape,
                x: offsetX,
                y: offsetY,
              }
            : shape
        )
      );
    }
  };

  const handleCanvasClick = (event: React.MouseEvent<SVGElement>) => {
    if (currentShape !== null) {
      const { x, y } = event.currentTarget.getBoundingClientRect();
      const offsetX = event.clientX - x;
      const offsetY = event.clientY - y;
      const newShape: Shape = {
        id: Date.now(),
        type: currentShape,
        x: offsetX,
        y: offsetY,
        size: 50,
      };
      setShapes((prevShapes) => [...prevShapes, newShape]);
      setCurrentShape(null);
    }
  };

  const handleCircleClick = () => {
    setCurrentShape('circle');
  };

  const handleSquareClick = () => {
    setCurrentShape('square');
  };

  return (
    <div>
      <button onClick={handleCircleClick}>円</button>
      <button onClick={handleSquareClick}>四角</button>
      <svg width="800" height="600" onClick={handleCanvasClick}>
        {shapes.map((shape) =>
          shape.type === 'circle' ? (
            <circle
              key={shape.id}
              cx={shape.x}
              cy={shape.y}
              r={shape.size / 2}
              onClick={() => handleShapeClick(shape.id)}
              onMouseMove={handleShapeDrag}
            />
          ) : (
            <rect
              key={shape.id}
              x={shape.x - shape.size / 2}
              y={shape.y - shape.size / 2}
              width={shape.size}
              height={shape.size}
              onClick={() => handleShapeClick(shape.id)}
              onMouseMove={handleShapeDrag}
            />
          )
        )}
      </svg>
    </div>
  );
};

export default Canvas;
*/