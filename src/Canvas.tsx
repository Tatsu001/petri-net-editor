import React, { useState, useEffect, useCallback, useRef } from "react";
//import * as ContextMenu from "@radix-ui/react-context-menu"; // npm install @radix-ui/react-context-menu@latest -Eでダウンロード
//import "./Canvas.css"; // npm install @radix-ui/colors@latest -Eでダウンロード
import './Leftsidebar.css';
import init, {calculate_controller, add} from 'wasm-lib';

// foreignobject使用したらsvg内にhtml要素を配置できる（Chrome, FireFoxのみ）
// foreignObjectによるXHTMLの埋め込みできる　https://atmarkit.itmedia.co.jp/ait/articles/1206/01/news143_5.html
// ドラッグアンドドロット https://gist.github.com/hashrock/0e8f10d9a233127c5e33b09ca6883ff4
// svgエディタ作った人 https://hashrock.hatenablog.com/entry/2017/12/04/215559
// svg詳しい基礎解説 https://www.webdesignleaves.com/pr/html/svg_basic.html
// rust <-> js 配列の受け渡し https://ykicisk.hatenablog.com/entry/2017/04/30/195824
// ↑Js側で配列のメモリ確保してそのポインタをRsutに渡さないといけないっぽいのでめんどくさい

// マウスイベントはmouseDown, mouseUp, onClickの順番で動作する．
// また人間側の意味のクリック（短時間でボタンかちっ）とドラッグアンドドロップ（長時間でボタンかちっ）
// はPCからすればどちらも同じ動きなのでクリックしたつもりでもめちゃくちゃ短いドラッグアンドドロップだと思われてしまう
// だからクリックしたときにもmouseDownに設定しているstartDragが呼び出されてしまう．
// つまりドロップしたときにblueからblackに戻ってしまう現象はisDraggingのドラッギング状態を管理することでは，解決できない
// クリックとドラッグアンドドロップをPC側が区別できるようにしない限り他の方法でも解決できない．
// だから今はクリックしなおしで選択解除することはやめて，間違えたら一度全解除する仕様にする．その方が気持ち悪くない

// やること
// コントローラをクリックしやすくする（svgはcss効かない）
// どっかの無料サーバーに挙げる（demoで触れるように）
// ラダー図に出力(jpgかpngかpdfなんならsvgでもおっけー)

interface Circle {
  id: number;
  cx: number;
  cy: number;
  r: number;
  stroke: string;
  name: string,
}

