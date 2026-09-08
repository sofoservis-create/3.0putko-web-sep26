"use client"
import React, { useState, useEffect } from 'react';
import Header from "../../components/Header/Header";
import Card from "./Card";
import Calender from './Calender';
import Reservation from './Reservation';
import { CalendarDays, CircleUserRound, ClipboardList, House, List, RefreshCcw, Undo, User } from 'lucide-react';

const Overview = () => {
  
  const [activePage, setActivePage] = useState(''); // Control the active page state
  const [currentDate, setCurrentDate] = useState(new Date());

  // Fetch the correct current date when the component mounts
  useEffect(() => {
    const now = new Date(); // Fetch the current date immediately
    setCurrentDate(now);
  }, []); // Empty dependency array ensures this runs only once when the component mounts

  const handleBack = () => {
    window.location.assign('/');
  };
  

  // Get day and month for display
  const day = currentDate.getDate();
  const month = currentDate.toLocaleString("default", { month: "long" });

  return (
    <div className="flex-1 p-4 sm:ml-64 bg-[#EEF1F5]">
      {/* Mobile menu button */}
      {/* Header */}
      <div className='hidden lg:inline'>
        <Header />
      </div>
      <div className="flex flex-row justify-between w-full lg:hidden">
        <House className="text-2xl text-gray-700 hover:text-black" />
        <List className="text-2xl text-gray-700 hover:text-black" />
        <Undo className="text-2xl text-gray-700 hover:text-black"    
          onClick={handleBack} 
        />
      </div>

      {/* Dynamic Page Rendering */}
      {activePage === '' && <Overview />}
      {activePage === 'reservation' && <Reservation />}
      {activePage === 'Calender' && <Calender />}

      {/* Main Content */}
      <div>
        <div className='flex justify-between mx-5 bg-[#EEF1F5] py-5 flex-row lg:flex-row items-center'>
          {/* Dynamic Date Display */}
          <div className='flex flex-row items-center gap-2 sm:gap-5'>
            <h1 className='text-[#292A34] text-6xl sm:text-8xl'>{day}</h1>
            <span className='text-[#292A34] text-lg sm:text-2xl'>{month}</span>
          </div>
          <div className='mt-4 sm:mt-0'>
            <CircleUserRound className="text-[#292A34] text-xl" />
            
          </div>
        </div>

        {/* Cards Grid */}
        <div className='grid grid-cols-2 lg:grid-cols-3 gap-5 bg-[#EEF1F5]'>
          {[
            { title: "Reservation requests", Icon: ClipboardList },
            { title: "Occupancy calendar", Icon: CalendarDays },
            { title: "Accommodation", Icon: House },
            { title: "Synchronization", Icon: RefreshCcw },
            { title: "My Public Profile", Icon: User }
            
          ].map(({ title, Icon }, index) => (
            <Card 
              key={index}
              title={title}
              Icon={Icon}
              iconSize="4xl"
              customClasses="bg-gray-100"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Overview;
