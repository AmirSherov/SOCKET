import "./buttonhook.scss";
import { useNavigate } from "react-router-dom";

export default function Button({ onclick, children, type = 'button', ...props }) {
  return (
    <button
      type={type}
      onClick={onclick}
      {...props}
    >
      {children}
    </button>
  );
}
