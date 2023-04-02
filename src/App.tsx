import React, {useEffect, useState} from 'react';
import logo from './logo.svg';
import './App.css';
import init, { add } from "wasm-lib";

// https://www.tkat0.dev/posts/how-to-create-a-react-app-with-rust-and-wasm/
// wasm(Rust) + React導入参考サイト

/*
function App() {
  const [ans, setAns] = useState(0);
  useEffect(() => {
    init().then(() => {
      setAns(add(1, 1));
    })
  }, [])
  const [count, setCount] = useState(0);
  const countup = () => setCount((prev) => prev + 1);
  return ( 
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <p>1 + 1 = {ans}</p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
      <p>now count is: {count}</p>
      <button onClick={() => countup()}>+1</button>
    </div>
  );
}

export default App;
*/

/*
function App() {
  const [count, setCount] = useState(0);
  const countup = () => setCount((prev) => prev + 1);
  return ( 
    <div className="App">
      <p>now count is: {count}</p>
      <button onClick={() => countup()}>+1</button>
    </div>
  );
}

export default App;
*/




function App() {
  const [ans, setAns] = useState(0);
  useEffect(() => {
    init().then(() => {
      setAns(add(1, 1));
    })
  }, [])
  return ( 
    <div className="App">
      <p>add function from Rust: 1 + 1 = {ans}</p>
    </div>
  );
}

export default App;