// Circle型かを判定する型ガード関数
function isCircle(value: unknown): value is Circle {
  // 値がオブジェクトであるかの判定
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { id, cx, cy, r, stroke, name } = value as Record<keyof Circle, unknown>;
  // nameプロパティーが文字列型かを判定
  if (typeof id !== "number") {
    return false;
  }
  // gradeプロパティーが数値型かを判定
  if (typeof cx !== "number") {
    return false;
  }
  if (typeof cy !== "number") {
    return false;
  }
  if (typeof r !== "number") {
    return false;
  }
  if (typeof stroke !== "string") {
    return false;
  }
  if (typeof name !== "string") {
    return false;
  }
  return true;
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

// Circle型かを判定する型ガード関数
function isRect(value: unknown): value is Rect {
  // 値がオブジェクトであるかの判定
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { id, x, y, width, height, stroke, name } = value as Record<keyof Rect, unknown>;
  // nameプロパティーが文字列型かを判定
  if (typeof id !== "number") {
    return false;
  }
  // gradeプロパティーが数値型かを判定
  if (typeof x !== "number") {
    return false;
  }
  if (typeof y !== "number") {
    return false;
  }
  if (typeof width !== "number") {
    return false;
  }
  if (typeof height !== "number") {
    return false;
  }
  if (typeof stroke !== "string") {
    return false;
  }
  if (typeof name !== "string") {
    return false;
  }
  return true;
}

interface Arc {
  id: number;
  c_id: number;
  r_id: number;
  arrow: 1 | -1;
  d: string,
  stroke: string;
  stroke_dasharray: number;
}

function Canvas() {

  const BEZIER_PARAM = 1.3; // 小さくすると逆に離れてても小さくくっつく．実験的に調整する．
  const SELECTED_COLOR = "blue";
  const CONFLICT_COLOR = "orange";
  const [circleId, setCircleId] = useState(0);
  const [rectId, setRectId] = useState(0);
  const [arcId, setArcId] = useState(0);

  //以下Zoom実装
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [viewBox, setViewBox] = useState('0 0 1200 677');
  
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

  const [conflictedCircle, setConflictedCircle] = useState<Circle[]>([]);

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
        id: circleId,
        cx: newX,
        cy: newY,
        r: placeR,
        stroke: "black",
        name: circleName,//String(circleId),//circleName,
      };
      setCircleId(circleId => circleId+1);
      setCircles([...circles, newCircle]);
      setIsCreatingCircle(false);
      setCircleName("");
    }
  };

  const handleSelectCircle = (circle: Circle) => {   
    // 競合選択用
    if (activeSection === "conflict") {
      //console.log(activeSection);
      setIsCreatingCircle(false);
      setIsCreatingRect(false);
      setIsCreatingArc(false);
      setConflictedCircle([...conflictedCircle, circle]);
      const updatedCircles = circles.map(c => {
        if (c.id === circle.id && circle.stroke === "black") {
          return {...c, stroke: CONFLICT_COLOR};
        }
        else if (c.id === circle.id && circle.stroke === CONFLICT_COLOR) {
          return {...c, stroke: "black"};
        }
        return c
      });
      setCircles(updatedCircles);
    }
    else if (activeSection === "model") { // 競合選択じゃないとき
      setSelectedCircle([...selectedCircle, circle]);
      //console.log("onClick");
      /*const updatedCircles = circles.map(c => {
        if (c.id === circle.id && circle.stroke === "black") {
          return {...c, stroke: SELECTED_COLOR};
        }
        else if (c.id === circle.id && circle.stroke === SELECTED_COLOR) {
          return {...c, stroke: "black"};
        }
        return c
      });*/
      const updatedCircles = circles.map(c => c.id === circle.id ? {...c, stroke: SELECTED_COLOR} : c);
      setCircles(updatedCircles);
      setSelectedShape([...selectedShape, "circle"]);
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
    //console.log("Start Drag");
    if (svgRef.current === null || draggedElem === null) return;
    const point = svgRef.current.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const cursor = point.matrixTransform(
      svgRef.current.getScreenCTM()?.inverse()
    );
    
    const mousemove = (event: MouseEvent) => {
      //console.log("moving");
      event.preventDefault();
      point.x = event.clientX;
      point.y = event.clientY;
      const newCursor = point.matrixTransform(
        svgRef.current?.getScreenCTM()?.inverse()
      );

      const delta = {x: newCursor.x - cursor.x, y: newCursor.y - cursor.y};

      const updatedCircles = circles.map((c) => 
        c.stroke === SELECTED_COLOR ? {...c, cx: c.cx + delta.x, cy: c.cy + delta.y} : c
      );
      setCircles(updatedCircles);

      const updatedRects = rects.map(r =>
        r.stroke === SELECTED_COLOR ? {...r, x: r.x + delta.x, y: r.y + delta.y} : r
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
      //console.log("mouse up");
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
        id: rectId,
        x: newX - transitionWidth/2,
        y: newY - transitionHeight/2,
        width: transitionWidth,
        height: transitionHeight,
        stroke: "black",
        name: rectName,//String(rectId),//rectName,
      };
      setRectId(rectId => rectId+1);
      setRects([...rects, newRect]);
      setIsCreatingRect(false);
      setRectName("");
    }
  };

  const handleSelectRect = (rect: Rect) => {
    setSelectedRect([...selectedRect, rect]);
    const updatedRects = rects.map(r =>
      r.id === rect.id ? {...r, stroke: SELECTED_COLOR} : r
    );
    setRects(updatedRects);
    setSelectedShape([...selectedShape, "rect"]);
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
      circle.stroke === SELECTED_COLOR ? { ...circle, stroke: "black" } : circle
    );
    setCircles(updatedCircles);
    // 四角選択解除
    setSelectedRect([]);
    setSelectedShape([]);
    const updatedRects = rects.map((rect) =>
      rect.stroke === SELECTED_COLOR ? { ...rect, stroke: "black" } : rect
    );
    setRects(updatedRects);
  }


  const handleCreateArc = useCallback((e: MouseEvent) => {
    if (!isCreatingArc) return;
    console.log("===========");
    console.log(circles);
    console.log(rects);
    console.log(arcs);
    console.log("===========");
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
          id: arcId,
          c_id: c_id,
          r_id: r_id,
          arrow: 1,
          d: //`M${spx},${spy} C${shx},${shy} ${ehx},${ehy} ${epx},${epy}`,
          `M${spx},${spy} C${c1x},${c1y} ${c2x},${c2y} ${epx},${epy}`,
          stroke: "black",
          stroke_dasharray: 0
        };
        setArcId(arcId => arcId+1);
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
          id: arcId,
          c_id: c_id,
          r_id: r_id,
          arrow: -1,
          d: //`M${spx},${spy} C${shx},${shy} ${ehx},${ehy} ${epx},${epy}`,
          `M${spx},${spy} C${c1x},${c1y} ${c2x},${c2y} ${epx},${epy}`,
          stroke: "black",
          stroke_dasharray: 0,
        };
        setArcId(arcId => arcId+1);
        setArcs([...arcs, newArc]);
        setIsCreatingArc(false);
      }
      // 円選択解除
      setSelectedCircle([]);
      setSelectedShape([]);
      const updatedCircles = circles.map((circle) =>
        circle.stroke === SELECTED_COLOR ? { ...circle, stroke: "black" } : circle
      );
      setCircles(updatedCircles);
      // 四角選択解除
      setSelectedRect([]);
      setSelectedShape([]);
      const updatedRects = rects.map((rect) =>
        rect.stroke === SELECTED_COLOR ? { ...rect, stroke: "black" } : rect
      );
      setRects(updatedRects);     
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
      a.id === arc.id ? {...a, stroke: SELECTED_COLOR} : a
    );
    setArcs(updatedArcs);
  }

  // ここからhandleContextMenuまでcircleとrectは共通処理
  // 選択解除の処理を追加する
  const handleDeselectShape = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest("circle") && !target.closest("rect") && !target.closest("path") && (selectedCircle.length > 0 || conflictedCircle.length > 0)) {
      // 円選択解除
      setSelectedCircle([]);
      setSelectedShape([]);
      const updatedCircles = circles.map((circle) => {
        if (circle.stroke === SELECTED_COLOR) {
          return {...circle, stroke: "black"};
        }
        else if (circle.stroke === CONFLICT_COLOR) {
          if (activeSection === "conflict" && !target.closest("li")) {
            return {...circle, stroke: "black"};
          }
        }
        return circle;
      })
      const updatedConflictedCircles = circles.filter(c => c.stroke === CONFLICT_COLOR);
      setConflictedCircle(updatedConflictedCircles);
      setCircles(updatedCircles);
    }
    if (!target.closest("circle") && !target.closest("rect") && !target.closest("path") && selectedRect.length > 0) {
      // 四角選択解除
      setSelectedRect([]);
      setSelectedShape([]);
      const updatedRects = rects.map((rect) =>
        rect.stroke === SELECTED_COLOR ? { ...rect, stroke: "black" } : rect
      );
      setRects(updatedRects);
    }
    if (!target.closest("circle") && !target.closest("rect") && !target.closest("path") && selectedArc.length > 0) {
      // 矢印選択解除
      setSelectedArc([]);
      const updatedArcs = arcs.map((arc) =>
        arc.stroke === SELECTED_COLOR ? { ...arc, stroke: "black" } : arc
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
    if (selectedCircle.length > 0 || selectedRect.length > 0 || selectedArc.length > 0) {
      const contextMenu = document.getElementById("context-menu");
      if (contextMenu) {
        contextMenu.style.display = "black";
        contextMenu.style.top = `${newY}px`;
        contextMenu.style.left = `${newX}px`;
      }
    }
  };

  // 図形削除
  const handleDeleteShape = () => {
    let updatedCircles = circles.filter((circle) => circle.stroke !== SELECTED_COLOR);    
    const updatedRects = rects.filter((rect) => rect.stroke !== SELECTED_COLOR);
    setCircles(updatedCircles);
    setRects(updatedRects);

    // 連結するアークも削除
    const updatedArcsForCircle = arcs.filter(a => selectedCircle.every(c => c.id !== a.c_id));
    const updatedArcsForRect = arcs.filter(a => selectedRect.every(r => r.id !== a.r_id));
    const updatedArcsForSelf = arcs.filter((arc) => arc.stroke !== SELECTED_COLOR);
    if (selectedCircle.length > 0) {
      setArcs(updatedArcsForCircle);
    }
    else if (selectedRect.length > 0) {
      setArcs(updatedArcsForRect);
    }
    else {
      setArcs(updatedArcsForSelf);
    }

    setSelectedCircle([]);
    setSelectedRect([]);
    setSelectedArc([]);
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
  

  // コントローラ計算
  const [D, setD] = useState<number[][]>([[]]);
  const [L, setL] = useState<number[]>([]);
  const [Dc, setDc] = useState<number[]>([]);
  const handleCreateController = () => {
    // ペトリネット接続行列
    console.log(circles);
    console.log(rects);
    console.log(arcs);
    let array_1d: number[] = [];
    const array_2d: number[][] = [];
    let pushed_some = false;
    circles.forEach(c => {
      array_1d = [];// array_1dを初期化
      rects.forEach(r => {
        pushed_some = false;
        arcs.some(a => {
          if (a.c_id === c.id && a.r_id === r.id) {
            if (a.arrow === 1) {
              array_1d.push(1);// 行列に1をpush
              pushed_some = true;
              return true;
            }
            else if (a.arrow === -1) {
              array_1d.push(-1);// 行列に-1をpush
              pushed_some = true;
              return true;
            }
          }
        });
        if (!pushed_some) {
            array_1d.push(0);
          }
      })
      array_2d.push(array_1d);// array_2dにarray1dをpush
    });
    setD(array_2d);
    console.log(array_2d);

    // 制約するプレース
    let arrayForConflict: number[] = [];
    let pushed_one = false;
    circles.forEach(c => {
      pushed_one = false;
      /*
      conflictedCircle.some(conflict_c => {
        if (c.id === conflict_c.id) {
          arrayForConflict.push(1);
          pushed_one = true;
          return true; // break
        }
      });*/
      if (c.stroke === CONFLICT_COLOR) {
        arrayForConflict.push(1);
        pushed_one = true;
      }
      if (!pushed_one) {
        arrayForConflict.push(0);
      }
    });
    setL(arrayForConflict);
    console.log(arrayForConflict);

    var arrayForDc: number[] = [];
    for (var i = 0; i < array_1d.length; i++){
      arrayForDc[i] = 0; // 初期化
    }
    
    // コントローラの計算
    for (var i = 0; i < array_1d.length; i++) {
      for (var j = 0; j < array_2d.length; j++) {
        arrayForDc[i] += (-1*arrayForConflict[j]) * array_2d[j][i];
      }
    }
    //calculate_controller(array_1d, array_1d);
    console.log(arrayForDc);
    setDc(arrayForDc);

    // コントローラ描画
    // コントローラに接続するプレースとアークの取り出し
    const newController: Circle = {
      id: circleId,
      cx: 400,
      cy: 400,
      r: placeR,
      stroke: "black",
      name: "Controller"+circleId,
    };
    setCircleId(circleId => circleId+1);
    setCircles([...circles, newController]);
    //const rectForController = rects.filter(r => arrayForDc[r.id] !== 0);

    // コントローラをDcに従いアークで繋ぐ
    let counter: number = 0;
    rects.forEach(r => {
      if (arrayForDc[r.id] === 1) {
        const spx = newController.cx + newController.r;
        const spy = newController.cy;
        const epx = r.x;
        const epy = r.y + r.height/2;
        const shx = (spx + epx) / 2;
        const shy = spy;
        const ehx = (spx + epx) / 2;
        const ehy = epy;

        // 3次にする
        const dx = epx - spx;
        const dy = epy - spy;
        const d = Math.sqrt(dx*dx + dy*dy);

        const c1x = spx + (d/BEZIER_PARAM);
        const c1y = spy;
        const c2x = epx - (d/BEZIER_PARAM);
        const c2y = epy;

        const newArc: Arc = {
          id: arcId+counter,
          c_id: newController.id,
          r_id: r.id,
          arrow: 1,
          d: //`M${spx},${spy} C${shx},${shy} ${ehx},${ehy} ${epx},${epy}`,
          `M${spx},${spy} C${c1x},${c1y} ${c2x},${c2y} ${epx},${epy}`,
          stroke: "black",
          stroke_dasharray: 2,
        };
        counter += 1;
        setArcId(arcId => arcId+1);
        setArcs(arcs => [...arcs, newArc]);
      }
      else if (arrayForDc[r.id] === -1) {
        const spx = r.x + r.width;
        const spy = r.y + r.height/2;
        const epx = newController.cx - newController.r;
        const epy = newController.cy;
        const shx = (spx + epx) / 2;
        const shy = spy;
        const ehx = (spx + epx) / 2;
        const ehy = epy;

        // 3次にする
        const dx = epx - spx;
        const dy = epy - spy;
        const d = Math.sqrt(dx*dx + dy*dy);

        const c1x = spx + (d/BEZIER_PARAM);
        const c1y = spy;
        const c2x = epx - (d/BEZIER_PARAM);
        const c2y = epy;

        const newArc: Arc = {
          id: arcId+counter,
          c_id: newController.id,
          r_id: r.id,
          arrow: -1,
          d: //`M${spx},${spy} C${shx},${shy} ${ehx},${ehy} ${epx},${epy}`,
          `M${spx},${spy} C${c1x},${c1y} ${c2x},${c2y} ${epx},${epy}`,
          stroke: "black",
          stroke_dasharray: 2
        };
        counter += 1;
        setArcId(arcId => arcId+1);
        setArcs(arcs => [...arcs, newArc]);
      }
    });
    // idエラー出るなら
    // setArcId(arcId => arcId+counter) 最後に一気に次のアークまですっ飛ばすIDの処理にする
    // controllerのアークはarcID+counterなので中身のsetArcId(arcId => arcId+1)で更新されてないのであれば問題ない
  }

  // ダウンロード用関数
  const downloadSVG = () => {
    const svgElement = svgRef.current;
    if (!svgElement) return;
    
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = "petrinet.svg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // アップロード用関数
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const svgString = event.target?.result as string;
        parseAndAddSVGElements(svgString);
      };
      reader.readAsText(file);
    }
  };

  const parseAndAddSVGElements = (svgString: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgElements = doc.getElementsByTagName('g')[0]?.childNodes;
    //console.log(doc.getElementsByTagName('g')[0].childNodes);
  
    const parsedCircles: Circle[] = [];
    const parsedRects: Rect[] = [];
    const parsedArcs: Arc[] = [];
    let counter_c: number = 0;
    let counter_r: number = 0;
    let counter_a: number = 0;
    if (svgElements) {
      console.log(svgElements.length);
      for (let i = 0; i < svgElements.length; i++) {
        const svgElement = svgElements[i] as HTMLElement;
        if (svgElement.children[0]?.nodeName === 'circle') { // [1]にはtextが入ってる
          //console.log("I'm circle");
          const circle: Circle = {
            id: circleId+counter_c,
            cx: parseFloat(svgElement.children[0]?.getAttribute('cx') || '0'),
            cy: parseFloat(svgElement.children[0]?.getAttribute('cy') || '0'),
            r: parseFloat(svgElement.children[0]?.getAttribute('r') || '0'),
            stroke: 'black',
            name: svgElement.children[1].childNodes[0]?.nodeValue ? svgElement.children[1].childNodes[0].nodeValue : '',
          };
          parsedCircles.push(circle);
          counter_c += 1;
          setCircleId((prevId) => prevId + 1);
        } else if (svgElement.children[0]?.nodeName === 'rect') {
          //console.log("I'm rect");
          const rect: Rect = {
            id: rectId+counter_r,
            x: parseFloat(svgElement.children[0]?.getAttribute('x') || '0'),
            y: parseFloat(svgElement.children[0]?.getAttribute('y') || '0'),
            width: parseFloat(svgElement.children[0]?.getAttribute('width') || '0'),
            height: parseFloat(svgElement.children[0]?.getAttribute('height') || '0'),
            stroke: 'black',
            name: svgElement.children[1].childNodes[0]?.nodeValue ? svgElement.children[1].childNodes[0].nodeValue : '',
          };
          parsedRects.push(rect);
          counter_r += 1;
          setRectId((prevId) => prevId + 1);
        } else if (svgElement.children[0]?.nodeName === 'path') {
          // Parse and add arcs
          //console.log("I'm path");
          const d = svgElement.children[0]?.getAttribute('d') || '';
          const stroke = svgElement.children[0]?.getAttribute('stroke') || 'black';
          const strokeDashArray = parseFloat(svgElement.children[0]?.getAttribute('stroke-dasharray') || '0');
          let arrow: 1 | -1;
          if (svgElement.children[1].childNodes[0].nodeValue === "1") arrow = 1;
          else if (svgElement.children[1].childNodes[0].nodeValue === "-1") arrow = -1;
          else arrow = 1;
          console.log(svgElement.children[1].childNodes[0]);

          // Extract relevant information from the 'd' attribute
          const match = d.match(/M([\d.]+),([\d.]+) C([\d.]+),([\d.]+) ([\d.]+),([\d.]+) ([\d.]+),([\d.]+)/);
          if (match) {
            const [, spx, spy, c1x, c1y, c2x, c2y, epx, epy] = match.map(parseFloat);
            let c_id;
            let r_id;
            if (arrow === 1) {
              c_id = findCircleIdByPosition(parsedCircles, spx, spy);
              r_id = findRectIdByPosition(parsedRects, epx, epy, arrow);
            }
            else if (arrow === -1) {
              c_id = findCircleIdByPosition(parsedCircles, epx, epy);
              r_id = findRectIdByPosition(parsedRects, spx, spy, arrow);
            }
          
            const newArc: Arc = {
              id: arcId+counter_a,
              c_id: c_id ? c_id : 0,
              r_id: r_id ? r_id : 0,
              arrow,
              d,
              stroke,
              stroke_dasharray: strokeDashArray,
            };
            counter_a += 1;
            parsedArcs.push(newArc);
            setArcId((prevId) => prevId + 1);
          }
        }
      }
    }
  
    // Update state with parsed elements
    setCircles([...circles, ...parsedCircles]);
    setRects([...rects, ...parsedRects]);
    setArcs([...arcs, ...parsedArcs]);
  };

  // Helper functions to find circle and rect IDs by position
  const findCircleIdByPosition = (parsedCircles: Circle[], x: number, y: number): number | undefined => {
    // 誤差±5で取ってるから危ない時あるかも（重なってたりしなかったらよっぽど大丈夫そう）
    const foundCircle = parsedCircles.find(c => 
      c.r-5 <= Math.abs(x - c.cx) && Math.abs(x - c.cx) <= c.r+5 && -5 <= y - c.cy && y - c.cy <= 5);
    return foundCircle ? foundCircle.id : 0;
  };

  // rectのx,y座標は左上
  const findRectIdByPosition = (parsedRects: Rect[], x: number, y: number, arrow: 1 | -1): number | undefined => {
    if (arrow === 1) {
      const foundRect = parsedRects.find(r => x-5 <= r.x && r.x <= x+5 && y-5 <= r.y + r.height/2 && r.y + r.height/2 <= y+5);
      return foundRect ? foundRect.id : 0;
    }
    else if (arrow === -1) {
      const foundRect = parsedRects.find(r => x-5 <= r.x + r.width && r.x + r.width <= x+5 && y-5 <= r.y + r.height/2 && r.y + r.height/2 <= y+5);
      return foundRect ? foundRect.id : 0;
    }
  };

  
  // ラダー図に変換
  // ペトリネットの時点で上から下，左から右の順にidを振りなおさなけらば，
  // ラダー図に変換したときにきれいに上から下にならないが，
  // ラダー図は上から下にループしているので動作上は問題ない．（はず）
  // なので今回はidがバラバラなら，ラダー図もバラバラに出力されてもしかたないやり方でやる
  // でも順番にペトリネットを書いていけばラダー図もきれいに上から下に流れるはず
  const handleChangeToLader = () => {

  }

  const ladder_input_a = () => {
    return (
      <g>
        <path></path>
      </g>
    )
  }


  return (
  
    <div >

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
              <br />
              {(selectedCircle.length > 0 || selectedRect.length > 0 || selectedArc.length > 0) && (!isCreatingArc) && (
                  <button className="deleteButton" onClick={() => {
                        handleDeleteShape();
                      }}>削除</button>
              )}
            </div>
          )}
          {activeSection === "conflict" && (
            <div className='SelectConflict'>
              <h3>競合するプレースを選択してください</h3>
            </div>
          )}
          {activeSection === "controller" && (
            <div className='CreateController'>
              <button name='CreateController' onClick={handleCreateController}>コントローラを生成</button>
            </div>
          )}
          {activeSection === "ladder" && (
            <div className='ChangeLadder'>
              <button name='ChangeLadder' onClick={handleChangeToLader}>ラダー図へ　変換</button>
            </div>
          )}
          {activeSection === "file" && (
            <div className='FileOperation'>
              {/*<label htmlFor="file-download-start" className="btn">
                <input id="file-download-start" type="file" accept=".svg"/>
                <span data-en="Download file">ファイルを　ダウンロード</span>
              </label>
              <label htmlFor="file-upload-start" className="btn">
                <input id="file-upload-start" type="file" accept=".svg"/>
                <span data-en="Upload file">ファイルをアップロード</span>
              </label>*/}
              <button name='FileDownload' onClick={downloadSVG}>ファイルを　ダウンロード</button>
              <label htmlFor="file-upload-start" className="btn">
                <input id="file-upload-start" type="file" accept=".svg" onChange={handleFileUpload}/>
                <span data-en="Upload file">ファイルをアップロード</span>
              </label>
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
      <svg className="svg_area" width={1200} height={677} onClick={(e) => {
                                      handleCreateCircle(e, svgRef.current);
                                      handleCreateRect(e, svgRef.current);
                                    }} viewBox={viewBox} ref={svgRef}
      >
        <g>
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
                /*onContextMenu={(e) => handleContextMenu(e, svgRef.current)}*/
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
                /*onContextMenu={(e) => handleContextMenu(e, svgRef.current)}*/
                ref={(e) => (svgRectElemRef.current = e ? e: null)}
                onMouseDown={(e) => startDrag(e, svgRectElemRef.current)}
              />
              <text x={rect.x + rect.width/2 + transitionNameX} y={rect.y - transitionNameY} fontSize={nameFontSize} textAnchor="middle">{rect.name}</text>
            </g>
            
          ))}
          {arcs.map((arc) => (
            <g>
              <path
                key={arc.id}
                d={arc.d}
                stroke={arc.stroke}
                onClick={() => handleSelectArc(arc)}
                /*onContextMenu={(e) => handleContextMenu(e, svgRef.current)}*/
                fill="transparent"
                strokeWidth={arcStrokeWidth}
                strokeDasharray={arc.stroke_dasharray}
              />
              <text x="0" y="0" fontSize="0">{arc.arrow}</text>
            </g>
            
          ))}
            {/*(selectedCircle.length > 0 || selectedRect.length > 0 || selectedArc.length > 0) && (
              <foreignObject className="DeleteButton" id="context-menu" style={{position: "relative"}}>
                <ul>
                  <li onClick={() => {
                        handleDeleteShape();
                      }}>削除</li>
                </ul>
              </foreignObject>
                    )*/}
        </g>
      </svg>

    </div>
    
  );
};

export default Canvas;