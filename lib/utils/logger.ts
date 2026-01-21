type LogPayload = {
  message: string;
  data?: Record<string, unknown>;
};

function format(payload: LogPayload) {
  return JSON.stringify({
    message: payload.message,
    data: payload.data || {},
    timestamp: new Date().toISOString()
  });
}

export const logger = {
  info(payload: LogPayload) {
    console.info(format(payload));
  },
  warn(payload: LogPayload) {
    console.warn(format(payload));
  },
  error(payload: LogPayload) {
    console.error(format(payload));
  }
};
