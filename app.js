const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socket(server);
const chess = new Chess();

let players = {
    white: null,
    black: null,
};
let currentPlayer = "w";

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("index", { title: "Chess Game" });
});

io.on("connection", (uniquesocket) => {
    console.log("New connection:", uniquesocket.id);

    // Assign roles to players or make them spectators
    if (!players.white) {
        players.white = uniquesocket.id;
        uniquesocket.emit("playerRole", "w");
        console.log("Assigned White to:", uniquesocket.id);
    } else if (!players.black) {
        players.black = uniquesocket.id;
        uniquesocket.emit("playerRole", "b");
        console.log("Assigned Black to:", uniquesocket.id);
    } else {
        uniquesocket.emit("spectatorRole");
        console.log("Assigned Spectator role to:", uniquesocket.id);
    }

    // Handle player disconnect
    uniquesocket.on("disconnect", () => {
        if (uniquesocket.id === players.white) {
            players.white = null;
            console.log("White player disconnected");
        } else if (uniquesocket.id === players.black) {
            players.black = null;
            console.log("Black player disconnected");
        }
    });

    // Handle player moves
    uniquesocket.on("move", (move) => {
        try {
            // Ensure only the correct player can make a move
            if (
                (chess.turn() === "w" && uniquesocket.id !== players.white) ||
                (chess.turn() === "b" && uniquesocket.id !== players.black)
            ) {
                uniquesocket.emit("invalidMove", "It's not your turn.");
                return;
            }

            const result = chess.move(move);
            if (result) {
                currentPlayer = chess.turn();
                io.emit("move", move);
                io.emit("boardState", chess.fen());

                // Check for game-ending conditions
                if (chess.isGameOver()) {
                    handleGameOver();
                }
            } else {
                console.log("Invalid move received:", move);
                uniquesocket.emit("invalidMove", "The move is invalid.");
            }
        } catch (err) {
            console.error("Error processing move:", err);
            uniquesocket.emit("invalidMove", "An error occurred.");
        }
    });
});

// Handle game-ending scenarios and reset the board
const handleGameOver = () => {
    let resultMessage = "";

    if (chess.isCheckmate()) { // Use isCheckmate() instead of in_checkmate()
        resultMessage = chess.turn() === 'w' ? "Black wins by checkmate!" : "White wins by checkmate!";
    } else if (chess.isStalemate()) { // isStalemate() instead of in_stalemate()
        resultMessage = "The game is a stalemate!";
    } else if (chess.isInsufficientMaterial()) { // isInsufficientMaterial() instead of insufficient_material()
        resultMessage = "The game is a draw due to insufficient material!";
    } else if (chess.isThreefoldRepetition()) { // isThreefoldRepetition() instead of in_threefold_repetition()
        resultMessage = "The game is a draw by threefold repetition!";
    } else if (chess.isDraw()) { // isDraw() instead of in_draw()
        resultMessage = "The game is a draw!";
    }

    io.emit("gameOver", resultMessage);
};


server.listen(3000, () => {
    console.log("Server is running on port 3000");
});
