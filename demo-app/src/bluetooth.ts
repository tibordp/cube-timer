import React from "react";

const CUBE_TIME_UUID = "eb0e77c3-af14-4b7f-ac80-d3631dc386ac";
const CHARACTERISTIC_UUID = "eb0e77c3-af14-4b7f-ac80-d3631dc386ad";

export interface TimerState {
  state: number;
  epoch: number;
  duration: number;
}

export enum ConnectionState {
  NOT_CONNECTED,
  CONNECTING,
  CONNECTED,
  FAILED,
}

export interface UseBluetoothResult {
  connect(): void;
  disconnect(): void;
  connectionState: ConnectionState;
  timerState: TimerState;
}

export function useBluetooth(): UseBluetoothResult {
  const [connectionState, setConnectionState] = React.useState<ConnectionState>(
    ConnectionState.NOT_CONNECTED
  );
  const [device, setDevice] = React.useState<BluetoothDevice | null>(null);
  const [timerState, setTimerState] = React.useState<TimerState>({
    state: 0,
    epoch: 0,
    duration: 0,
  });

  const connect = React.useCallback(async () => {
    setConnectionState(ConnectionState.CONNECTING);
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [CUBE_TIME_UUID] }],
      });
      setDevice(device);
    } catch (e) {
      // User has likely canceled the dialog, or didn't find
      // the device, so we don't treat this as error.
      setConnectionState(ConnectionState.NOT_CONNECTED);
    }
  }, []);

  const connectGatt = React.useCallback(async () => {
    try {
      setConnectionState(ConnectionState.CONNECTING);
      await device!.gatt?.connect();
      const service = await device!.gatt?.getPrimaryService(CUBE_TIME_UUID);
      const characteristic = await service?.getCharacteristic(
        CHARACTERISTIC_UUID
      );
      characteristic!.oncharacteristicvaluechanged = () => {
        const state = characteristic!.value!.getUint32(0, true);
        const epoch = characteristic!.value!.getUint32(4, true);
        const duration =
          characteristic!.value!.byteLength > 4
            ? characteristic!.value!.getInt32(8, true)
            : 0;

        setTimerState({ state, epoch, duration });
      };
      await characteristic?.readValue();
      characteristic?.startNotifications();
      setConnectionState(ConnectionState.CONNECTED);
    } catch (e) {
      console.error(e);
      setConnectionState(ConnectionState.FAILED);
    }
  }, [device]);

  const disconnect = async () => {
    setDevice(null);
  };

  React.useEffect(() => {
    if (!device) {
      setConnectionState(ConnectionState.NOT_CONNECTED);
      return () => {};
    }

    connectGatt().then(() =>
      device.addEventListener("gattserverdisconnected", connectGatt)
    );

    return () => {
      device.removeEventListener("gattserverdisconnected", connectGatt);
      device.gatt?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectGatt]);

  return {
    connect,
    disconnect,
    connectionState,
    timerState,
  };
}
