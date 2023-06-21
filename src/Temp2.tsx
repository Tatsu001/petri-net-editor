import React, {useRef} from 'react';
import {UncontrolledReactSVGPanZoom} from 'react-svg-pan-zoom';
//https://github.com/dai-a/react_drag/commit/01161518db5c1d3f0b1a12de5549ce29bbb7fd6f?branch=01161518db5c1d3f0b1a12de5549ce29bbb7fd6f&diff=split
//これでdrag and dropやってみる
//react svg pan zoom ではzoomのみだけ(tool none)にし，drag and dropは上のをやってみる


export default function App() {
  const Viewer = useRef(null);

  return (
    <div>
      <h1>UncontrolledReactSVGPanZoom</h1>

      <UncontrolledReactSVGPanZoom
        ref={Viewer}
        width={500} height={500}
        onZoom={e => console.log('zoom')}
        onPan={e => console.log('pan')}
        onClick={event => console.log('click', event.x, event.y, event.originalEvent)}
        tool={'none'}
      >
        <svg width={617} height={316}>
          <g fillOpacity=".5" strokeWidth="4">
            <rect x="400" y="40" width="100" height="200" fill="#4286f4" stroke="#f4f142"/>
            <circle cx="108" cy="108.5" r="100" fill="#0ff" stroke="#0ff"/>
            <circle cx="180" cy="209.5" r="100" fill="#ff0" stroke="#ff0"/>
            <circle cx="220" cy="109.5" r="100" fill="#f0f" stroke="#f0f"/>
          </g>
        </svg>
      </UncontrolledReactSVGPanZoom>
    </div>
  )
}