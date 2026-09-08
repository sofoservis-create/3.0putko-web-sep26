import Button from "./Button";
import React from "react";

const ButtonThird = ({
  className = "text-neutral-700 border border-neutral-200",
  ...args
}) => {
  return <Button className={`ttnc-ButtonThird ${className}`} {...args} />;
};

export default ButtonThird;
