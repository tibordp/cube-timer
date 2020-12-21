import Button from "@material-ui/core/Button/Button";
import React from "react";
import "./App.css";
import { ConnectionState, TimerState, useBluetooth } from "./bluetooth";
import { useWakeLock } from "./wakeLock";
import { useHistory } from "./history";

import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import ListItemText from "@material-ui/core/ListItemText";
import IconButton from "@material-ui/core/IconButton";
import DeleteIcon from "@material-ui/icons/Delete";
import BluetoothIcon from "@material-ui/icons/Bluetooth";
import BluetoothDisabledIcon from "@material-ui/icons/BluetoothDisabled";
import Card from "@material-ui/core/Card/Card";

export function formatDuration(milliseconds: number): string {
  if (milliseconds === -1) {
    return "DNF";
  }
  return new Date(Math.max(0, milliseconds))
    .toISOString()
    .substr(14, 9)
    .replace(/^[0:]+(?!\.)/, "");
}

/**
 * While the timer is running, the device does not send anything via Bluetooth,
 * so we fake the running time display locally. Once the timer is stopped, the
 * correct time from the device will be displayed.
 */
function FakeRunTime() {
  const [count, setCount] = React.useState(0);

  const rafRef = React.useRef<number>();
  const previousTimeRef = React.useRef<number>();

  const animate = (time: number) => {
    if (previousTimeRef.current !== undefined) {
      const deltaTime = time - previousTimeRef.current;
      setCount((prevCount) => prevCount + deltaTime);
    }
    previousTimeRef.current = time;
    rafRef.current = requestAnimationFrame(animate);
  };

  React.useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current!);
  }, []);

  return <span className="running">{formatDuration(count)}</span>;
}

interface CubeDisplayProps {
  timerState: TimerState;
}

function CubeDisplay({ timerState }: CubeDisplayProps) {
  const { state, duration } = timerState;
  const isRunning = state >= 20 && state < 30;
  const isInspection = state >= 10 && state < 20;
  const isDefaultState = !isRunning && !isInspection;

  return (
    <>
      {isDefaultState && duration !== 0 && <>{formatDuration(duration)}</>}
      {isDefaultState && duration === 0 && <>Ready!</>}
      {isRunning && <FakeRunTime />}
      {isInspection && <span className="inspection">Inspection</span>}
    </>
  );
}

function App() {
  const { connect, disconnect, connectionState, timerState } = useBluetooth();
  const [{ orderedHistory, best, avg5, avg12 }, dispatch] = useHistory(timerState);
  
  useWakeLock(
    connectionState === ConnectionState.CONNECTED ||
      connectionState === ConnectionState.CONNECTING
  );

  return (
    <>
      <div className="statusDisplay">
        {connectionState === ConnectionState.CONNECTED && (
          <CubeDisplay timerState={timerState} />
        )}
      </div>
      <Card className="card">
        <List className="stats">
          <ListItem dense>
            <ListItemText
              primary="Best"
              secondary={best !== undefined ? formatDuration(best) : "-"}
            />
          </ListItem>
          <ListItem dense>
            <ListItemText
              primary="Avg 5"
              secondary={avg5 !== undefined ? formatDuration(avg5) : "-"}
            />
          </ListItem>
          <ListItem dense>
            <ListItemText
              primary="Avg 12"
              secondary={avg12 !== undefined ? formatDuration(avg12) : "-"}
            />
          </ListItem>
        </List>

        <List className="results">
          {orderedHistory.map(([epoch, value]) => {
            const labelId = `list-label-${epoch}`;

            return (
              <ListItem key={epoch} role={undefined} dense>
                <ListItemText id={labelId} primary={formatDuration(value)} />
                <ListItemSecondaryAction>
                  <IconButton edge="end" aria-label="comments">
                    <DeleteIcon
                      onClick={() => dispatch({ action: "delete", epoch })}
                    />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            );
          })}
          <ListItem
            role={undefined}
            dense
            disabled={orderedHistory.length === 0}
            onClick={() => dispatch({ action: "clear" })}
            button
          >
            <ListItemText primary="Clear history" />
          </ListItem>
        </List>
      </Card>
      {connectionState === ConnectionState.FAILED && (
        <>
          <Button startIcon={<BluetoothIcon />} onClick={connect}>
            Connect
          </Button>
        </>
      )}
      {connectionState === ConnectionState.NOT_CONNECTED && (
        <>
          <Button
            startIcon={<BluetoothIcon />}
            variant="contained"
            color="primary"
            onClick={connect}
          >
            Connect
          </Button>
        </>
      )}
      {connectionState === ConnectionState.CONNECTING && (
        <>
          <Button
            startIcon={<BluetoothIcon />}
            variant="contained"
            disabled
            color="primary"
            onClick={connect}
          >
            Connecting...
          </Button>
        </>
      )}
      {connectionState === ConnectionState.CONNECTED && (
        <Button
          startIcon={<BluetoothDisabledIcon />}
          variant="contained"
          color="default"
          onClick={disconnect}
        >
          Disconnect
        </Button>
      )}
    </>
  );
}

export default App;
