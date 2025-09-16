import { useContext } from "react";
import lendContext from "./lendContext";

const useLendContext = () => {
  const context = useContext(lendContext);
  if (!context) {
    throw new Error("useLendContext must be used within a LendState provider");
  }
  return context;
};

export default useLendContext;
