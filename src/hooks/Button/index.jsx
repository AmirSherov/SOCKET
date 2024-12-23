import "./buttonhook.scss";
import { useNavigate } from "react-router-dom";

export default function Button({ onClick, children, type = 'button', ...props }) {
  return (
    <button
      type={type}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}
