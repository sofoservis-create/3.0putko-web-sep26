/* eslint-disable react/display-name */

import React from "react";

const Textarea = React.forwardRef(({ className = "", children, ...args }, ref) => {
  return (
    <textarea
      ref={ref}
      style={{ padding: "6px" }}
      className={`block w-full text-sm rounded-2xl border-2 border-neutral-200 focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50 bg-white ${className}`}
      rows={4}
      {...args}
    >
      {children}
    </textarea>
  );
});

export default Textarea;
