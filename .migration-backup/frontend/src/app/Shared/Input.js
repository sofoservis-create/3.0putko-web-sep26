import React from "react";

const Input = React.forwardRef(({
  className = "",
  sizeClass = "h-11 px-4 py-3",
  fontClass = "text-sm font-normal",
  rounded = "rounded-2xl",
  children,
  type = "text",
  ...args
}, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      className={`block w-full border focus:ring focus:ring-opacity-50 bg-white ${rounded} ${fontClass} ${sizeClass} ${className}`}
      {...args}
    />
  );
});

// Set the display name for the component
Input.displayName = "Input";

export default Input;
