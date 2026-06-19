import React, { createContext, useContext, useState, useCallback } from "react";

type PeriodFilterContextType = {
  dateStart: string;
  dateEnd: string;
  setDateStart: (d: string) => void;
  setDateEnd: (d: string) => void;
  setPeriod: (days: number) => void;
  setYesterday: () => void;
  setThisMonth: () => void;
};

const today = () => new Date().toISOString().split("T")[0];

const PeriodFilterContext = createContext<PeriodFilterContextType>({
  dateStart: new Date(Date.now() - 29 * 86400000).toISOString().split("T")[0],
  dateEnd: today(),
  setDateStart: () => {},
  setDateEnd: () => {},
  setPeriod: () => {},
  setYesterday: () => {},
  setThisMonth: () => {},
});

export function PeriodFilterProvider({ children }: { children: React.ReactNode }) {
  const [dateStart, setDateStart] = useState(new Date(Date.now() - 29 * 86400000).toISOString().split("T")[0]);
  const [dateEnd, setDateEnd] = useState(today());

  const setPeriod = useCallback((days: number) => {
    setDateStart(new Date(Date.now() - days * 86400000).toISOString().split("T")[0]);
    setDateEnd(today());
  }, []);

  const setYesterday = useCallback(() => {
    const y = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    setDateStart(y);
    setDateEnd(y);
  }, []);

  const setThisMonth = useCallback(() => {
    const m = new Date(); m.setDate(1);
    setDateStart(m.toISOString().split("T")[0]);
    setDateEnd(today());
  }, []);

  return (
    <PeriodFilterContext.Provider value={{ dateStart, dateEnd, setDateStart, setDateEnd, setPeriod, setYesterday, setThisMonth }}>
      {children}
    </PeriodFilterContext.Provider>
  );
}

export function usePeriodFilter() {
  return useContext(PeriodFilterContext);
}
