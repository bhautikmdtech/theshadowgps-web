"use client";

import { useState, useEffect, FormEvent, useRef } from "react";
import { io, Socket } from "../../lib/socketClient";

export default function SocketCheckerViewer() {
  const [socketUrl, setSocketUrl] = useState<string>("http://localhost:5000");
  const [token, setToken] = useState<string>("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [requestIdent, setRequestIdent] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<string>(
    "requestLiveTripData"
  );
  const [responses, setResponses] = useState<
    Array<{ type: string; data: any }>
  >([]);
  const responseLogRef = useRef<HTMLDivElement>(null);

  // Available event types
  const eventTypes = [
    "requestLiveTripData",
    "unsubscribeLiveTripData",
    "requestNotificationCount",
    "clearNewNotificationCount",
  ];

  // Handle socket connection
  const handleConnect = (e: FormEvent) => {
    e.preventDefault();

    if (socket) {
      // Disconnect existing socket before creating a new one
      socket.disconnect();
    }

    try {
      const newSocket = io(socketUrl, {
        auth: { token },
      });

      newSocket.on("connect", () => {
        setIsConnected(true);
        setError(null);
        setResponses((prev) => [
          ...prev,
          { type: "connection", data: "Socket connected successfully" },
        ]);
      });

      newSocket.on("connect_error", (err) => {
        setError(err.message);
        setIsConnected(false);
        setResponses((prev) => [
          ...prev,
          { type: "error", data: `Connection error: ${err.message}` },
        ]);
      });

      // Generic message handler
      newSocket.onAny((event, ...args) => {
        setResponses((prev) => [...prev, { type: event, data: args[0] }]);
      });

      setSocket(newSocket);
    } catch (err: any) {
      setError(err.message);
      setResponses((prev) => [
        ...prev,
        { type: "error", data: `Error: ${err.message}` },
      ]);
    }
  };

  // Send a request through the socket
  const handleSendRequest = (e: FormEvent) => {
    e.preventDefault();

    if (!socket || !isConnected) {
      setError("Socket is not connected");
      return;
    }

    try {
      // Format the data object according to the selected event
      let data: any = {};

      if (
        selectedEvent === "requestLiveTripData" ||
        selectedEvent === "unsubscribeLiveTripData"
      ) {
        data = { ident: requestIdent };
      }

      socket.emit(selectedEvent, data);
      setResponses((prev) => [
        ...prev,
        {
          type: "sent",
          data: { event: selectedEvent, data },
        },
      ]);
    } catch (err: any) {
      setError(`Failed to send request: ${err.message}`);
    }
  };

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  // Add auto-scroll effect when responses change
  useEffect(() => {
    if (responseLogRef.current) {
      responseLogRef.current.scrollTop = responseLogRef.current.scrollHeight;
    }
  }, [responses]);

  return (
    <div className="container mx-auto p-4 max-w-6xl bg-white dark:bg-gray-800 min-h-screen dark:text-white">
      <h1 className="text-3xl font-bold mb-6 text-center">Socket Checker</h1>

      {/* Connection Form */}
      <form
        onSubmit={handleConnect}
        className="mb-6 p-6 bg-gray-100 dark:bg-gray-700 rounded-lg shadow-md"
      >
        <h2 className="text-xl font-semibold mb-4 text-center">
          Socket Connection
        </h2>
        <div className="mb-4">
          <label htmlFor="socketUrl" className="block mb-2 font-medium">
            Socket URL
          </label>
          <input
            type="text"
            id="socketUrl"
            value={socketUrl}
            onChange={(e) => setSocketUrl(e.target.value)}
            className="w-full p-3 border rounded bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500"
            placeholder="e.g. http://localhost:5000"
            required
          />
        </div>

        <div className="mb-6">
          <label htmlFor="token" className="block mb-2 font-medium">
            Auth Token
          </label>
          <input
            type="text"
            id="token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="w-full p-3 border rounded bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500"
            placeholder="Your authentication token"
          />
        </div>

        <button
          type="submit"
          className="w-full p-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-medium"
        >
          {isConnected ? "Reconnect" : "Connect"}
        </button>

        {isConnected && (
          <div className="mt-4 p-3 bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-100 rounded font-medium">
            Connected to socket ✓
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100 rounded font-medium">
            {error}
          </div>
        )}
      </form>

      {/* Request Form */}
      <form
        onSubmit={handleSendRequest}
        className={`mb-6 p-6 bg-gray-100 dark:bg-gray-700 rounded-lg shadow-md ${
          !isConnected ? "opacity-50" : ""
        }`}
      >
        <h2 className="text-xl font-semibold mb-4 text-center">Send Request</h2>

        <div className="mb-4">
          <label htmlFor="selectedEvent" className="block mb-2 font-medium">
            Event Type
          </label>
          <select
            id="selectedEvent"
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="w-full p-3 border rounded bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500"
            disabled={!isConnected}
            required
          >
            {eventTypes.map((event) => (
              <option key={event} value={event}>
                {event}
              </option>
            ))}
          </select>
        </div>

        {(selectedEvent === "requestLiveTripData" ||
          selectedEvent === "unsubscribeLiveTripData") && (
          <div className="mb-6">
            <label htmlFor="requestIdent" className="block mb-2 font-medium">
              Ident Parameter
            </label>
            <input
              type="text"
              id="requestIdent"
              value={requestIdent}
              onChange={(e) => setRequestIdent(e.target.value)}
              className="w-full p-3 border rounded bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500"
              placeholder="e.g. 123456"
              disabled={!isConnected}
              required
            />
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Will be sent as:{" "}
              {'{ ident: "' + (requestIdent || "value") + '" }'}
            </p>
          </div>
        )}

        <button
          type="submit"
          className="w-full p-3 bg-green-600 text-white rounded hover:bg-green-700 transition font-medium"
          disabled={!isConnected}
        >
          Send Request
        </button>
      </form>

      {/* Response Log */}
      <div className="p-6 bg-gray-100 dark:bg-gray-700 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-center">Response Log</h2>
        <div
          ref={responseLogRef}
          className="max-h-96 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded p-4 bg-black text-green-400 font-mono"
        >
          {responses.length === 0 ? (
            <p className="text-gray-500">No messages yet</p>
          ) : (
            responses.map((response, index) => (
              <div key={index} className="mb-3 pb-2 border-b border-gray-800">
                <div className="font-bold text-blue-400">[{response.type}]</div>
                <div className="pl-4 mt-1 whitespace-pre-wrap break-words">
                  {typeof response.data === "object"
                    ? JSON.stringify(response.data, null, 2)
                    : response.data}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
