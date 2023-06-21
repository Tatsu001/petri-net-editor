import React, { useEffect, useRef, useState } from "react";

interface Rect {
  posx: number;
  posy: number;
}

/*interface DragOffset {
  x: number;
  y: number;
}*/

const Temp3: React.FC = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const svgRectElemRef = useRef<SVGRectElement | null>(null);
  const [rect1, setRect1] = useState<Rect>({ posx: 0, posy: 0 });

  const startDrag = (
    event: React.MouseEvent,
    draggedElem: SVGRectElement | null
  ) => {
    event.preventDefault();
    if (svgRef.current === null || draggedElem === null) return;
    const point = svgRef.current.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const cursor = point.matrixTransform(
      svgRef.current.getScreenCTM()?.inverse()
    );

    const offset = { x: cursor.x - rect1.posx, y: cursor.y - rect1.posy };

    const mousemove = (event: MouseEvent) => {
      event.preventDefault();
      point.x = event.clientX;
      point.y = event.clientY;
      const newCursor = point.matrixTransform(
        svgRef.current?.getScreenCTM()?.inverse()
      );

      setRect1({
        posx: newCursor.x - offset.x,
        posy: newCursor.y - offset.y,
      });
    };

    const mouseup = (event: MouseEvent) => {
      document.removeEventListener("mousemove", mousemove);
      document.removeEventListener("mouseup", mouseup);
    };

    document.addEventListener("mousemove", mousemove);
    document.addEventListener("mouseup", mouseup);
  };

  //以下Zoom実装
  const [viewBox, setViewBox] = useState('0 0 500 500');
  
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

  return (
    <div>
      <svg width={500} height={500} viewBox={viewBox} ref={svgRef}>
        <rect
          x={rect1.posx}
          y={rect1.posy}
          width="20"
          height="20"
          ref={(e) => (svgRectElemRef.current = e ? e : null)}
          onMouseDown={(e) => startDrag(e, svgRectElemRef.current)}
        />
      </svg>
      Position: <br />
      X: {rect1.posx}
      <br />
      Y: {rect1.posy}
    </div>
  );
};

export default Temp3;
