const WebSocket = require("ws");
const readline = require("readline");

function askHidden(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    rl.stdoutMuted = true;
    rl._writeToOutput = function _writeToOutput(stringToWrite) {
      if (rl.stdoutMuted) rl.output.write("*");
      else rl.output.write(stringToWrite);
    };

    rl.question(query, (answer) => {
      rl.close();
      console.log();
      resolve(answer);
    });
  });
}

function ask(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  console.warn(
    "WARNING: Temporary registration. If you forget your password, recovery may be impossible (for now)."
  );

  const username = (await ask("username: ")).trim();
  const password = await askHidden("password (min 8 chars): ");

  const ws = new WebSocket("ws://localhost:8080");

  ws.on("open", () => {
    ws.send(JSON.stringify({ type: "REGISTER_REQUEST", username, password }));
  });

  ws.on("message", (data) => {
    const raw = data.toString();
    try {
      const msg = JSON.parse(raw);
      if (msg.type === "REGISTER_OK") {
        console.log(`Registered. userId=${msg.userId}`);
      } else if (msg.type === "REGISTER_ERROR" || msg.type === "ERROR") {
        console.log(`${msg.message}`);
      } else {
        console.log(raw);
      }
    } catch {
      console.log(raw);
    } finally {
      ws.close();
    }
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err.message);
    process.exit(1);
  });
}

main();