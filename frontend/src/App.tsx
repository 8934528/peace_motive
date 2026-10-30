import { GameHeader } from "./components/GameHeader";
import { APP_VIEWS } from "./constants/gameConstants";
import { GameProvider } from "./context/GameContext";
import { useGame } from "./hooks/useGame";
import { Wifi, WifiOff } from "./icons/GameIcons";
import { CreateGame } from "./pages/CreateGame";
import { Game } from "./pages/Game";
import { GameResults } from "./pages/GameResults";
import { Home } from "./pages/Home";
import { JoinGame } from "./pages/JoinGame";
import { Lobby } from "./pages/Lobby";
import { ToastContainer } from "./toasts/ToastContainer";

function MotiveWorkspace() {
  const { view, connected } = useGame();

  const renderPage = () => {
    switch (view) {
      case APP_VIEWS.CREATE_GAME:
        return <CreateGame />;
      case APP_VIEWS.JOIN_GAME:
        return <JoinGame />;
      case APP_VIEWS.LOBBY:
        return <Lobby />;
      case APP_VIEWS.GAME:
        return <Game />;
      case APP_VIEWS.GAME_RESULTS:
        return <GameResults />;
      case APP_VIEWS.HOME:
      default:
        return <Home />;
    }
  };

  return (
    <main className="app-shell">
      <GameHeader />
      <div className="workspace">{renderPage()}</div>
      <ToastContainer />
      <footer className="app-footer">
        <span>
          MOTIVE <span className="footer-separator">/</span> SOCIAL DEDUCTION
          GAME
        </span>
        <span title="Server connection status">
          {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
          {connected ? "REAL-TIME CONNECTION" : "RECONNECTING"}
        </span>
      </footer>
    </main>
  );
}

export default function App() {
  return (
    <GameProvider>
      <MotiveWorkspace />
    </GameProvider>
  );
}
