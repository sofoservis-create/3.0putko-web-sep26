"use client";
//static import
import React, { useState, useContext, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from "../components/Header/Header";
import Card from "./component/Card";
import { FormContext } from '../FormContext';
import en from '../locales/en';
import sk from '../locales/sk';
import ProtectedRoute from '../ProtectedRoute';
import { CalendarDays, BookOpenText, Undo, Menu, Plus, House, LayoutDashboard, ClipboardList, User, RefreshCcw, Pencil, LockKeyhole, MessageCircle } from "lucide-react";

//dynamic import
import dynamic from "next/dynamic";
const UserGuide = dynamic(() => import("./component/UserGuide"), { ssr: false });
const ChangePassword = dynamic(() => import("./component/ChangePassword"), { ssr: false });
const MyProfile = dynamic(() => import("./component/MyProfile"), { ssr: false });
const EditProfile = dynamic(() => import("./component/EditProfile"), { ssr: false });
const AccommodationShow = dynamic(() => import("./component/AccommodationShow"), { ssr: false });
const AddAccommodation = dynamic(() => import("./component/AddAccommodation"), { ssr: false });
const Synchronization = dynamic(() => import("./component/Synchronization"), { ssr: false });
const Reservation = dynamic(() => import("./component/Reservation"), { ssr: false });
const Calender = dynamic(() => import("./component/Calender"), { ssr: false });
const Overview = dynamic(() => import("./component/Overview"), { ssr: false });
const Payments = dynamic(() => import("./component/Payments"), { ssr: false });
const Messages = dynamic(() => import("./component/Messages"), { ssr: false });

const ProfilePage = () => {
    
  const { selectedpage, updateSelectedpage ,notification,updateNotification } = useContext(FormContext); 
  const [activePage, setActivePage] = useState(' ');
  const [sidebarOpen, setSidebarOpen] = useState(false);  // State to track sidebar visibility
  const sidebarRef = useRef(null);  // Reference to sidebar for detecting clicks outside
  const router = useRouter(); 

  const translations = { en, sk }
  
  const { lang } = useContext(FormContext); // Get the `lang` value from FormContext
  const [language, setLanguage] = useState(lang || "sk"); // Initialize with context value or default to "en"
      
    // Update language state when `lang` changes in FormContext
    useEffect(() => {
      setLanguage(lang || "sk");
    }, [lang]);
      
    const t = translations[language];

  console.log("page,selected", selectedpage)
  const handleBack = () => {
    router.push('/');
  };

  useEffect(() => {
    if (selectedpage && selectedpage !== activePage) {
        setActivePage(selectedpage);
    }
  }, [selectedpage]);

  const handleCardClick = (page) => {
      setActivePage(page);
      updateSelectedpage(page);  // Update FormContext
  };

  const handlePageChange = (page) => {
      console.log("Active Page:", page); // Logs the selected page to the console
      setActivePage(page); // Update the active page state
  };
   
  // Close sidebar when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setSidebarOpen(false);  // Close the sidebar if clicking outside
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebarRef]);

  const [currentDate, setCurrentDate] = useState(new Date());

  // Fetch the correct current date when the component mounts
  useEffect(() => {
    const now = new Date(); // Fetch the current date immediately
    setCurrentDate(now);
  }, []); // Empty dependency array ensures this runs only once when the component mounts
  
  const markAs = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user")); // Retrieve user info
      const accommodationProviderId = user?._id; // Use the user's ID or another identifier
  
      if (!accommodationProviderId) {
        console.error("Accommodation provider ID not found.");
        return;
      }
  
      // Fetch notifications and mark them as read
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/notifications/notifications/read/${accommodationProviderId}`
      );
  
      if (response.ok) {
        const data = await response.json();
  
        console.log("Fetched and marked notifications as read:", data.notifications);
      } else {
        console.error("Failed to mark notifications as read.");
      }
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  };
  
  // Get day and month for display
  const day = currentDate.getDate();
  const month = currentDate.toLocaleString("default", { month: "long" });
  const [notifications, setNotification] = useState(0);
  const [hasPending, setHasPending] = useState(false);

  useEffect(() => {
    const userr = localStorage.getItem('user');
    if (userr) {
      const users = JSON.parse(userr);
      const userId = users._id;

      const fetchReservations = async () => {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/reservation/provider/${userId}`,
            {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
            }
          );

          if (!response.ok) throw new Error('Failed to fetch reservations');
          const result = await response.json();

          const pendingCount = result.filter(
            (reservation) => reservation.isApproved === "pending"
          ).length;

          setNotification(pendingCount);
          setHasPending(pendingCount > 0);
        } catch (error) {
          console.error('Error fetching reservations:', error);
        }
      };

      fetchReservations();
    }
  }, []);

  return (
    <ProtectedRoute allowedRoles={["host"]}>
      <div className="flex min-h-screen bg-[#FAFAFA]">
        {/* Sidebar */}
        <aside
          ref={sidebarRef}
          id="logo-sidebar"
          className={`fixed top-0 left-0 z-40 w-64 h-screen transition-transform bg-[#1E3E2B] border-r border-[#DFBA73]/20 shadow-xl ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } sm:translate-x-0`}
        >
          <div className="h-full px-4 py-6 overflow-y-auto flex flex-col justify-between">
            <div>
              <a href="/" className="flex items-center ps-2 mb-8 py-2 border-b border-[#DFBA73]/10 pb-5">
                <img
                  src="/putko.png"
                  alt="Putko Logo"
                  width={200}
                  height={100}
                  className="w-24 h-5 me-3 sm:h-8 object-contain brightness-0 invert"
                  loading="eager"
                />
              </a>

              <ul className="space-y-1.5 font-medium">
                {[
                  { icon: <LayoutDashboard className="w-5 h-5" />, text: `${t.Overview}`, href: "#", page: " " },
                  {
                    icon: <ClipboardList className="w-5 h-5" />,
                    text: `${t.ReservationRequests}`,
                    href: "#",
                    page: "Reservation requests",
                    hasNotification: true,
                  },
                  { icon: <User className="w-5 h-5" />, text: `${t.MyPublicProfile}`, href: "#", page: "MyProfile" },
                  { icon: <Plus className="w-5 h-5" />, text: `${t.AddNewAccommodation}`, href: "#", page: "AddAccommodation" },
                  { icon: <CalendarDays className="w-5 h-5" />, text: `${t.BookingCalendar}`, href: "#", page: "Occupancy calendar" },
                  { icon: <RefreshCcw className="w-5 h-5" />, text: `${t.CalenderSynchronization}`, href: "#", page: "Calendar synchronization" },
                  { icon: <House className="w-5 h-5" />, text: `${t.ManageListing}`, href: "#", page: "Accommodation" },
                  { icon: <Pencil className="w-5 h-5" />, text: `${t.PersonalProfile}`, href: "#", page: "EditProfile" },
                  { icon: <LockKeyhole className="w-5 h-5" />, text: `${t.ChangePassword}`, href: "#", page: "ChangePassword" },
                  { icon: <BookOpenText className="w-5 h-5" />, text: `${t.UserGuid}`, href: "#", page: "UserGuide" },
                  { icon: <ClipboardList className="w-5 h-5" />, text: `${t.Payments}`, href: "#", page: "Payments" },
                  { icon: <MessageCircle className="w-5 h-5" />, text: `${t.Messages}`, href: "#", page: "Messages" },
                ].map(({ icon, text, href, page, hasNotification }) => {
                  const isSelected = activePage === page;
                  return (
                    <li key={text} className="relative">
                      <Link
                        href={href}
                        className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                          isSelected 
                            ? "bg-[#DFBA73] text-[#1E3E2B] font-semibold shadow-md" 
                            : "text-[#FAFAFA]/80 hover:text-[#FAFAFA] hover:bg-[#DFBA73]/10"
                        }`}
                        onClick={() => {
                          handleCardClick(page);
                          setSidebarOpen(false);
                        }}
                      >
                        <span className={`${isSelected ? "text-[#1E3E2B]" : "text-[#DFBA73] group-hover:scale-105 transition-transform"}`}>
                          {icon}
                        </span>
                        <span className="text-sm tracking-wide">{text}</span>
                        
                        {hasNotification && hasPending && (
                          <span className={`absolute flex items-center justify-center w-5 h-5 text-[11px] font-bold transform -translate-y-1/2 rounded-full shadow-sm right-3 top-1/2 ${
                            isSelected ? "bg-[#1E3E2B] text-[#FAFAFA]" : "bg-[#DFBA73] text-[#1E3E2B]"
                          }`}>
                            {notifications}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-[#DFBA73]/10">
              <button
                onClick={handleBack}
                className="flex items-center gap-4 px-4 py-3 rounded-xl text-[#FAFAFA]/80 hover:text-[#FAFAFA] hover:bg-[#DFBA73]/10 w-full text-left transition-all"
              >
                <Undo className="w-5 h-5 text-[#DFBA73]" />
                <span className="text-sm font-medium tracking-wide">{t.ReturntoWeb}</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex flex-col flex-1 px-4 py-6 sm:px-8 sm:ml-64 text-black">
          <div className="w-full max-w-[1200px] mx-auto">
            
            {/* Mobile Top Navigation */}
            <div className="flex items-center justify-between p-4 mb-6 bg-white border border-gray-100 rounded-2xl shadow-sm md:hidden">
              <Menu
                className="text-2xl text-[#1E3E2B] cursor-pointer hover:text-[#DFBA73] transition-colors"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              />
              <div className="flex items-center space-x-6">
                <House
                  className="text-2xl text-[#1E3E2B] cursor-pointer hover:text-[#DFBA73] transition-colors"
                  onClick={() => setActivePage(" ")}
                />
                <Undo
                  className="text-2xl text-[#1E3E2B] cursor-pointer hover:text-[#DFBA73] transition-colors"
                  onClick={handleBack}
                />
              </div>
            </div>

            {/* Header Area (Overview default state) */}
            {activePage === " " && (
              <div className="hidden lg:block mb-8">
                <Header title={`${t.Overview}`} subtitle="" showAddButton={true} />
              </div>
            )}

            {/* Sub-page Renders (Encapsulated in clean design environments) */}
            <div className="rounded-2xl transition-all">
              {activePage === "" && <Overview onMenuClick={handlePageChange} />}
              {activePage === "Reservation requests" && <Reservation onMenuClick={handlePageChange} />}
              {activePage === "MyProfile" && <MyProfile onMenuClick={handlePageChange} />}
              {activePage === "Occupancy calendar" && <Calender onMenuClick={handlePageChange} />}
              {activePage === "Calendar synchronization" && <Synchronization onMenuClick={handlePageChange} />}
              {activePage === "AddAccommodation" && <AddAccommodation onMenuClick={handlePageChange} />}
              {activePage === "Accommodation" && <AccommodationShow onMenuClick={handlePageChange} />}
              {activePage === "EditProfile" && <EditProfile onMenuClick={handlePageChange} />}
              {activePage === "ChangePassword" && <ChangePassword onMenuClick={handlePageChange} />}
              {activePage === "UserGuide" && <UserGuide onMenuClick={handlePageChange} />}
              {activePage === "Payments" && <Payments onMenuClick={handlePageChange} />}
              {activePage === "Messages" && <Messages onMenuClick={handlePageChange} />}
            </div>

            {/* Interactive Dashboard Overview Grid Cards */}
            {activePage === " " && (
              <div className="py-2">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { title: `${t.ReservationRequests}`, Icon: ClipboardList, page: "Reservation requests", notification: notifications },
                    { title: `${t.BookingCalendar}`, Icon: CalendarDays, page: "Occupancy calendar" },
                    { title: `${t.ManageListing}`, Icon: House, page: "Accommodation" },
                    { title: `${t.CalenderSynchronization}`, Icon: RefreshCcw, page: "Calendar synchronization" },
                    { title: `${t.AddNewAccommodation}`, Icon: Plus, page: "AddAccommodation" },
                    { title: `${t.MyPublicProfile}`, Icon: User, page: "MyProfile" },
                    { title: `${t.PersonalProfile}`, Icon: Pencil, page: "EditProfile" },
                    { title: `${t.ChangePassword}`, Icon: LockKeyhole, page: "ChangePassword" },
                    { title: `${t.UserGuid}`, Icon: BookOpenText, page: "UserGuide" },
                    { title: `${t.Messages}`, Icon: MessageCircle, page: "Messages" },
                    { title: `${t.Payments}`, Icon: ClipboardList, page: "Payments" },
                  ].map(({ title, Icon, page, notification }, index) => (
                    <div 
                      key={index} 
                      className="group relative bg-white border border-gray-100 hover:border-[#DFBA73]/50 rounded-2xl p-1 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden"
                      onClick={() => handleCardClick(page)}
                    >
                      {/* Top Accent Strip */}
                      <div className="absolute top-0 left-0 w-full h-[4px] bg-[#1E3E2B] group-hover:bg-[#DFBA73] transition-colors" />
                      
                      <Card
                        title={title}
                        Icon={Icon}
                        iconSize="4xl"
                        customClasses="bg-transparent border-0 text-black group-hover:translate-x-1 transition-transform"
                        notification={notification}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default ProfilePage;