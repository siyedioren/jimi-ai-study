import { useEffect, useRef } from "react";

export function useAutoScroll(deps: React.DependencyList) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  }, deps);

  return ref;
}
