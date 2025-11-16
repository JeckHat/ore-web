import { useEffect, useState, useRef, useCallback } from "preact/hooks";
import Cell from "./components/Cell";

/**
 * Expected WebSocket message formats (JSON):
 * 1) Initial full state:
 *    { type: "init", gridSize: 5, cells: [{ index: 0, label: "#1", count:345, value:0.4125, disabled:false }, ...] }
 * 2) Single update:
 *    { type: "update", cell: { index: 3, label: "#4", count: 347, value: 0.4194, disabled: false } }
 *
 * If the server sends a different format, tweak parseMessage accordingly.
 */

const GRID_SIZE = 5;
const CELL_COUNT = GRID_SIZE * GRID_SIZE;

const makeEmptyCells = () =>
  Array.from({ length: CELL_COUNT }).map((_, i) => ({
    index: i,
    label: `#${i + 1}`,
    count: 0,
    value: "—",
    disabled: false,
    percentage: 0
  }));

export default function App() {
  const [cells, setCells] = useState(makeEmptyCells());
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const backoffRef = useRef(1000);
  const [preds, setPreds] = useState([]);
  const [round, setRound] = useState("");
  const [status, setStatus] = useState("waiting");
  const [winning, setWinning] = useState([]);
  const [total, setTotal] = useState({
    win: 0,
    round: 1,
    lostInArrow: 0,
  })
  const [winningTiles, setWinningTiles] = useState([])

  // change this to your WS endpoint
  const WS_URL = "ws://localhost:3000/ws";

  const applyInit = useCallback((payload) => {
    if (!payload.cells) return;
    const next = makeEmptyCells();
    payload.cells.forEach((c) => {
      if (typeof c.index === "number" && c.index >= 0 && c.index < CELL_COUNT) {
        next[c.index] = { index: c.index, label: c.label ?? `#${c.index + 1}`, count: c.count ?? 0, value: c.value ?? "—", disabled: !!c.disabled, percentage: 0 };
      }
    });
    setCells(next);
  }, []);

  const applyUpdate = useCallback((payload) => {
    const c = payload.cell;
    if (!c || typeof c.index !== "number") return;
    setCells((prev) => {
      const next = prev.slice();
      const idx = c.index;
      next[idx] = {
        ...next[idx],
        label: c.label ?? next[idx].label,
        count: c.count ?? next[idx].count,
        value: c.value ?? next[idx].value,
        disabled: !!c.disabled,
      };
      return next;
    });
  }, []);

  // parse incoming messages and dispatch
  const parseMessage = useCallback(
    (raw) => {
      let json;
      try {
        json = JSON.parse(raw);
      } catch (e) {
        console.warn("Invalid JSON from WS:", raw);
        return;
      }
  
      if (json.type === "init") {
        // hitWinningTiles(json)
        applyInit(json);
      } else if (json.type === "update") {
        applyUpdate(json);
      } else if (json.type === "predictions") {
        // <-- TAMBAHKAN INI
        if (Array.isArray(json.preds)) {
          setRound(json.round);
          setPreds(json.preds);
          setStatus(json.status);
          console.log("Predictions:", json.preds);
        }
        hitWinningTiles()
      } else if (json.type === "winning") {
        setStatus(json.status);
        setWinning(json.preds);
        console.log("Winning: ", json.preds[0]);
        setTotal({
          lostInArrow: json.lost_in_arrow,
          win: json.total_win,
          round: json.total_round
        })
      } else if (json.type === "waiting") {
        console.log("Status: ", json.status);
        setStatus(json.status);
      } else if (json.type === "snapshot") {
        setStatus(json.status);
        setTotal({
          lostInArrow: json.lost_in_arrow,
          win: json.total_win,
          round: json.total_round === 0? 1 : json.total_round
        })
        setPreds(json.preds)
      } else {
        console.warn("Unhandled WS message:", json);
      }
    },
    [applyInit, applyUpdate]
  );

  useEffect(() => {
    let mounted = true;
    function connect() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.addEventListener("open", () => {
        if (!mounted) return;
        setConnected(true);
        backoffRef.current = 1000;
        console.log("WS open");
        // ask server for initial state (optional)
        try {
          ws.send(JSON.stringify({ type: "get_init" }));
        } catch (e) {}
      });

      ws.addEventListener("message", (ev) => {
        parseMessage(ev.data);
      });

      ws.addEventListener("close", () => {
        if (!mounted) return;
        setConnected(false);
        console.log("WS closed — reconnecting...");
        // reconnect with backoff
        setTimeout(() => {
          backoffRef.current = Math.min(30000, backoffRef.current * 1.5);
          connect();
        }, backoffRef.current);
      });

      ws.addEventListener("error", (err) => {
        console.error("WS error", err);
        ws.close();
      });
    }

    connect();
    
    hitWinningTiles()

    return () => {
      mounted = false;
      setConnected(false);
      try {
        wsRef.current?.close();
      } catch (e) {}
    };
  }, [WS_URL, parseMessage]);

  // optional: send toggle/select commands to server
  const sendToggle = (index) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "toggle", index }));
  };

  const hitWinningTiles = async () => {
    console.log("HIT hitWinningTiles")
    const response = await fetch('/api/rounds/winning-tiles', {
      method: 'GET',
      credentials: 'include'
    })
    const resData = await response.json()
    setWinningTiles(resData.tiles)
    // applyInit(json, resData.tiles);
  }

  return (
    <div class="flex flex-col gap-4 lg:flex-row lg:justify-between xl:gap-8 w-full px-4 xl:px-8">
      <div class="flex flex-col gap-4 max-w-160 mx-auto pt-4 w-full">
        <div class="mx-auto w-full">
          <div class="flex items-center justify-between mb-2">
            <h2 class="text-lg font-semibold">ORE Predictions</h2>
            <div>
              <div class="text-sm text-gray-300">{connected ? "Connected" : "Disconnected"}</div>
              <div class="text-sm text-gray-300">Round: {round}</div>
            </div>
          </div>
          {status === "done" && <div class="flex items-center justify-center mb-3">
            {preds.includes(winning[0]) && <h2 class="text-lg font-semibold text-yellow-300">✅ CORRECT</h2>}
            {!preds.includes(winning[0]) && <h2 class="text-lg font-semibold text-red-600">❌ INCORRECT</h2>}
          </div>}
          <div class="mx-auto w-full grid grid-cols-5 grid-rows-5 gap-2 mb-4">
            {cells.map((cell) => {
              const isPredicted = preds.includes(cell.index);
              const isWinning = winning.includes(cell.index);
              return (
                <Cell
                  key={cell.index}
                  cell={{
                    ...cell,
                    percentage: winningTiles.length > 0? winningTiles[cell.index].percentage : 0
                  }}
                  status={status}
                  isWinning={isWinning}
                  selectedPred={isPredicted}
                  // className={isPredicted ? "border border-yellow-300" : ""}
                  onClick={() => {
                    if (!cell.disabled) sendToggle(cell.index);
                  }}
                />
              );
            })}
          </div>
          <div class="flex items-center justify-between mb-2">
            <div>
              <div class="text-sm text-gray-300">Total Round: {total.win}/{total.round}</div>
              <div class="text-sm text-gray-300">Diff: {total.round - total.win}</div>
            </div>
            <div>
              <div class="text-sm text-gray-300">Win Rate: {(total.win/total.round * 100).toFixed(2)}%</div>
              <div class="text-sm text-gray-300">Lost in arrow: {total.lostInArrow}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="flex flex-col gap-8 max-w-160 lg:max-w-128 w-full mx-auto pb-4 pt-4 xl:pt-8 pb-48 md:pb-24 lg:pb-16">
      <div class="text-sm text-gray-300">Win Rate: {(total.win/total.round * 100).toFixed(2)}%</div>
      </div>
    </div>
  );
}

