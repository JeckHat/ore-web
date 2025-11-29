import { useEffect, useState, useRef, useCallback } from "preact/hooks";
import Cell from "./components/Cell";

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

export default function Ore() {
  const [cells, setCells] = useState(makeEmptyCells());
  const [connected, setConnected] = useState(false);
  const [snapshot, setSnapshot] = useState({
    status: "init",
    round: 0,
    preds: [],
    totalRound: 1,
    totalWin: 0,
    win: 0,
    lose: 0,
    winInRow: 0,
    lostInRow: 0,
    winningSquare: 0
  })
  const [winInRow, setWinInRow] = useState({});
  const [lostInRow, setLostInRow] = useState({});
  const wsRef = useRef(null);
  const backoffRef = useRef(1000);
  const [winningTiles, setWinningTiles] = useState([])

  // change this to your WS endpoint
  const WS_URL = "wss://pool.ore-track.com/ws";

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

      console.log("json", json)
  
      if (json.type === "init") {
        // hitWinningTiles(json)
        applyInit(json);
      } else if (json.type === "update") {
        applyUpdate(json);
      } else if (json.type === "win_in_row") {
        console.log("list_in_row", json.list__in_row)
        setWinInRow(json.list_in_row);
      } else if (json.type === "lost_in_row") {
        console.log("list_in_row", json.list_in_row)
        setLostInRow(json.list_in_row);
      } else if (json.type === "snapshot") {
        if (json.rng_type === "ore") {
            setSnapshot({
                status: json.ore_snapshot.status,
                round: json.ore_snapshot.round,
                preds: json.ore_snapshot.preds,
                totalRound: json.ore_snapshot.total_round,
                totalWin: json.ore_snapshot.total_win,
                win: json.ore_snapshot.win,
                lose: json.ore_snapshot.lose,
                winInRow: json.ore_snapshot.win_in_row,
                lostInRow: json.ore_snapshot.lose_in_row,
                winningSquare: json.ore_snapshot.winning_square
            })
        }
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
    
    // hitWinningTiles()

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
              <div class="text-sm text-gray-300">Round: {snapshot?.round ?? 0}</div>
            </div>
          </div>
          {snapshot.status === "result" && <div class="flex items-center justify-center mb-3">
            {snapshot.preds.includes(snapshot.winningSquare) && <h2 class="text-lg font-semibold text-yellow-300">✅ CORRECT</h2>}
            {!snapshot.preds.includes(snapshot.winningSquare) && <h2 class="text-lg font-semibold text-red-600">❌ INCORRECT</h2>}
          </div>}
          <div class="mx-auto w-full grid grid-cols-5 grid-rows-5 gap-2 mb-4">
            {cells.map((cell) => {
              const isPredicted = snapshot.preds.includes(cell.index);
              const isWinning = snapshot.winningSquare === cell.index;
              return (
                <Cell
                  key={cell.index}
                  cell={{
                    ...cell,
                    percentage: winningTiles.length > 0? winningTiles[cell.index].percentage : 0
                  }}
                  status={snapshot.status}
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
        </div>
      </div>
      <div class="flex flex-col gap-8 max-w-160 lg:max-w-128 w-full mx-auto pb-4 pt-4 xl:pt-8 pb-48 md:pb-24 lg:pb-16">
        <div class="text-sm text-gray-300">Win Rate: {(snapshot.totalWin/snapshot.totalRound * 100).toFixed(2)}%</div>
        {snapshot.win > 0 ? <h2 class="text-lg font-semibold text-yellow-300">LAST: ✅ CORRECT</h2> : <h2 class="text-lg font-semibold text-yellow-300">LAST: ❌ INCORRECT</h2>}
        <div>
          <div class="text-sm text-gray-300">Total Round: {snapshot.totalWin}/{snapshot.totalRound} ({snapshot.totalRound - snapshot.totalWin})</div>
          <div class="text-sm text-gray-300">Win Rate: {(snapshot.totalWin/snapshot.totalRound * 100).toFixed(2)}%</div>
          <br/>
          <div class="text-sm text-gray-300">Win in a row: {snapshot.winInRow}</div>
          <div class="text-sm text-gray-300">Lose in a row: {snapshot.lostInRow}</div>
          <br/>
          <div class="text-sm text-gray-300">Current Win in a row: {snapshot.win}</div>
          <div class="text-sm text-gray-300">Current Lose in a row: {snapshot.lose}</div>
          <div class="mt-4">
            <div>Win in a row</div>
            {Object.keys(winInRow).map(data => (
              <div key={`win-in-row-${data}`}>
                <div class="text-sm text-red-300">Win in a row {data}: {winInRow[data]}x</div>
              </div>
            ))}
          </div>
          <div class="mt-2">
            <div>Lose in a row</div>
            {Object.keys(lostInRow).map(data => (
              <div key={`lost-in-row-${data}`}>
                <div class="text-sm text-red-300">Lose in a row {data}: {lostInRow[data]}x</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

