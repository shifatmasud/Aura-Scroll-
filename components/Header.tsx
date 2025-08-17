
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="fixed top-0 left-0 flex items-center justify-between px-[5%] w-full z-30 h-[7em] text-[clamp(0.66rem,2vw,1rem)] tracking-[0.5em]">
      <div
        id="site-logo"
        className="text-white no-underline font-semibold"
      >
        AS
      </div>
    </header>
  );
};

export default Header;
