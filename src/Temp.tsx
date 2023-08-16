import React, {useState} from 'react';
import './Temp.css';

interface Circle {
    id: number;
    cx: number;
    cy: number;
    r: number;
}

function Temp() {

    // 線をスライド
    const [x1, setX1] = useState(100);
    const changeX1 = (x: string) => {
        console.log(x);
        setX1(Number(x));
    };

    // 円をクリックで変化
    const [active, setActive] = useState(false);

    // 2つの線を繋ぐベジェ曲線
    const [circles, setCircles] = useState<Circle[]>([]);
    const newCircle1: Circle = {
        id: 1,
        cx: 300,
        cy: 300,
        r: 50,
    };
    const newCircle2: Circle = {
        id: 2,
        cx: 200,
        cy: 400,
        r: 50,
    };
    const createCircle = () => setCircles([...circles, newCircle1, newCircle2]);
    const [bezier, setBezier] = useState(``);
    const calculateCurve = (circle1: Circle, circle2: Circle) => {
        const spx = circle1.cx + circle1.r;
        const spy = circle1.cy;
        const epx = circle2.cx - circle2.r;
        const epy = circle2.cy;
        const shx = (spx + epx) * 2;
        const shy = spy;
        const ehx = (spx + epx) / 2;
        const ehy = epy;

        const dx = epx - spx;
        const dy = epy - spy;
        const d = Math.sqrt(dx * dx + dy * dy);

        const c1x = spx + (d/1.5);
        const c1y = spy;
        const c2x = epx - (d/1.5);
        const c2y = epy;
        //setBezier(`M${spx},${spy} C${shx},${shy} ${ehx},${ehy} ${epx},${epy}`);
        setBezier(`M${spx},${spy} C${c1x},${c1y} ${c2x},${c2y} ${epx},${epy}`);
    }

    return(
        <div>
            <svg width="800" height="500">
                <line x1={x1} y1="100" x2="200" y2="200" stroke="black"></line>
                <circle className={active ? "active" : ""} cx="150" cy="150" r="50" onClick={() => setActive(!active)}></circle>
                {circles.map((c) => (
                    <circle cx={c.cx} cy={c.cy} r={c.r}></circle>
                ))}
                <path d={bezier} stroke="black" stroke-width="2" fill='transparent'></path>
            </svg>
            <div>
                <input type="range" value={x1} onChange={(e) => changeX1(e.target.value)}/>
                <button onClick={createCircle}>円作成</button>
                <button onClick={() => calculateCurve(circles[0], circles[1])}>繋ぐ</button>
            </div>
        </div>
    )
}
export default Temp;