import React from 'react'
import Login from './component/login'
import Footer from "../components/Footer/Footer"
import Header from '../components/Header'

export const metadata = {
  robots: {
    index: false,   // ❌ don't index this page
    follow: false,  // ❌ don't follow links on this page
  },
};

const page = () => {
  return (
    <div className='max-w-[1920px] mx-auto'>
      {/* <Navbar/> */}
      <Header />
      <div className='my-44'>
        <Login/>
      </div>
      <Footer/>
    </div>
  )
}

export default page
