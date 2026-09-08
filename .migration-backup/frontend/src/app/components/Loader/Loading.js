import React from 'react'
import PuffLoader from 'react-spinners/PuffLoader';
const Loading = () => {
  return (
    <div className='flex items-center justify-center w-full h-full'>
      <PuffLoader color='#58CAAA'/>
    </div>
  )
}

export default Loading
