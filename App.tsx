import React from 'react';
import { Generator } from './components/Generator';
import { Header } from './components/Header';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex flex-col">
      <Header />
      <main className="flex-grow flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <Generator />
      </main>
      <footer className="py-6 text-center text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} BriaGen Client. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;