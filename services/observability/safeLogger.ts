type LogLevel = "info" | "warn" | "error";

type LogPayload = Record<string, unknown>;

function serialize(payload: LogPayload | undefined) {
  if (!payload) {
    return {};
  }

  return JSON.parse(
    JSON.stringify(payload, (_key, value) => {
      if (typeof value === "string" && value.length > 180) {
        return {
          redacted: true,
          charCount: value.length,
        };
      }

      return value;
    })
  );
}

export function createSafeLogger(scope: string) {
  const log = (level: LogLevel, event: string, payload?: LogPayload) => {
    const message = {
      timestamp: new Date().toISOString(),
      level,
      scope,
      event,
      payload: serialize(payload),
    };

    const formattedMessage = JSON.stringify(message);

    if (level === "error") {
      console.error(formattedMessage);
      return;
    }

    if (level === "warn") {
      console.warn(formattedMessage);
      return;
    }

    console.log(formattedMessage);
  };

  return {
    info: (event: string, payload?: LogPayload) => log("info", event, payload),
    warn: (event: string, payload?: LogPayload) => log("warn", event, payload),
    error: (event: string, payload?: LogPayload) =>
      log("error", event, payload),
  };
}
