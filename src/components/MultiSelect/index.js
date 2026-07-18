/* eslint-disable react/prop-types */
import React, { useState } from "react";
import "./style.css"; // Import CSS file for custom styles
import Arrow from "./down.png";
import { truncateText } from "utils";
function MultiSelect(props) {
  const [isOpen, setIsOpen] = useState(false);
  const { options, data, setData, label, placeholder } = props;

  const handleOptionClick = (option, e) => {
    const check = e.target.checked;
    if (check) {
      const newData = [...data, option];
      setData(newData);
    } else {
      const newData = data.filter((item) => item.id !== option.id);
      setData(newData);
    }
  };

  return (
    <div className="flex flex-col w-full gap-2">
      <div className="flex flex-col w-full gap-2 ">
        <label htmlFor="cbvc" className="cursor-pointer text-sm text-text font-medium text-sm">
          {label}
        </label>
        <div
          className="cursor-pointer h-10 w-full outline-none pl-3 relative"
          style={{ border: "0.0625rem solid #d2d6da", borderRadius: "4px" }}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className={`absolute w-[90%] top-3 text-sm ${!data.length > 0 ? "" : "text-text"}`}>
            {data.length > 0
              ? truncateText(
                  data.map((items, i) => items.name + (i < data.length - 1 ? ", " : "")),
                  3
                )
              : placeholder}
          </span>
          <img
            src={Arrow}
            className={`absolute w-[24px] right-1 top-2 z-10 ${
              isOpen ? "rotate-180" : "rotate-0"
            } transition-all delay-100`}
          />
        </div>
      </div>

      <div
        className={`p-2 flex flex-col gap-2 max-h-[150px] overflow-y-auto dropdown ${
          isOpen ? "open" : ""
        } transition-all delay-150`}
        style={{
          border: "0.0625rem solid #d2d6da",
          borderRadius: "4px",
          height: isOpen ? "100%" : "0px",
        }}
      >
        {options?.map((items, i) => (
          <div className="flex justify-between" key={i}>
            <label className="cursor-pointer text-sm text-text font-medium" htmlFor={i}>
              {items.name}
            </label>
            <input
              type="checkbox"
              id={i}
              name="vehicle1"
              value="Bike"
              onClick={(e) => handleOptionClick(items, e)}
            ></input>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MultiSelect;
