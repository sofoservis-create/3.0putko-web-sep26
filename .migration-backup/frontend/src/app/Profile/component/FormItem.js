import React from "react";
import Label from "../../Shared/Label";

const FormItem = ({ children, className = "", label, desc, isRequired = false  }) => {
  return (
    <div className={className}>
      {label && (
        <Label>
          {label} {isRequired && <span className="text-red-500">*</span>}
        </Label>
      )}
      <div className="mt-1">{children}</div>
      {desc && (
        <span className="block mt-3 text-xs text-neutral-500">
          {desc}
        </span>
      )}
    </div>
  );
};

export default FormItem;
