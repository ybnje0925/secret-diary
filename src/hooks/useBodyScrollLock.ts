import { useEffect } from "react";

export default function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;

    document.body.classList.add("saram-no-scroll");
    if (document.body.style.overflow === "hidden") {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.classList.remove("saram-no-scroll");
      if (document.body.style.overflow === "hidden") {
        document.body.style.overflow = "";
      }
    };
  }, [active]);
}
