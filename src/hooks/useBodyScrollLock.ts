import { useEffect } from "react";

let lockCount = 0;
let previousOverflow = "";

export default function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;

    if (lockCount === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.classList.add("saram-no-scroll");
      document.body.style.overflow = "hidden";
    }
    lockCount += 1;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.classList.remove("saram-no-scroll");
        document.body.style.overflow = previousOverflow;
      }
    };
  }, [active]);
}
