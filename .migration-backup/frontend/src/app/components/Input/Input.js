import React from "react";

const Input = React.forwardRef(
  (
    {
      className = "",
      sizeClass = "h-11 px-4 py-3",
      fontClass = "text-sm font-normal",
      rounded = "rounded-2xl",
      children,
      type = "text",
      ...args
    },
    ref
  ) => {
    return (
      <input
        ref={ref}
        type={type}
        className={`block w-full border border-neutral-300 focus:border-primary-500 focus:ring focus:ring-primary-200 focus:ring-opacity-50 bg-white ${rounded} ${fontClass} ${sizeClass} ${className}`}
        {...args}
      />
    );
  }
);

// Add a displayName for debugging
Input.displayName = "Input";

export default Input;
