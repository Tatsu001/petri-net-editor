import React, { useState, useEffect, useCallback, useRef } from "react";
//import * as ContextMenu from "@radix-ui/react-context-menu"; // npm install @radix-ui/react-context-menu@latest -Eでダウンロード
import "./Canvas.css"; // npm install @radix-ui/colors@latest -Eでダウンロード
import './Leftsidebar.css';
import { Arrow } from "@radix-ui/react-context-menu";

// foreignobject使用したらsvg内にhtml要素を配置できる（Chrome, FireFoxのみ）
// foreignObjectによるXHTMLの埋め込みできる　https://atmarkit.itmedia.co.jp/ait/articles/1206/01/news143_5.html
// ドラッグアンドドロット https://gist.github.com/hashrock/0e8f10d9a233127c5e33b09ca6883ff4
// svgエディタ作った人 https://hashrock.hatenablog.com/entry/2017/12/04/215559
// svg詳しい基礎解説 https://www.webdesignleaves.com/pr/html/svg_basic.html

// やること
// コントローラ計算
// コントローラ出力

interface Circle {
  id: number;
  cx: number;
  cy: number;
  r: number;
  stroke: string;
  name: string,
}

interface Rect {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  stroke: string;
  name: string;
}

interface Arc {
  id: number;
  c_id: number;
  r_id: number;
  arrow: -1 | 1;
  d: string,
  stroke: string;
}

