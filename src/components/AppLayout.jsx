import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export default function AppLayout({ children }) {
  const { user, signout } = useAuth();
  const navigate = useNavigate();

  const onSignOut = async () => {
    await signout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="font-semibold">Trading Log App</div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-400">{user?.name ?? user?.email}</span>
            <button
              onClick={onSignOut}
              className="rounded-lg px-3 py-1.5 border border-slate-700 hover:border-red-500/60 transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
