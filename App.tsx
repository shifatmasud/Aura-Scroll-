
import React from 'react';
import ScrollingSections from './components/ScrollingSections';
import { SECTIONS_DATA } from './constants';

const App: React.FC = () => {
  return (
    <div className="bg-black text-white uppercase h-screen overflow-hidden">
      <ScrollingSections sections={SECTIONS_DATA} />
    </div>
  );
};

export default App;