function Canvas() {

  const BEZIER_PARAM = 1.3; // 小さくすると逆に離れてても小さくくっつく．実験的に調整する．

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
  const [selectedShape, setSelectedShape] = useState<string[]>([]); // Arcの向き判別用
  // プレース
  const [circles, setCircles] = useState<Circle[]>([]);
  const [selectedCircle, setSelectedCircle] = useState<Circle[]>([]);
  const [isCreatingCircle, setIsCreatingCircle] = useState(false);
  const [circleName, setCircleName] = useState("");

  const handleCreateCircleClick = () => {
    setIsCreatingCircle(true);
    setIsCreatingRect(false);
    setIsCreatingArc(false);
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
        r: placeR,
        stroke: "black",
        name: circleName,
      };
      setCircles([...circles, newCircle]);
      setIsCreatingCircle(false);
      setCircleName("");
    }
  };

  const handleSelectCircle = (circle: Circle) => {
    setSelectedCircle([...selectedCircle, circle]);
    const updatedCircles = circles.map(c =>
      c.id === circle.id ? {...c, stroke: 'blue'} : c
    );
    setCircles(updatedCircles);
    setSelectedShape([...selectedShape, "circle"]);
    console.log(selectedShape);
  };

  const handleDeleteCircle = () => {
    if (selectedCircle) {
      const updatedCircles = circles.filter((circle) => circle.stroke !== "blue");
      setCircles(updatedCircles);
      setSelectedCircle([]);
    }
  };


  // ドラッグアンドドロップ実装

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

      const updatedCircles = circles.map((c) => 
        c.stroke === "blue" ? {...c, cx: c.cx + delta.x, cy: c.cy + delta.y} : c
      );
      setCircles(updatedCircles);

      const updatedRects = rects.map(r =>
        r.stroke === "blue" ? {...r, x: r.x + delta.x, y: r.y + delta.y} : r
      );
      setRects(updatedRects);

      //  1ならcircleがstart，rectがend
      // -1ならrectがstart，circleがend
      const updatedArcs = arcs.map(a => {
        const circle_with_a = circles.filter(c => c.id === a.c_id)[0]; // このアークとつながってるプレース
        const rect_with_a = rects.filter(r => r.id === a.r_id)[0]; 
        const c = circle_with_a;
        const r = rect_with_a;
        const selectedCircle_id = selectedCircle.map(c => c.id);
        const selectedRect_id = selectedRect.map(r => r.id);
        if (selectedCircle_id.includes(circle_with_a.id) && selectedRect_id.includes(rect_with_a.id)) {
          if (a.arrow === 1) {
            const spx = c.cx + delta.x + c.r;
            const spy = c.cy + delta.y;
            const epx = r.x + delta.x;
            const epy = r.y + delta.y + r.height/2;
            const shx = (spx + epx) / 2;
            const shy = spy;
            const ehx = (spx + epx) / 2;
            const ehy = epy;
            //3次にする
            const dx = epx - spx;
            const dy = epy - spy;
            const d = Math.sqrt(dx * dx + dy * dy);

            const c1x = spx + (d/BEZIER_PARAM);
            const c1y = spy;
            const c2x = epx - (d/BEZIER_PARAM);
            const c2y = epy;

            return {...a, d: `M${spx},${spy} C${c1x},${c1y} ${c2x},${c2y} ${epx},${epy}`};
            //return {...a, d: `M${spx},${spy} C${shx},${shy} ${ehx},${ehy} ${epx},${epy}`};
          }
          else if (a.arrow === -1) {
            const spx = r.x + delta.x + r.width;
            const spy = r.y + delta.y + r.height/2;
            const epx = c.cx + delta.x - c.r;
            const epy = c.cy + delta.y;
            const shx = (spx + epx) / 2;
            const shy = spy;
            const ehx = (spx + epx) / 2;
            const ehy = epy;
            //3次にする
            const dx = epx - spx;
            const dy = epy - spy;
            const d = Math.sqrt(dx * dx + dy * dy);

            const c1x = spx + (d/BEZIER_PARAM);
            const c1y = spy;
            const c2x = epx - (d/BEZIER_PARAM);
            const c2y = epy;

            return {...a, d: `M${spx},${spy} C${c1x},${c1y} ${c2x},${c2y} ${epx},${epy}`};
            //return {...a, d: `M${spx},${spy} C${shx},${shy} ${ehx},${ehy} ${epx},${epy}`};
          }
        }
        else if (selectedCircle_id.includes(circle_with_a.id) && !selectedRect_id.includes(rect_with_a.id)){
          if (a.arrow === 1) {
            const spx = c.cx + delta.x + c.r;
            const spy = c.cy + delta.y;
            const epx = r.x;
            const epy = r.y + r.height/2;
            const shx = (spx + epx) / 2;
            const shy = spy;
            const ehx = (spx + epx) / 2;
            const ehy = epy;
            //3次にする
            const dx = epx - spx;
            const dy = epy - spy;
            const d = Math.sqrt(dx * dx + dy * dy);

            const c1x = spx + (d/BEZIER_PARAM);
            const c1y = spy;
            const c2x = epx - (d/BEZIER_PARAM);
            const c2y = epy;

            return {...a, d: `M${spx},${spy} C${c1x},${c1y} ${c2x},${c2y} ${epx},${epy}`};
            //return {...a, d: `M${spx},${spy} C${shx},${shy} ${ehx},${ehy} ${epx},${epy}`};
          }
          else if (a.arrow === -1) {
            const spx = r.x + r.width;
            const spy = r.y + r.height/2;
            const epx = c.cx + delta.x - c.r;
            const epy = c.cy + delta.y;
            const shx = (spx + epx) / 2;
            const shy = spy;
            const ehx = (spx + epx) / 2;
            const ehy = epy;
            //3次にする
            const dx = epx - spx;
            const dy = epy - spy;
            const d = Math.sqrt(dx * dx + dy * dy);

            const c1x = spx + (d/BEZIER_PARAM);
            const c1y = spy;
            const c2x = epx - (d/BEZIER_PARAM);
            const c2y = epy;

            return {...a, d: `M${spx},${spy} C${c1x},${c1y} ${c2x},${c2y} ${epx},${epy}`};
            //return {...a, d: `M${spx},${spy} C${shx},${shy} ${ehx},${ehy} ${epx},${epy}`};
          }
        }
        else if (!selectedCircle_id.includes(circle_with_a.id) && selectedRect_id.includes(rect_with_a.id)) {
          if (a.arrow === 1) {
            const spx = c.cx + c.r;
            const spy = c.cy;
            const epx = r.x + delta.x;
            const epy = r.y + delta.y + r.height/2;
            const shx = (spx + epx) / 2;
            const shy = spy;
            const ehx = (spx + epx) / 2;
            const ehy = epy;
            //3次にする
            const dx = epx - spx;
            const dy = epy - spy;
            const d = Math.sqrt(dx * dx + dy * dy);

            const c1x = spx + (d/BEZIER_PARAM);
            const c1y = spy;
            const c2x = epx - (d/BEZIER_PARAM);
            const c2y = epy;

            return {...a, d: `M${spx},${spy} C${c1x},${c1y} ${c2x},${c2y} ${epx},${epy}`};
            //return {...a, d: `M${spx},${spy} C${shx},${shy} ${ehx},${ehy} ${epx},${epy}`};
          }
          else if (a.arrow === -1) {
            const spx = r.x + delta.x + r.width;
            const spy = r.y + delta.y + r.height/2;
            const epx = c.cx - c.r;
            const epy = c.cy;
            const shx = (spx + epx) / 2;
            const shy = spy;
            const ehx = (spx + epx) / 2;
            const ehy = epy;
            //3次にする
            const dx = epx - spx;
            const dy = epy - spy;
            const d = Math.sqrt(dx * dx + dy * dy);

            const c1x = spx + (d/BEZIER_PARAM);
            const c1y = spy;
            const c2x = epx - (d/BEZIER_PARAM);
            const c2y = epy;

            return {...a, d: `M${spx},${spy} C${c1x},${c1y} ${c2x},${c2y} ${epx},${epy}`};
            //return {...a, d: `M${spx},${spy} C${shx},${shy} ${ehx},${ehy} ${epx},${epy}`};
          }
        }
        return a;
      });
      setArcs(updatedArcs);
      
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
  const [rectName, setRectName] = useState("");

  const handleCreateRectClick = () => {
    setIsCreatingCircle(false);
    setIsCreatingRect(true);
    setIsCreatingArc(false);
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
        x: newX - transitionWidth/2,
        y: newY - transitionHeight/2,
        width: transitionWidth,
        height: transitionHeight,
        stroke: "black",
        name: rectName,
      };
      setRects([...rects, newRect]);
      setIsCreatingRect(false);
      setRectName("");
    }
  };

  const handleSelectRect = (rect: Rect) => {
    setSelectedRect([...selectedRect, rect]);
    const updatedRects = rects.map(r =>
      r.id === rect.id ? {...r, stroke: 'blue'} : r
    );
    setRects(updatedRects);
    setSelectedShape([...selectedShape, "rect"]);
  };

  const handleDeleteRect = () => {
    if (selectedRect) {
      const updatedRects = rects.filter((rect) => rect.stroke !== "blue");
      setRects(updatedRects);
      setSelectedRect([]);
    }
  };


  // 以下Arc実装
  const [arcs, setArcs] = useState<Arc[]>([]);
  const [selectedArc, setSelectedArc] = useState<Arc[]>([]);
  const [isCreatingArc, setIsCreatingArc] = useState(false);

  const handleCreateArcClick = () => {
    setIsCreatingCircle(false);
    setIsCreatingRect(false);
    setIsCreatingArc(true);
    // 円選択解除
    setSelectedCircle([]);
    setSelectedShape([]);
    const updatedCircles = circles.map((circle) =>
      circle.stroke === "blue" ? { ...circle, stroke: "black" } : circle
    );
    setCircles(updatedCircles);
    // 四角選択解除
    setSelectedRect([]);
    setSelectedShape([]);
    const updatedRects = rects.map((rect) =>
      rect.stroke === "blue" ? { ...rect, stroke: "black" } : rect
    );
    setRects(updatedRects);
  }


  const handleCreateArc = useCallback((e: MouseEvent) => {
    if (!isCreatingArc) return;
    if (selectedCircle.length === 1 && selectedRect.length ===1) {
      const c_id = selectedCircle.map(c => c.id)[0];
      const r_id = selectedRect.map(r => r.id)[0];
      const c_position = selectedCircle.map((c) => {return {x: c.cx, y: c.cy, r: c.r}})[0];
      const r_position = selectedRect.map((r) => {return {x: r.x, y: r.y, w: r.width, h: r.height}})[0];
      if (selectedShape[0] === "circle" && selectedShape[1] === "rect") {
        const spx = c_position.x + c_position.r;
        const spy = c_position.y;
        const epx = r_position.x;
        const epy = r_position.y + r_position.h/2;
        const shx = (spx + epx) / 2;
        const shy = spy;
        const ehx = (spx + epx) / 2;
        const ehy = epy;

        //3次にする
        const dx = epx - spx;
        const dy = epy - spy;
        const d = Math.sqrt(dx * dx + dy * dy);

        const c1x = spx + (d/BEZIER_PARAM);
        const c1y = spy;
        const c2x = epx - (d/BEZIER_PARAM);
        const c2y = epy;

        const newArc: Arc = {
          id: arcs.length,
          c_id: c_id,
          r_id: r_id,
          arrow: 1,
          d: //`M${spx},${spy} C${shx},${shy} ${ehx},${ehy} ${epx},${epy}`,
          `M${spx},${spy} C${c1x},${c1y} ${c2x},${c2y} ${epx},${epy}`,
          stroke: "black"
        };
        setArcs([...arcs, newArc]);
        setIsCreatingArc(false);
      }
      else if (selectedShape[0] === "rect" && selectedShape[1] === "circle") {
        const spx = r_position.x + r_position.w;
        const spy = r_position.y + r_position.h/2;
        const epx = c_position.x - c_position.r;
        const epy = c_position.y;
        const shx = (spx + epx) / 2;
        const shy = spy;
        const ehx = (spx + epx) / 2;
        const ehy = epy;

        //3次にする
        const dx = epx - spx;
        const dy = epy - spy;
        const d = Math.sqrt(dx * dx + dy * dy);

        const c1x = spx + (d/BEZIER_PARAM);
        const c1y = spy;
        const c2x = epx - (d/BEZIER_PARAM);
        const c2y = epy;
        const newArc: Arc = {
          id: arcs.length,
          c_id: c_id,
          r_id: r_id,
          arrow: -1,
          d: //`M${spx},${spy} C${shx},${shy} ${ehx},${ehy} ${epx},${epy}`,
          `M${spx},${spy} C${c1x},${c1y} ${c2x},${c2y} ${epx},${epy}`,
          stroke: "black"
        };
        setArcs([...arcs, newArc]);
        setIsCreatingArc(false);
      }
    }
  }, [selectedCircle, selectedRect, selectedShape, isCreatingArc, arcs]);

  useEffect(() => {
    window.addEventListener('click', handleCreateArc);
    return () => {
      window.removeEventListener('click', handleCreateArc);
    };
  }, [handleCreateArc]);

  const handleSelectArc = (arc: Arc) => {
    setSelectedArc([...selectedArc, arc]);
    const updatedArcs = arcs.map(a =>
      a.id === arc.id ? {...a, stroke: 'blue'} : a
    );
    setArcs(updatedArcs);
  }

  const handleDeleteArc = () => {
    if (selectedArc) {
      const updatedArcs = arcs.filter((arc) => arc.stroke !== "blue");
      setArcs(updatedArcs);
      setSelectedArc([]);
    }
  }

  // ここからhandleContextMenuまでcircleとrectは共通処理
  // 選択解除の処理を追加する
  const handleDeselectShape = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest("circle") && !target.closest("rect") && !target.closest("path") && selectedCircle.length > 0) {
      // 円選択解除
      setSelectedCircle([]);
      setSelectedShape([]);
      const updatedCircles = circles.map((circle) =>
        circle.stroke === "blue" ? { ...circle, stroke: "black" } : circle
      );
      setCircles(updatedCircles);
    }
    if (!target.closest("circle") && !target.closest("rect") && !target.closest("path") && selectedRect.length > 0) {
      // 四角選択解除
      setSelectedRect([]);
      setSelectedShape([]);
      const updatedRects = rects.map((rect) =>
        rect.stroke === "blue" ? { ...rect, stroke: "black" } : rect
      );
      setRects(updatedRects);
    }
    if (!target.closest("circle") && !target.closest("rect") && !target.closest("path") && selectedArc.length > 0) {
      // 矢印選択解除
      setSelectedArc([]);
      const updatedArcs = arcs.map((arc) =>
        arc.stroke === "blue" ? { ...arc, stroke: "black" } : arc
      );
      setArcs(updatedArcs);
    }
  }, [circles, selectedCircle, rects, selectedRect, arcs, selectedArc]);

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


  // 設定
  // プレース
  const [placeR, setPlaceR] = useState(20);
  const changePlaceR = (x: string) => {
    setPlaceR(Number(x));
    const updatedCircle = circles.map((c) => {return {...c, r: placeR}});
    setCircles(updatedCircle);
  }
  const [placeStrokeWidth, setPlaceStrokeWidth] = useState(3);
  const changePlaceStrokeWidth = (x: string) => {
    setPlaceStrokeWidth(Number(x));
  }
  // トランジション
  const [transitionWidth, setTransitionWidth] = useState(10);
  const changeTransitionWidth = (x: string) => {
    setTransitionWidth(Number(x));
    const updatedRects = rects.map((r) => {return {...r, width: transitionWidth}});
    setRects(updatedRects);
  }
  const [transitionHeight, setTransitionHeight] = useState(40);
  const changeTransitionHeight = (x: string) => {
    setTransitionHeight(Number(x));
    const updatedRects = rects.map((r) => {return {...r, height: transitionHeight}});
    setRects(updatedRects);
  }
  const [transitionStrokeWidth, setTransitionStrokeWidth] = useState(3);
  const changeTransitionStrokeWidth = (x: string) => {
    setTransitionStrokeWidth(Number(x));
  }
  // アーク
  const [arcStrokeWidth, setArcStrokeWidth] = useState(2);
  const changeArcStrokeWidth = (x: string) => {
    setArcStrokeWidth(Number(x));
  }
  // 文字サイズ
  const [nameFontSize, setNameFontSize] = useState(20);
  const changeNameFontSize = (x: string) => {
    setNameFontSize(Number(x));
  }
  // プレース・トランジション名XY調整
  const [placeNameX, setPlaceNameX] = useState(0);
  const changePlaceNameX = (x: string) => {
    setPlaceNameX(Number(x));
  };
  const [placeNameY, setPlaceNameY] = useState(10);
  const changePlaceNameY = (y: string) => {
    setPlaceNameY(Number(y));
  };
  const [transitionNameX, setTransitionNameX] = useState(0);
  const changeTransitionNameX = (x: string) => {
    setTransitionNameX(Number(x));
  };
  const [transitionNameY, setTransitionNameY] = useState(10);
  const changeTransitionNameY = (y: string) => {
    setTransitionNameY(Number(y));
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
          <li className={activeSection === "setting" ? "active" : ""} onClick={() => handleSidebarClick("setting")}>描画設定</li>
        </ul>
        <div className="Rightsidebar">
          {activeSection === "model" && (
            <div className='CreateModel'>
              <h3>プレース作成</h3>
              <input
                type="text"
                name="PlaceName"
                value={circleName}
                onChange={(e) => setCircleName(e.target.value)}
                placeholder="Enter place name"  
              />
              <button name="CreatePlace" onClick={handleCreateCircleClick}>作成</button>
              <br />
              <h3>トランジション作成</h3>
              <input
                type="text"
                name="TransitionName"
                value={rectName}
                onChange={(e) => setRectName(e.target.value)}
                placeholder="Enter transition name"
              />
              <button name="CreateTransition" onClick={handleCreateRectClick}>作成</button>
              <br />
              <h3>アーク作成</h3>
              <button name="CreateArc" onClick={handleCreateArcClick}>作成</button>
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
          {activeSection === "setting" && (
            <div className='DrawSetting'>
              <h3>プレース設定</h3>
              <h5>半径</h5>
              <input type="number" value={placeR} min="1" max="100" onChange={(e) => changePlaceR(e.target.value)}/>
              <h5>太さ</h5>
              <input type="number" value={placeStrokeWidth} min="1" max="30" onChange={(e) => changePlaceStrokeWidth(e.target.value)}/>

              <h3>トランジション設定</h3>
              <h5>幅</h5>
              <input type="number" value={transitionWidth} min="1" max="50" onChange={(e) => changeTransitionWidth(e.target.value)}/>
              <h5>高さ</h5>
              <input type="number" value={transitionHeight} min="1" max="50" onChange={(e) => changeTransitionHeight(e.target.value)}/>
              <h5>太さ</h5>
              <input type="number" value={transitionStrokeWidth} min="1" max="30" onChange={(e) => changeTransitionStrokeWidth(e.target.value)}/>

              <h3>アーク設定</h3>
              <h5>太さ</h5>
              <input type="number" value={arcStrokeWidth} min="1" max="30" onChange={(e) => changeArcStrokeWidth(e.target.value)}/>

              <h3>文字設定</h3>
              <h5>文字サイズ</h5>
              <input type="number" value={nameFontSize} min="1" max="100" onChange={(e) => changeNameFontSize(e.target.value)}/>
              <h5>プレース名XY調整</h5>
              <h6>X方向</h6>
              <input type="range" value={placeNameX} min="-40" max="40" onChange={(e) => changePlaceNameX(e.target.value)}/>
              <h6>Y方向</h6>
              <input type="range" value={placeNameY} min="-30" max="50" onChange={(e) => changePlaceNameY(e.target.value)}/>
              <h5>トランジション名XY調整</h5>
              <h6>X方向</h6>
              <input type="range" value={transitionNameX} min="-40" max="40" onChange={(e) => changeTransitionNameX(e.target.value)}/>
              <h6>Y方向</h6>
              <input type="range" value={transitionNameY} min="-30" max="50" onChange={(e) => changeTransitionNameY(e.target.value)}/>
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
            <g key={"circle-svg"+circle.id}>
              <circle
                key={circle.id}
                cx={circle.cx}
                cy={circle.cy}
                r={circle.r}
                stroke={circle.stroke}
                fill="transparent" // noneでもok?
                strokeWidth={placeStrokeWidth}
                onClick={() => handleSelectCircle(circle)}
                onContextMenu={(e) => handleContextMenu(e, svgRef.current)}
                ref={(e) => (svgCircleElemRef.current = e ? e : null)}
                onMouseDown={(e) => startDrag(e, svgCircleElemRef.current)}
              />
              <text x={circle.cx + placeNameX} y={circle.cy - circle.r - placeNameY} fontSize={nameFontSize} textAnchor="middle">{circle.name}</text>
            </g>
          ))}
          {rects.map((rect) => (
            <g key={"rect-svg"+rect.id}>
              <rect
                key={rect.id}
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={rect.height}
                stroke={rect.stroke}
                fill="transparent"
                strokeWidth={transitionStrokeWidth}
                onClick={() => handleSelectRect(rect)} 
                onContextMenu={(e) => handleContextMenu(e, svgRef.current)}
                ref={(e) => (svgRectElemRef.current = e ? e: null)}
                onMouseDown={(e) => startDrag(e, svgRectElemRef.current)}
              />
              <text x={rect.x + rect.width/2 + transitionNameX} y={rect.y - transitionNameY} fontSize={nameFontSize} textAnchor="middle">{rect.name}</text>
            </g>
            
          ))}
          {arcs.map((arc) => (
            <path
              key={arc.id}
              d={arc.d}
              stroke={arc.stroke}
              onClick={() => handleSelectArc(arc)}
              onContextMenu={(e) => handleContextMenu(e, svgRef.current)}
              fill="transparent"
              strokeWidth={arcStrokeWidth}
            />
          ))}
            {(selectedCircle.length > 0 || selectedRect.length > 0) && (
              <foreignObject className="DeleteButton" id="context-menu" style={{position: "relative"}}>
                <ul>
                  <li onClick={() => {
                        handleDeleteCircle();
                        handleDeleteRect();
                        handleDeleteArc();
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