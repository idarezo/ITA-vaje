import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function PropertyMfWrapper() {
  const ref = useRef(null);
  const unmountRef = useRef(null);
  const navigate = useNavigate();

  const stored = sessionStorage.getItem("user");
  const user = stored ? JSON.parse(stored) : null;

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    let cancelled = false;

    import("property/mount")
      .then(({ mount }) => {
        if (!cancelled && ref.current) {
          unmountRef.current = mount(ref.current, { userId: user.id, userName: user.firstName });
        }
      })
      .catch(() => {
        if (!cancelled && ref.current) {
          ref.current.innerHTML =
            '<p style="color:#dc3545;text-align:center;margin-top:60px">Storitev za nepremičnine ni dosegljiva.<br><small>Zaženi: cd frontend/property-mf && npm start</small></p>';
        }
      });

    return () => {
      cancelled = true;
      if (unmountRef.current) {
        unmountRef.current();
        unmountRef.current = null;
      }
    };
  }, []);

  if (!user) return null;

  return <div ref={ref} />;
}
