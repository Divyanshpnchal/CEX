import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import "./index.css";

import { Signup } from './pages/signup';
import { Signin } from './pages/signin';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="signup" element={<Signup></Signup>} ></Route>;
        <Route path="signin" element={<Signin></Signin>} ></Route>;
      </Routes>

    </BrowserRouter>
  );
}

export default App;
