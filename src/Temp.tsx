import React, {useState} from 'react';
import './Temp.css';

function Temp() {

    const [x1, setX1] = useState(100)
    const changeX1 = (x: string) => {
        console.log(x);
        setX1(Number(x));
    }

    const [active, setActive] = useState(false)


    return(
        <div>
            <svg width="300" height="300">
                <line x1={x1} y1="100" x2="200" y2="200" stroke="black"></line>
                <circle className={active ? "active" : ""} cx="150" cy="150" r="50" onClick={() => setActive(!active)}></circle>
            </svg>
            <div>
                <input type="range" value={x1} onChange={(e) => changeX1(e.target.value)}/>
            </div>
        </div>
    )
}
export default Temp;