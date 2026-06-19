"use client";

import React from "react";

const FILTERS = ["Fortune Tiger", "Fortune Dragon", "Fortune Rabbit", "Fortune Mouse", "Fortune Ox", "Fortune Snake"];

const Filters: React.FC = () => {
  const [active, setActive] = React.useState<string | null>(null);

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <div className="flex flex-wrap gap-3">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActive(active === f ? null : f)}
            className={`rounded-lg px-4 py-2 text-sm ${
              active === f ? "bg-[#2F80FF] text-white" : "bg-[#272B35] text-white"
            } hover:bg-[#2F80FF] transition-colors`}
          >
            {f}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Filters;