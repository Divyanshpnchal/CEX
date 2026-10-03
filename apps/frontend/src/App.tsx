import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import "./index.css";

import { Signup } from './pages/signup';
import { Signin } from './pages/signin';
import { Home } from './pages/Home';
import { Wallet } from './pages/wallet';
import { Toaster } from "@/components/ui/sonner"
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="signup" element={<Signup></Signup>} ></Route>;
        <Route path="signin" element={<Signin></Signin>} ></Route>;
        <Route path="home" element={<Home></Home>} ></Route>
        <Route path="wallet" element={<Wallet></Wallet>} ></Route>
        
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
