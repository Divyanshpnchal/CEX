import { Home } from "@/pages/Home";
import { Wallet } from "@/pages/wallet";
import { useNavigate } from "react-router-dom";

export function Navbar() {
  const navigate = useNavigate();
  
  
    return (
    <nav className="bg-neutral-primary fixed w-full z-20 top-0 start-0 border-b border-default sticky top-0">
      <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
        <div className="font-bold">
            CEX
        </div>

        <div className="hidden w-full md:block md:w-auto" id="navbar-default">
          <ul className="font-medium flex flex-col p-4 md:p-0 mt-4 border border-default rounded-base bg-neutral-secondary-soft md:flex-row md:space-x-8 rtl:space-x-reverse md:mt-0 md:border-0 md:bg-neutral-primary">
            <li>
                <button onClick={()=>{navigate("/wallet")}}>
                    Wallet
                </button>                
            </li>
            <li>
                <button onClick={()=>{navigate("/setting")}}>
                    Setting
                </button>                
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
