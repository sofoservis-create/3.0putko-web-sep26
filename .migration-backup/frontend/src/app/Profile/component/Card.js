"use client"
import React from 'react';
import PropTypes from 'prop-types';

const Card = ({ 
  title = 'Reservation requests', 
  Icon = null, 
  iconSize = '2xl', 
  customClasses = '', 
  notification = null, // Add a notification prop
  onClick 
}) => {
  return (
    <div 
      className={`relative bg-white rounded-lg shadow-md transition-transform transform hover:scale-105 hover:shadow-lg ${customClasses} 
        lg:w-full lg:h-44 lg:pl-10 lg:pt-10
        w-50 h-40 pl-3 pt-6
        xs:w-64 xs:h-32 xs:pl-4 xs:pt-4`}
      onClick={onClick}
    >
      {/* Render notification badge only if notification > 0 */}
      {notification > 0 && (
        <span className="absolute flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-green-500 rounded-full top-2 right-2">
          {notification}
        </span>
      )}
      
      {Icon && <Icon className={`text-${iconSize} text-gray-700`} />}
      {title && (
        <h1 className="mt-5 md:text-lg text-sm font-bold text-gray-800">
          {title}
        </h1>
      )}
    </div>
  );
};

Card.propTypes = {
  title: PropTypes.string,
  Icon: PropTypes.elementType,
  iconSize: PropTypes.string,
  customClasses: PropTypes.string,
  notification: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), // Allow numbers or strings
  onClick: PropTypes.func,
};

export default Card;
